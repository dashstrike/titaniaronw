-- Relic auction upgrade. Requires the existing Card/Accessory workflow.
-- Existing registrations, receipts and action history are retained.
begin;
create table public.relic_auction_registrations (
  id uuid primary key default gen_random_uuid(),
  member_id text not null, member_name text not null,
  relic_id text not null check(relic_id in ('str','agi','vit','dex','int','luk')),
  ducks integer not null default 1 check(ducks>=0),
  created_at timestamptz not null default now(),
  next_bidder boolean not null default false,
  unique(member_id,relic_id)
);
create unique index relic_one_next_bidder on public.relic_auction_registrations(relic_id) where next_bidder;
create table public.relic_auction_history (
  registration_id uuid primary key, member_id text not null,
  relic_id text not null check(relic_id in ('str','agi','vit','dex','int','luk')),
  ducks integer not null check(ducks>=0), registered_at timestamptz not null,
  received_at timestamptz not null default now(), received_by uuid not null references auth.users(id)
);
create index relic_auction_history_member_idx on public.relic_auction_history(member_id,received_at desc);
create index relic_auction_history_item_idx on public.relic_auction_history(relic_id,received_at desc);
alter table public.relic_auction_registrations enable row level security;
alter table public.relic_auction_history enable row level security;
revoke all on public.relic_auction_registrations,public.relic_auction_history from public,anon,authenticated;

create function public.register_public_relic_auction(p_member_id text,p_relic_ids text[])
returns integer language plpgsql security definer set search_path='' as $$
declare player_name text; inserted_count integer;
begin
  perform pg_advisory_xact_lock(778811,1);
  if p_relic_ids is null or cardinality(p_relic_ids) not between 1 and 6
    or exists(select 1 from unnest(p_relic_ids) s where s is null or s not in ('str','agi','vit','dex','int','luk')) then
    raise exception 'Select valid auction relic stats.';
  end if;
  if exists(select 1 from public.auction_bans where member_id=p_member_id and expires_at>clock_timestamp()) then
    raise exception 'This player is banned from all auction registrations.';
  end if;
  select m->>'name' into player_name from public.planner_state p
    cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
    where p.id=1 and m->>'id'=p_member_id and nullif(m->>'name','') is not null
      and lower(coalesce(m->>'status','active'))<>'inactive' limit 1;
  if player_name is null then raise exception 'Select a player from the active Titania roster.'; end if;
  insert into public.relic_auction_registrations(member_id,member_name,relic_id)
    select p_member_id,player_name,s from (select distinct unnest(p_relic_ids) s) stats
    on conflict(member_id,relic_id) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count>0 then update public.auction_control set revision=revision+1 where id=1; end if;
  return inserted_count;
end; $$;


create or replace function public.get_public_relic_auctions()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls') order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'relic_id', r.relic_id, 'ducks', r.ducks, 'created_at', r.created_at) order by r.created_at)
      from public.relic_auction_registrations r), '[]'::jsonb),
    'last_received', coalesce((select jsonb_object_agg(h.relic_id,h.received_at)
      from (select relic_id,max(received_at) as received_at from public.relic_auction_history group by relic_id) h), '{}'::jsonb)
  );
$$;


create function public.get_member_relic_history(p_member_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved) then
    raise exception 'Approved Titania access is required.' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(h) order by coalesce(h.received_at,h.registered_at) desc) from (
    select id as registration_id,relic_id,ducks,created_at as registered_at,null::timestamptz as received_at,'registered'::text as status
      from public.relic_auction_registrations where member_id=p_member_id
    union all
    select registration_id,relic_id,ducks,registered_at,received_at,'received'::text
      from public.relic_auction_history where member_id=p_member_id
  ) h),'[]'::jsonb);
end;
$$;


