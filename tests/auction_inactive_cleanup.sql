-- DEVELOPMENT ONLY: synthetic members and rollback-only auction changes.
begin;
do $test$
declare admin_id uuid; one_id uuid; action_id uuid; empty_action uuid;
  rev bigint; before_revision bigint; card_ducks integer; accessory_ducks integer; relic_ducks integer;
begin
  select id into admin_id from public.profiles where approved and role='admin' limit 1;
  assert admin_id is not null,'Approved development admin required';
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  delete from public.card_auction_registrations where card_id='fh';
  delete from public.accessory_auction_registrations where accessory_id='56009017';
  delete from public.relic_auction_registrations where relic_id in ('bane_int','guard_int','guard_dex');
  update public.planner_state set state=jsonb_set(state,'{roster}',coalesce(state->'roster','[]'::jsonb)||'[
    {"id":"auction-cleanup-a","name":"Auction Cleanup A","cls":"Scholar","status":"active"},
    {"id":"auction-cleanup-b","name":"Auction Cleanup B","cls":"Stalker","status":"active"},
    {"id":"auction-cleanup-c","name":"Auction Cleanup C","cls":"High Priest","status":"active"}
  ]'::jsonb) where id=1;
  perform public.register_public_card_auction('auction-cleanup-a',array['fh']);
  perform public.register_public_card_auction('auction-cleanup-b',array['fh']);
  perform public.register_public_accessory_auction('auction-cleanup-a',array['56009017']);
  perform public.register_public_accessory_auction('auction-cleanup-b',array['56009017']);
  perform public.register_public_relic_auction('auction-cleanup-a',array['bane_int','guard_int']);
  perform public.register_public_relic_auction('auction-cleanup-b',array['bane_int']);
  insert into public.card_auction_history(registration_id,member_id,card_id,ducks,registered_at,received_by)
  values(gen_random_uuid(),'auction-cleanup-a','fh',2,now(),admin_id);
  insert into public.accessory_auction_history(registration_id,member_id,accessory_id,ducks,registered_at,received_by)
  values(gen_random_uuid(),'auction-cleanup-a','56009017',2,now(),admin_id);
  insert into public.relic_auction_history(registration_id,member_id,relic_id,ducks,registered_at,received_by)
  values(gen_random_uuid(),'auction-cleanup-a','bane_int',2,now(),admin_id);
  select id into one_id from public.card_auction_registrations where member_id='auction-cleanup-a' and card_id='fh';
  select revision into rev from public.auction_control where id=1;
  action_id:=gen_random_uuid();
  perform public.auction_admin_action('carry_forward','card',one_id,rev,action_id);
  select ducks into card_ducks from public.card_auction_registrations where member_id='auction-cleanup-b' and card_id='fh';
  select ducks into accessory_ducks from public.accessory_auction_registrations where member_id='auction-cleanup-b' and accessory_id='56009017';
  select ducks into relic_ducks from public.relic_auction_registrations where member_id='auction-cleanup-b' and relic_id='bane_int';
  select revision into before_revision from public.auction_control where id=1;
  update public.planner_state set state=jsonb_set(state,'{roster}',(
    select jsonb_agg(case when m->>'id'='auction-cleanup-a' then jsonb_set(m,'{status}','"inactive"'::jsonb) else m end order by position)
    from jsonb_array_elements(state->'roster') with ordinality as roster(m,position)
  )) where id=1;
  assert not exists(select 1 from public.card_auction_registrations where member_id='auction-cleanup-a');
  assert not exists(select 1 from public.accessory_auction_registrations where member_id='auction-cleanup-a');
  assert not exists(select 1 from public.relic_auction_registrations where member_id='auction-cleanup-a');
  assert (select ducks=card_ducks from public.card_auction_registrations where member_id='auction-cleanup-b' and card_id='fh'),'Cleanup awarded card ducks';
  assert (select ducks=accessory_ducks from public.accessory_auction_registrations where member_id='auction-cleanup-b' and accessory_id='56009017'),'Cleanup awarded accessory ducks';
  assert (select ducks=relic_ducks from public.relic_auction_registrations where member_id='auction-cleanup-b' and relic_id='bane_int'),'Cleanup awarded relic ducks';
  assert exists(select 1 from public.card_auction_history where member_id='auction-cleanup-a');
  assert exists(select 1 from public.accessory_auction_history where member_id='auction-cleanup-a');
  assert exists(select 1 from public.relic_auction_history where member_id='auction-cleanup-a');
  select revision into rev from public.auction_control where id=1;
  assert rev>before_revision,'Cleanup did not invalidate stale auction actions';
  begin
    perform public.undo_auction_action(action_id,rev);
    raise exception 'Undo restored an inactive member';
  exception when raise_exception then if sqlerrm not like 'Cannot undo:%' then raise; end if; end;
  begin
    insert into public.card_auction_registrations(member_id,member_name,card_id) values('auction-cleanup-a','Auction Cleanup A','fh');
    raise exception 'Inactive card registration accepted';
  exception when check_violation then null; end;
  begin
    insert into public.accessory_auction_registrations(member_id,member_name,accessory_id) values('auction-cleanup-a','Auction Cleanup A','56009017');
    raise exception 'Inactive accessory registration accepted';
  exception when check_violation then null; end;
  begin
    insert into public.relic_auction_registrations(member_id,member_name,relic_id) values('auction-cleanup-a','Auction Cleanup A','guard_int');
    raise exception 'Inactive relic registration accepted';
  exception when check_violation then null; end;
  update public.planner_state set state=state where id=1;
  assert (select revision=rev from public.auction_control where id=1),'Unchanged inactivity should not keep changing revision';
  update public.planner_state set state=jsonb_set(state,'{roster}',(
    select jsonb_agg(case when m->>'id'='auction-cleanup-a' then jsonb_set(m,'{status}','"active"'::jsonb) else m end order by position)
    from jsonb_array_elements(state->'roster') with ordinality as roster(m,position)
  )) where id=1;
  assert not exists(select 1 from public.relic_auction_registrations where member_id='auction-cleanup-a'),'Reactivation restored an old entry';
  assert public.register_public_relic_auction('auction-cleanup-a',array['guard_int'])=1;
  assert (select ducks=1 and not next_bidder from public.relic_auction_registrations where member_id='auction-cleanup-a' and relic_id='guard_int');
  -- A withdrawn player has no pending entry, but must not be restored by undo.
  perform public.register_public_relic_auction('auction-cleanup-c',array['guard_dex']);
  select id into one_id from public.relic_auction_registrations where member_id='auction-cleanup-c' and relic_id='guard_dex';
  select revision into rev from public.auction_control where id=1;
  empty_action:=gen_random_uuid();
  perform public.auction_admin_action('withdraw','relic',one_id,rev,empty_action);
  select revision into before_revision from public.auction_control where id=1;
  update public.planner_state set state=jsonb_set(state,'{roster}',(
    select jsonb_agg(case when m->>'id'='auction-cleanup-c' then jsonb_set(m,'{status}','"inactive"'::jsonb) else m end order by position)
    from jsonb_array_elements(state->'roster') with ordinality as roster(m,position)
  )) where id=1;
  select revision into rev from public.auction_control where id=1;
  assert rev>before_revision,'Inactivity after withdrawal left undo enabled';
  begin
    perform public.undo_auction_action(empty_action,rev);
    raise exception 'Undo restored a withdrawn inactive member';
  exception when raise_exception then if sqlerrm not like 'Cannot undo:%' then raise; end if; end;
  assert not has_function_privilege('anon','private.cleanup_inactive_auction_registrations(jsonb)','execute');
  assert not has_function_privilege('authenticated','private.reject_inactive_auction_registration()','execute');
end;
$test$;
rollback;
