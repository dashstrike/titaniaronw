-- Titania Accessory Auction. Run in the existing Supabase project's SQL editor.
-- Public registration follows the existing Guild Runs IGN-selection model.
begin;

create table public.accessory_auction_registrations (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  member_name text not null,
  accessory_id text not null check (accessory_id in ('56009017','56009018','56009019','56009020','56009021','56009022','56009023','56009024','56009025','56009026','56009027','56009028','56009029','56009030')),
  ducks integer not null default 1 check (ducks >= 1),
  created_at timestamptz not null default now(),
  unique(member_id, accessory_id)
);
alter table public.accessory_auction_registrations enable row level security;
-- Access is through the narrowly scoped functions below, not direct table writes.
revoke all on public.accessory_auction_registrations from anon, authenticated;

create function public.get_public_accessory_auctions()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls') order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'accessory_id', r.accessory_id, 'ducks', r.ducks) order by r.created_at)
      from public.accessory_auction_registrations r), '[]'::jsonb)
  );
$$;

create function public.register_public_accessory_auction(p_member_id text, p_accessory_ids text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  player_name text;
  inserted_count integer;
  accessory_key text;
begin
  if p_accessory_ids is null or cardinality(p_accessory_ids) not between 1 and 14
    or exists(select 1 from unnest(p_accessory_ids) c where c is null or c not in ('56009017','56009018','56009019','56009020','56009021','56009022','56009023','56009024','56009025','56009026','56009027','56009028','56009029','56009030')) then
    raise exception 'Select valid auction accessories.';
  end if;
  select m->>'name' into player_name
    from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
    where p.id=1 and m->>'id'=p_member_id and nullif(m->>'name','') is not null
      and lower(coalesce(m->>'status','active')) <> 'inactive' limit 1;
  if player_name is null then raise exception 'Select a player from the active Titania roster.'; end if;
  -- Serialize registrations and removals for each accessory in a consistent order.
  for accessory_key in select distinct c from unnest(p_accessory_ids) c order by c loop
    perform pg_catalog.pg_advisory_xact_lock(728542, pg_catalog.hashtext(accessory_key));
  end loop;
  insert into public.accessory_auction_registrations(member_id,member_name,accessory_id)
    select p_member_id,player_name,c from (select distinct unnest(p_accessory_ids) c) accessories
    on conflict(member_id,accessory_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create function public.remove_accessory_auction_registration(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare accessory_key text;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role = 'admin') then
    raise exception 'Auction admin access is required.' using errcode='42501';
  end if;
  select accessory_id into accessory_key from public.accessory_auction_registrations where id=p_id;
  if accessory_key is null then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(728542, pg_catalog.hashtext(accessory_key));
  delete from public.accessory_auction_registrations where id=p_id;
  -- A repeated removal must not award ducks a second time.
  if found then
    update public.accessory_auction_registrations set ducks=ducks+1 where accessory_id=accessory_key;
  end if;
end;
$$;

revoke all on function public.get_public_accessory_auctions() from public, anon, authenticated;
revoke all on function public.register_public_accessory_auction(text,text[]) from public, anon, authenticated;
revoke all on function public.remove_accessory_auction_registration(uuid) from public, anon, authenticated;
grant execute on function public.get_public_accessory_auctions() to anon, authenticated;
grant execute on function public.register_public_accessory_auction(text,text[]) to anon, authenticated;
grant execute on function public.remove_accessory_auction_registration(uuid) to authenticated;

create table public.accessory_auction_history (
  registration_id uuid primary key,
  member_id text not null,
  accessory_id text not null,
  ducks integer not null check (ducks >= 1),
  registered_at timestamptz not null,
  received_at timestamptz not null default now(),
  received_by uuid not null references auth.users(id)
);
create index accessory_auction_history_member_idx on public.accessory_auction_history(member_id, received_at desc);
alter table public.accessory_auction_history enable row level security;
revoke all on public.accessory_auction_history from anon,authenticated;

create or replace function public.remove_accessory_auction_registration(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  accessory_key text;
  registration public.accessory_auction_registrations%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role='admin') then
    raise exception 'Auction admin access is required.' using errcode='42501';
  end if;
  select accessory_id into accessory_key from public.accessory_auction_registrations where id=p_id;
  if accessory_key is null then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(728542,pg_catalog.hashtext(accessory_key));
  delete from public.accessory_auction_registrations where id=p_id returning * into registration;
  if found then
    insert into public.accessory_auction_history(registration_id,member_id,accessory_id,ducks,registered_at,received_by)
      values(registration.id,registration.member_id,registration.accessory_id,registration.ducks,registration.created_at,auth.uid());
    update public.accessory_auction_registrations set ducks=ducks+1 where accessory_id=accessory_key;
  end if;
end;
$$;

create function public.get_member_accessory_history(p_member_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved) then
    raise exception 'Approved Titania access is required.' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(h) order by coalesce(h.received_at,h.registered_at) desc) from (
    select id as registration_id,accessory_id,ducks,created_at as registered_at,null::timestamptz as received_at,'registered'::text as status
      from public.accessory_auction_registrations where member_id=p_member_id
    union all
    select registration_id,accessory_id,ducks,registered_at,received_at,'received'::text
      from public.accessory_auction_history where member_id=p_member_id
  ) h),'[]'::jsonb);
end;
$$;
revoke all on function public.get_member_accessory_history(text) from public,anon,authenticated;
grant execute on function public.get_member_accessory_history(text) to authenticated;
revoke all on function public.remove_accessory_auction_registration(uuid) from public,anon,authenticated;
grant execute on function public.remove_accessory_auction_registration(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