create or replace function private.auction_snapshot(p_category text,p_item text,p_member text)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object(
    'cards',coalesce((select jsonb_agg(to_jsonb(r)) from public.card_auction_registrations r where (p_category='card' and card_id=p_item) or (p_category='ban' and member_id=p_member)),'[]'),
    'accessories',coalesce((select jsonb_agg(to_jsonb(r)) from public.accessory_auction_registrations r where (p_category='accessory' and accessory_id=p_item) or (p_category='ban' and member_id=p_member)),'[]'),
    'card_history',coalesce((select jsonb_agg(to_jsonb(r)) from public.card_auction_history r where p_category='card' and card_id=p_item),'[]'),
    'accessory_history',coalesce((select jsonb_agg(to_jsonb(r)) from public.accessory_auction_history r where p_category='accessory' and accessory_id=p_item),'[]'),
    'relics',coalesce((select jsonb_agg(to_jsonb(r)) from public.relic_auction_registrations r where (p_category='relic' and relic_id=p_item) or (p_category='ban' and member_id=p_member)),'[]'),
    'relic_history',coalesce((select jsonb_agg(to_jsonb(r)) from public.relic_auction_history r where p_category='relic' and relic_id=p_item),'[]'),
    'bans',coalesce((select jsonb_agg(to_jsonb(r)) from public.auction_bans r where p_category='ban' and member_id=p_member),'[]')
  );
$$;

