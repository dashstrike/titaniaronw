-- Requires the existing planner_state and party_templates tables.
-- Removes only members explicitly marked inactive, retaining the order of others.
begin;
create schema if not exists private;

create or replace function private.remove_inactive_party_members()
returns trigger language plpgsql security definer set search_path = '' as $$
declare inactive text[];
begin
  select coalesce(array_agg(m->>'id'),array[]::text[]) into inactive
  from jsonb_array_elements(coalesce(new.state->'roster','[]'::jsonb)) m
  where m->>'status'='inactive' and nullif(m->>'id','') is not null;
  if cardinality(inactive)=0 then return new; end if;
  update public.party_templates p
  set member_ids=array(
    select id from unnest(p.member_ids) with ordinality as members(id,position)
    where not (id=any(inactive)) order by position
  ),updated_at=clock_timestamp()
  where p.member_ids && inactive;
  return new;
end;
$$;
revoke all on function private.remove_inactive_party_members() from public,anon,authenticated;

drop trigger if exists planner_state_remove_inactive_party_members on public.planner_state;
create trigger planner_state_remove_inactive_party_members
after update of state on public.planner_state
for each row when (new.id=1 and old.state->'roster' is distinct from new.state->'roster')
execute function private.remove_inactive_party_members();

-- Reject stale browser assignments by stripping inactive IDs on every party save.
create or replace function private.filter_inactive_party_members()
returns trigger language plpgsql security definer set search_path = '' as $$
declare inactive text[];
begin
  select coalesce(array_agg(m->>'id'),array[]::text[]) into inactive
  from public.planner_state p
  cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
  where p.id=1 and m->>'status'='inactive' and nullif(m->>'id','') is not null;
  new.member_ids:=array(
    select id from unnest(new.member_ids) with ordinality as members(id,position)
    where not (id=any(inactive)) order by position
  );
  return new;
end;
$$;
revoke all on function private.filter_inactive_party_members() from public,anon,authenticated;
drop trigger if exists party_templates_filter_inactive_members on public.party_templates;
create trigger party_templates_filter_inactive_members
before insert or update of member_ids on public.party_templates
for each row execute function private.filter_inactive_party_members();

-- Clean already-saved inactive assignments without changing any roster records.
with inactive as (
  select coalesce(array_agg(m->>'id'),array[]::text[]) as ids
  from public.planner_state p
  cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
  where p.id=1 and m->>'status'='inactive' and nullif(m->>'id','') is not null
)
update public.party_templates p
set member_ids=array(
  select id from unnest(p.member_ids) with ordinality as members(id,position)
  where not (id=any(inactive.ids)) order by position
),updated_at=clock_timestamp()
from inactive where p.member_ids && inactive.ids;
commit;

