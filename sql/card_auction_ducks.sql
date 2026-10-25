begin;
alter table public.card_auction_registrations add column ducks integer not null default 1 check (ducks >= 1);
create or replace function public.get_public_card_auctions()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls') order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'card_id', r.card_id, 'ducks', r.ducks) order by r.created_at)
      from public.card_auction_registrations r), '[]'::jsonb)
  );
$$;

create or replace function public.register_public_card_auction(p_member_id text, p_card_ids text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  player_name text;
  inserted_count integer;
  card_key text;
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
  -- Serialize registrations and removals for each card in a consistent order.
  for card_key in select distinct c from unnest(p_card_ids) c order by c loop
    perform pg_catalog.pg_advisory_xact_lock(728541, pg_catalog.hashtext(card_key));
  end loop;
  insert into public.card_auction_registrations(member_id,member_name,card_id)
    select p_member_id,player_name,c from (select distinct unnest(p_card_ids) c) cards
    on conflict(member_id,card_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.remove_card_auction_registration(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare card_key text;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role = 'admin') then
    raise exception 'Auction admin access is required.' using errcode='42501';
  end if;
  select card_id into card_key from public.card_auction_registrations where id=p_id;
  if card_key is null then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(728541, pg_catalog.hashtext(card_key));
  delete from public.card_auction_registrations where id=p_id;
  -- A repeated removal must not award ducks a second time.
  if found then
    update public.card_auction_registrations set ducks=ducks+1 where card_id=card_key;
  end if;
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