create or replace function public.get_public_auction_workflow(p_category text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;
begin
  if p_category='card' then
    payload:=public.get_public_card_auctions();
    payload:=payload||jsonb_build_object('registrations',coalesce((select jsonb_agg(to_jsonb(r) order by created_at) from public.card_auction_registrations r),'[]'));
  elsif p_category='accessory' then
    payload:=public.get_public_accessory_auctions();
    payload:=payload||jsonb_build_object('registrations',coalesce((select jsonb_agg(to_jsonb(r) order by created_at) from public.accessory_auction_registrations r),'[]'));
  elsif p_category='relic' then
    payload:=public.get_public_relic_auctions();
    payload:=payload||jsonb_build_object('registrations',coalesce((select jsonb_agg(to_jsonb(r) order by created_at) from public.relic_auction_registrations r),'[]'));
  else raise exception 'Invalid auction category.';
  end if;
  return payload||jsonb_build_object('revision',(select revision from public.auction_control where id=1),
    'server_time',now(),
    'bans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'member_id',member_id,'member_name',member_name,'category',category,'banned_at',banned_at,'expires_at',expires_at,'active',expires_at>now()) order by banned_at desc) from public.auction_bans),'[]'));
end; $$;

drop function if exists public.auction_admin_action(text,text,uuid,timestamptz,bigint,uuid);

create or replace function public.auction_admin_action(p_kind text,p_category text,p_registration uuid,p_revision bigint,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare r jsonb; item_key text; snapshot jsonb; rev bigint; next_id uuid; outcome_time timestamptz;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role='admin') then
    raise exception 'Auction admin access is required.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(778811,1);
  if p_request is null then raise exception 'Missing request ID.'; end if;
  if exists(select 1 from public.auction_actions where id=p_request) then return p_request; end if;
  select revision into rev from public.auction_control where id=1;
  if p_revision is distinct from rev then raise exception 'The auction list changed. Refresh and review it before trying again.'; end if;
  if p_kind is null or p_kind not in ('carry_forward','outbid_again','received','clear_next','withdraw','add_duck','remove_duck') then raise exception 'Invalid auction action.'; end if;
  if p_category='card' then
    select to_jsonb(x) into r from public.card_auction_registrations x where id=p_registration;
    item_key:=r->>'card_id';
    select id into next_id from public.card_auction_registrations where card_id=item_key and next_bidder;
  elsif p_category='accessory' then
    select to_jsonb(x) into r from public.accessory_auction_registrations x where id=p_registration;
    item_key:=r->>'accessory_id';
    select id into next_id from public.accessory_auction_registrations where accessory_id=item_key and next_bidder;
  elsif p_category='relic' then
    select to_jsonb(x) into r from public.relic_auction_registrations x where id=p_registration;
    item_key:=r->>'relic_id';
    select id into next_id from public.relic_auction_registrations where relic_id=item_key and next_bidder;
  else raise exception 'Invalid auction category.';
  end if;
  if r is null then raise exception 'This registration no longer exists.'; end if;
  if p_kind='carry_forward' and next_id is not null then raise exception 'This item already has a next bidder.'; end if;
  if p_kind in ('outbid_again','clear_next') and next_id is distinct from p_registration then raise exception 'Select the current next bidder.'; end if;
  if p_kind='received' and next_id is not null and next_id<>p_registration then raise exception 'The next bidder has priority for this item. Clear that status first if necessary.'; end if;
  if p_kind in ('add_duck','remove_duck') and next_id=p_registration then raise exception 'Clear NEXT BIDDER before changing this player''s ducks.'; end if;
  if p_kind='remove_duck' and (r->>'ducks')::integer<1 then raise exception 'This player has no ducks left to remove.'; end if;
  if p_kind='carry_forward' and (r->>'ducks')::integer<1 then raise exception 'A player with no ducks cannot be carried forward.'; end if;
  if p_kind in ('carry_forward','outbid_again','received') then
    outcome_time:=clock_timestamp();
  end if;
  snapshot:=private.auction_snapshot(p_category,item_key,r->>'member_id');
  if p_category='card' then
    if p_kind='received' then
      insert into public.card_auction_history(registration_id,member_id,card_id,ducks,registered_at,received_by)
      values(p_registration,r->>'member_id',item_key,(r->>'ducks')::integer,(r->>'created_at')::timestamptz,auth.uid());
    end if;
    if p_kind in ('received','withdraw') then delete from public.card_auction_registrations where id=p_registration;
    elsif p_kind='add_duck' then update public.card_auction_registrations set ducks=ducks+1 where id=p_registration;
    elsif p_kind='remove_duck' then update public.card_auction_registrations set ducks=ducks-1 where id=p_registration;
    else update public.card_auction_registrations set next_bidder=(p_kind<>'clear_next') where id=p_registration; end if;
    if p_kind in ('carry_forward','outbid_again','received') then update public.card_auction_registrations set ducks=ducks+1 where card_id=item_key and id<>p_registration; end if;
  elsif p_category='accessory' then
    if p_kind='received' then
      insert into public.accessory_auction_history(registration_id,member_id,accessory_id,ducks,registered_at,received_by)
      values(p_registration,r->>'member_id',item_key,(r->>'ducks')::integer,(r->>'created_at')::timestamptz,auth.uid());
    end if;
    if p_kind in ('received','withdraw') then delete from public.accessory_auction_registrations where id=p_registration;
    elsif p_kind='add_duck' then update public.accessory_auction_registrations set ducks=ducks+1 where id=p_registration;
    elsif p_kind='remove_duck' then update public.accessory_auction_registrations set ducks=ducks-1 where id=p_registration;
    else update public.accessory_auction_registrations set next_bidder=(p_kind<>'clear_next') where id=p_registration; end if;
    if p_kind in ('carry_forward','outbid_again','received') then update public.accessory_auction_registrations set ducks=ducks+1 where accessory_id=item_key and id<>p_registration; end if;
  else
    if p_kind='received' then
      insert into public.relic_auction_history(registration_id,member_id,relic_id,ducks,registered_at,received_by)
      values(p_registration,r->>'member_id',item_key,(r->>'ducks')::integer,(r->>'created_at')::timestamptz,auth.uid());
    end if;
    if p_kind in ('received','withdraw') then delete from public.relic_auction_registrations where id=p_registration;
    elsif p_kind='add_duck' then update public.relic_auction_registrations set ducks=ducks+1 where id=p_registration;
    elsif p_kind='remove_duck' then update public.relic_auction_registrations set ducks=ducks-1 where id=p_registration;
    else update public.relic_auction_registrations set next_bidder=(p_kind<>'clear_next') where id=p_registration; end if;
    if p_kind in ('carry_forward','outbid_again','received') then update public.relic_auction_registrations set ducks=ducks+1 where relic_id=item_key and id<>p_registration; end if;
  end if;
  update public.auction_control set revision=revision+1 where id=1 returning revision into rev;
  insert into public.auction_actions(id,revision,kind,category,item_id,member_id,member_name,round_at,actor,before_state)
    values(p_request,rev,p_kind,p_category,item_key,r->>'member_id',r->>'member_name',outcome_time,auth.uid(),snapshot);
  return p_request;
end; $$;

create or replace function public.ban_auction_player(p_member_id text,p_category text,p_expires_at timestamptz,p_revision bigint,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare player_name text; rev bigint; snapshot jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role='admin') then raise exception 'Auction admin access is required.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(778811,1);
  if p_request is null then raise exception 'Missing request ID.'; end if;
  if exists(select 1 from public.auction_actions where id=p_request) then return p_request; end if;
  select revision into rev from public.auction_control where id=1;
  if p_revision is distinct from rev then raise exception 'The auction list changed. Refresh and review it before trying again.'; end if;
  if p_category is null or p_category not in ('card','accessory','relic') or p_expires_at is null or p_expires_at<=clock_timestamp() then raise exception 'Select a category and a future ban expiry date/time.'; end if;
  select m->>'name' into player_name from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]')) m where p.id=1 and m->>'id'=p_member_id limit 1;
  if player_name is null then raise exception 'Select a player from the roster.'; end if;
  if exists(select 1 from public.auction_bans where member_id=p_member_id and expires_at>clock_timestamp()) then raise exception 'This player is already banned.'; end if;
  snapshot:=private.auction_snapshot('ban',null,p_member_id);
  insert into public.auction_bans(member_id,member_name,category,expires_at,banned_by) values(p_member_id,player_name,p_category,p_expires_at,auth.uid());
  delete from public.card_auction_registrations where member_id=p_member_id;
  delete from public.accessory_auction_registrations where member_id=p_member_id;
  delete from public.relic_auction_registrations where member_id=p_member_id;
  update public.auction_control set revision=revision+1 where id=1 returning revision into rev;
  insert into public.auction_actions(id,revision,kind,category,member_id,member_name,actor,before_state) values(p_request,rev,'ban',p_category,p_member_id,player_name,auth.uid(),snapshot);
  return p_request;
end; $$;

create or replace function public.undo_auction_action(p_action uuid,p_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare a public.auction_actions%rowtype; rev bigint; scope text;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role='admin') then raise exception 'Auction admin access is required.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(778811,1);
  select * into a from public.auction_actions where id=p_action;
  if not found then raise exception 'Action not found.'; end if;
  if a.undone_at is not null then return; end if;
  select revision into rev from public.auction_control where id=1;
  if p_revision is distinct from rev or a.revision<>rev then raise exception 'Cannot undo: a newer registration or admin action exists. No changes were made.'; end if;
  if a.kind='ban' and exists(select 1 from public.auction_bans where member_id=a.member_id and expires_at<=clock_timestamp() and banned_at>=a.created_at) then raise exception 'Cannot undo an expired ban.'; end if;
  scope:=case when a.kind='ban' then 'ban' else a.category end;
  delete from public.card_auction_registrations where (scope='card' and card_id=a.item_id) or (scope='ban' and member_id=a.member_id);
  delete from public.accessory_auction_registrations where (scope='accessory' and accessory_id=a.item_id) or (scope='ban' and member_id=a.member_id);
  delete from public.card_auction_history where scope='card' and card_id=a.item_id;
  delete from public.accessory_auction_history where scope='accessory' and accessory_id=a.item_id;
  delete from public.relic_auction_registrations where (scope='relic' and relic_id=a.item_id) or (scope='ban' and member_id=a.member_id);
  delete from public.relic_auction_history where scope='relic' and relic_id=a.item_id;
  delete from public.auction_bans where scope='ban' and member_id=a.member_id;
  insert into public.card_auction_registrations select * from jsonb_populate_recordset(null::public.card_auction_registrations,a.before_state->'cards');
  insert into public.accessory_auction_registrations select * from jsonb_populate_recordset(null::public.accessory_auction_registrations,a.before_state->'accessories');
  insert into public.card_auction_history select * from jsonb_populate_recordset(null::public.card_auction_history,a.before_state->'card_history');
  insert into public.accessory_auction_history select * from jsonb_populate_recordset(null::public.accessory_auction_history,a.before_state->'accessory_history');
  insert into public.relic_auction_registrations select * from jsonb_populate_recordset(null::public.relic_auction_registrations,coalesce(a.before_state->'relics','[]'));
  insert into public.relic_auction_history select * from jsonb_populate_recordset(null::public.relic_auction_history,coalesce(a.before_state->'relic_history','[]'));
  insert into public.auction_bans select * from jsonb_populate_recordset(null::public.auction_bans,a.before_state->'bans');
  update public.auction_actions set undone_at=clock_timestamp(),undone_by=auth.uid() where id=p_action;
  update public.auction_control set revision=revision+1 where id=1;
end; $$;

create or replace function public.remove_relic_auction_registration(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare rev bigint;
begin
  perform pg_advisory_xact_lock(778811,1);
  select revision into rev from public.auction_control where id=1;
  perform public.auction_admin_action('received','relic',p_id,rev,gen_random_uuid());
end; $$;


revoke all on function public.register_public_relic_auction(text,text[]),public.get_public_relic_auctions(),public.get_member_relic_history(text),public.remove_relic_auction_registration(uuid) from public,anon,authenticated;
revoke all on function private.auction_snapshot(text,text,text) from public,anon,authenticated;
grant execute on function public.register_public_relic_auction(text,text[]),public.get_public_relic_auctions() to anon,authenticated;
grant execute on function public.get_member_relic_history(text),public.remove_relic_auction_registration(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
