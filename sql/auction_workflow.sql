-- Apply to the DEVELOPMENT project first. Production rollout is a separate action.
-- Requires the existing Card/Accessory setup, receipt history and timestamp RPCs.
begin;
create schema if not exists private;
alter table public.card_auction_registrations add column if not exists next_bidder boolean not null default false;
alter table public.accessory_auction_registrations add column if not exists next_bidder boolean not null default false;
alter table public.card_auction_registrations drop constraint if exists card_auction_registrations_ducks_check;
alter table public.card_auction_registrations add constraint card_auction_registrations_ducks_check check(ducks>=0);
alter table public.accessory_auction_registrations drop constraint if exists accessory_auction_registrations_ducks_check;
alter table public.accessory_auction_registrations add constraint accessory_auction_registrations_ducks_check check(ducks>=0);
alter table public.card_auction_history drop constraint if exists card_auction_history_ducks_check;
alter table public.card_auction_history add constraint card_auction_history_ducks_check check(ducks>=0);
alter table public.accessory_auction_history drop constraint if exists accessory_auction_history_ducks_check;
alter table public.accessory_auction_history add constraint accessory_auction_history_ducks_check check(ducks>=0);
create unique index if not exists card_one_next_bidder on public.card_auction_registrations(card_id) where next_bidder;
create unique index if not exists accessory_one_next_bidder on public.accessory_auction_registrations(accessory_id) where next_bidder;

create table if not exists public.auction_control (
  id integer primary key check(id=1), revision bigint not null default 0
);
insert into public.auction_control(id) values(1) on conflict do nothing;
create table if not exists public.auction_bans (
  id uuid primary key default gen_random_uuid(), member_id text not null, member_name text not null,
  category text not null check(category in ('card','accessory','relic')),
  banned_at timestamptz not null default now(), expires_at timestamptz not null,
  banned_by uuid not null references auth.users(id), check(expires_at>banned_at)
);
create index if not exists auction_bans_member_expiry on public.auction_bans(member_id,expires_at);
create table if not exists public.auction_actions (
  id uuid primary key, revision bigint not null unique, kind text not null,
  category text not null, item_id text, member_id text, member_name text, round_at timestamptz,
  created_at timestamptz not null default now(), actor uuid not null references auth.users(id),
  before_state jsonb not null, undone_at timestamptz, undone_by uuid references auth.users(id)
);
drop index if exists public.auction_one_round_outcome;
alter table public.auction_control enable row level security;
alter table public.auction_bans enable row level security;
alter table public.auction_actions enable row level security;
revoke all on public.auction_control,public.auction_bans,public.auction_actions from public,anon,authenticated;

-- Retain the validated existing registration implementation behind private wrappers.
do $$
begin
  if to_regprocedure('private.base_register_card(text,text[])') is null then
    alter function public.register_public_card_auction(text,text[]) rename to base_register_card;
    alter function public.base_register_card(text,text[]) set schema private;
    alter function public.register_public_accessory_auction(text,text[]) rename to base_register_accessory;
    alter function public.base_register_accessory(text,text[]) set schema private;
  end if;
end;
$$;
revoke all on function private.base_register_card(text,text[]),private.base_register_accessory(text,text[]) from public,anon,authenticated;

create or replace function public.register_public_card_auction(p_member_id text,p_card_ids text[])
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(778811,1);
  if exists(select 1 from public.auction_bans where member_id=p_member_id and expires_at>clock_timestamp()) then
    raise exception 'This player is banned from all auction registrations.';
  end if;
  n:=private.base_register_card(p_member_id,p_card_ids);
  if n>0 then update public.auction_control set revision=revision+1 where id=1; end if;
  return n;
end; $$;
create or replace function public.register_public_accessory_auction(p_member_id text,p_accessory_ids text[])
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(778811,1);
  if exists(select 1 from public.auction_bans where member_id=p_member_id and expires_at>clock_timestamp()) then
    raise exception 'This player is banned from all auction registrations.';
  end if;
  n:=private.base_register_accessory(p_member_id,p_accessory_ids);
  if n>0 then update public.auction_control set revision=revision+1 where id=1; end if;
  return n;
end; $$;

