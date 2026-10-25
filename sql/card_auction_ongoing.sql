-- Convert auction sessions to ongoing card registration.
begin;
lock table public.card_auction_registrations in access exclusive mode;
do $$ begin
  if exists(select 1 from public.card_auction_registrations group by member_id,card_id having count(*) > 1) then
    raise exception 'Duplicate player/card registrations require review before conversion.';
  end if;
end $$;
drop function public.register_public_card_auction(uuid,text,text[]);
drop function public.manage_card_auction(text,uuid,text,date);
alter table public.card_auction_registrations drop column event_id;
alter table public.card_auction_registrations add constraint card_auction_member_card_unique unique(member_id,card_id);
-- Retain old event records, but remove them from the registration flow.
revoke all on public.card_auction_events from anon,authenticated;
create or replace function public.get_public_card_auctions()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls') order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'card_id', r.card_id) order by r.created_at)
      from public.card_auction_registrations r), '[]'::jsonb)
  );
$$;

create or replace function public.register_public_card_auction(p_member_id text, p_card_ids text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  player_name text;
  inserted_count integer;
begin
  if p_card_ids is null or cardinality(p_card_ids) not between 1 and 8
    or exists(select 1 from unnest(p_card_ids) c where c is null or c not in ('fh','sryx','tsbl','srqz','esls','pln','dglnj','gblsl')) then
    raise exception 'Select valid auction cards.';
  end if;
  select m->>'name' into player_name
    from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
    where p.id=1 and m->>'id'=p_member_id and nullif(m->>'name','') is not null
      and lower(coalesce(m->>'status','active')) <> 'inactive' limit 1;
  if player_name is null then raise exception 'Select a player from the active Titania roster.'; end if;
  insert into public.card_auction_registrations(member_id,member_name,card_id)
    select p_member_id,player_name,c from (select distinct unnest(p_card_ids) c) cards
    on conflict(member_id,card_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.remove_card_auction_registration(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role = 'admin') then
    raise exception 'Auction admin access is required.' using errcode='42501';
  end if;
  delete from public.card_auction_registrations where id=p_id;
end;
$$;

revoke all on function public.get_public_card_auctions() from public, anon, authenticated;
revoke all on function public.register_public_card_auction(text,text[]) from public, anon, authenticated;
revoke all on function public.remove_card_auction_registration(uuid) from public, anon, authenticated;
grant execute on function public.get_public_card_auctions() to anon, authenticated;
grant execute on function public.register_public_card_auction(text,text[]) to anon, authenticated;
grant execute on function public.remove_card_auction_registration(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
