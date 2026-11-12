-- Remove pending auction entries when a saved member becomes inactive.
-- Keep receipts; do not award ducks or restore entries on reactivation.
begin;
lock table public.planner_state in share row exclusive mode;
select pg_advisory_xact_lock(778811,1);

create or replace function private.cleanup_inactive_auction_registrations(p_roster jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare inactive_ids text[]; removed integer:=0; affected integer;
begin
  perform pg_advisory_xact_lock(778811,1);
  select coalesce(array_agg(m->>'id'),array[]::text[]) into inactive_ids
  from jsonb_array_elements(coalesce(p_roster,'[]'::jsonb)) m
  where lower(coalesce(m->>'status','active'))='inactive' and nullif(m->>'id','') is not null;
  if cardinality(inactive_ids)=0 then return 0; end if;
  delete from public.card_auction_registrations where member_id=any(inactive_ids);
  get diagnostics affected=row_count; removed:=removed+affected;
  delete from public.accessory_auction_registrations where member_id=any(inactive_ids);
  get diagnostics affected=row_count; removed:=removed+affected;
  delete from public.relic_auction_registrations where member_id=any(inactive_ids);
  get diagnostics affected=row_count; removed:=removed+affected;
  if removed>0 then update public.auction_control set revision=revision+1 where id=1; end if;
  return removed;
end; $$;

create or replace function private.remove_inactive_auction_members()
returns trigger language plpgsql security definer set search_path='' as $$
declare removed integer; newly_inactive boolean;
begin
  if new.id<>1 then return new; end if;
  perform pg_advisory_xact_lock(778811,1);
  removed:=private.cleanup_inactive_auction_registrations(new.state->'roster');
  select exists(
    select 1 from jsonb_array_elements(coalesce(new.state->'roster','[]'::jsonb)) m
    where lower(coalesce(m->>'status','active'))='inactive' and nullif(m->>'id','') is not null
      and not exists(select 1 from jsonb_array_elements(coalesce(old.state->'roster','[]'::jsonb)) previous
        where previous->>'id'=m->>'id' and lower(coalesce(previous->>'status','active'))='inactive')
  ) into newly_inactive;
  -- A withdrawn member may have no entries left, but an old undo snapshot
  -- could still contain them. Invalidate that snapshot on status changes too.
  if removed=0 and newly_inactive then
    update public.auction_control set revision=revision+1 where id=1;
  end if;
  return new;
end; $$;

create or replace function private.reject_inactive_auction_registration()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(778811,1);
  if exists(select 1 from public.planner_state p
    cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
    where p.id=1 and m->>'id'=new.member_id and lower(coalesce(m->>'status','active'))='inactive') then
    raise exception 'Inactive members cannot register for auctions.' using errcode='23514';
  end if;
  return new;
end; $$;

revoke all on function private.cleanup_inactive_auction_registrations(jsonb),private.remove_inactive_auction_members(),private.reject_inactive_auction_registration() from public,anon,authenticated;

create trigger planner_state_remove_inactive_auction_members
after update of state on public.planner_state
for each row execute function private.remove_inactive_auction_members();
create trigger card_auction_reject_inactive_member
before insert or update of member_id on public.card_auction_registrations
for each row execute function private.reject_inactive_auction_registration();
create trigger accessory_auction_reject_inactive_member
before insert or update of member_id on public.accessory_auction_registrations
for each row execute function private.reject_inactive_auction_registration();
create trigger relic_auction_reject_inactive_member
before insert or update of member_id on public.relic_auction_registrations
for each row execute function private.reject_inactive_auction_registration();

select private.cleanup_inactive_auction_registrations(state->'roster') from public.planner_state where id=1;
-- Invalidate pre-upgrade snapshots even when an inactive member already withdrew.
update public.auction_control set revision=revision+1 where id=1;
notify pgrst,'reload schema';
commit;