create or replace function private.auction_snapshot(p_category text,p_item text,p_member text)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object(
    'cards',coalesce((select jsonb_agg(to_jsonb(r)) from public.card_auction_registrations r where (p_category='card' and card_id=p_item) or (p_category='ban' and member_id=p_member)),'[]'),
    'accessories',coalesce((select jsonb_agg(to_jsonb(r)) from public.accessory_auction_registrations r where (p_category='accessory' and accessory_id=p_item) or (p_category='ban' and member_id=p_member)),'[]'),
    'card_history',coalesce((select jsonb_agg(to_jsonb(r)) from public.card_auction_history r where p_category='card' and card_id=p_item),'[]'),
    'accessory_history',coalesce((select jsonb_agg(to_jsonb(r)) from public.accessory_auction_history r where p_category='accessory' and accessory_id=p_item),'[]'),
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
  else
    if p_kind='received' then
      insert into public.accessory_auction_history(registration_id,member_id,accessory_id,ducks,registered_at,received_by)
      values(p_registration,r->>'member_id',item_key,(r->>'ducks')::integer,(r->>'created_at')::timestamptz,auth.uid());
    end if;
    if p_kind in ('received','withdraw') then delete from public.accessory_auction_registrations where id=p_registration;
    elsif p_kind='add_duck' then update public.accessory_auction_registrations set ducks=ducks+1 where id=p_registration;
    elsif p_kind='remove_duck' then update public.accessory_auction_registrations set ducks=ducks-1 where id=p_registration;
    else update public.accessory_auction_registrations set next_bidder=(p_kind<>'clear_next') where id=p_registration; end if;
    if p_kind in ('carry_forward','outbid_again','received') then update public.accessory_auction_registrations set ducks=ducks+1 where accessory_id=item_key and id<>p_registration; end if;
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
  delete from public.auction_bans where scope='ban' and member_id=a.member_id;
  insert into public.card_auction_registrations select * from jsonb_populate_recordset(null::public.card_auction_registrations,a.before_state->'cards');
  insert into public.accessory_auction_registrations select * from jsonb_populate_recordset(null::public.accessory_auction_registrations,a.before_state->'accessories');
  insert into public.card_auction_history select * from jsonb_populate_recordset(null::public.card_auction_history,a.before_state->'card_history');
  insert into public.accessory_auction_history select * from jsonb_populate_recordset(null::public.accessory_auction_history,a.before_state->'accessory_history');
  insert into public.auction_bans select * from jsonb_populate_recordset(null::public.auction_bans,a.before_state->'bans');
  update public.auction_actions set undone_at=clock_timestamp(),undone_by=auth.uid() where id=p_action;
  update public.auction_control set revision=revision+1 where id=1;
end; $$;

create or replace function public.get_auction_action_history()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role='admin') then raise exception 'Auction admin access is required.' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by revision desc) from (
    select a.id,a.revision,a.kind,a.category,a.item_id,a.member_id,a.member_name,a.round_at,a.created_at,a.undone_at,
      coalesce(p.display_name,'Admin') as admin_name,coalesce(u.display_name,'Admin') as undone_by_name,
      a.undone_at is null and a.revision=(select revision from public.auction_control where id=1) as can_undo
    from public.auction_actions a left join public.profiles p on p.id=a.actor left join public.profiles u on u.id=a.undone_by order by a.revision desc limit 100
  ) x),'[]');
end; $$;

-- Keep cached clients working while routing receipts through the audited workflow.
create or replace function public.remove_card_auction_registration(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare rev bigint;
begin
  perform pg_advisory_xact_lock(778811,1);
  select revision into rev from public.auction_control where id=1;
  perform public.auction_admin_action('received','card',p_id,rev,gen_random_uuid());
end; $$;
create or replace function public.remove_accessory_auction_registration(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare rev bigint;
begin
  perform pg_advisory_xact_lock(778811,1);
  select revision into rev from public.auction_control where id=1;
  perform public.auction_admin_action('received','accessory',p_id,rev,gen_random_uuid());
end; $$;

revoke all on function private.auction_snapshot(text,text,text) from public,anon,authenticated;
revoke all on function public.register_public_card_auction(text,text[]),public.register_public_accessory_auction(text,text[]),public.get_public_auction_workflow(text),public.auction_admin_action(text,text,uuid,bigint,uuid),public.ban_auction_player(text,text,timestamptz,bigint,uuid),public.undo_auction_action(uuid,bigint),public.get_auction_action_history(),public.remove_card_auction_registration(uuid),public.remove_accessory_auction_registration(uuid) from public,anon,authenticated;
grant execute on function public.register_public_card_auction(text,text[]),public.register_public_accessory_auction(text,text[]),public.get_public_auction_workflow(text) to anon,authenticated;
grant execute on function public.auction_admin_action(text,text,uuid,bigint,uuid),public.ban_auction_player(text,text,timestamptz,bigint,uuid),public.undo_auction_action(uuid,bigint),public.get_auction_action_history(),public.remove_card_auction_registration(uuid),public.remove_accessory_auction_registration(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
