-- Apply after auction_workflow.sql. Adds the audited Add 1 Duck action.
begin;
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
notify pgrst, 'reload schema';
commit;
