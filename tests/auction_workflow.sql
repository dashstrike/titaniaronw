-- DEVELOPMENT ONLY. Every test change is rolled back.
begin;
do $test$
declare
  one_id uuid; two_id uuid; accessory_registration uuid; outcome uuid; receipt uuid; ban_id uuid; rev bigint; stale_rev bigint; before_ducks integer;
begin
  assert exists(select 1 from auth.users where id='10000000-0000-4000-8000-000000000001' and email='dev-admin@titania.test'),'Development fixture required';
  -- Isolate fixture items without changing the developer's current data after rollback.
  delete from public.auction_bans where member_id in ('dev-one','dev-two','dev-three');
  delete from public.card_auction_registrations where card_id='fh';
  delete from public.accessory_auction_registrations where accessory_id='56009017';
  perform set_config('request.jwt.claim.sub','',true);
  assert public.register_public_card_auction('dev-one',array['fh'])=1;
  assert public.register_public_card_auction('dev-two',array['fh'])=1;
  assert public.register_public_card_auction('dev-three',array['fh'])=1;
  assert public.register_public_card_auction('dev-one',array['fh'])=0,'Duplicate registration';
  assert public.register_public_accessory_auction('dev-one',array['56009017'])=1;
  assert public.register_public_accessory_auction('dev-two',array['56009017'])=1;
  select id into one_id from public.card_auction_registrations where member_id='dev-one' and card_id='fh';
  select id into two_id from public.card_auction_registrations where member_id='dev-two' and card_id='fh';
  select id into accessory_registration from public.accessory_auction_registrations where member_id='dev-one' and accessory_id='56009017';
  select revision into rev from public.auction_control where id=1;
  begin
    perform public.auction_admin_action('carry_forward','card',one_id,rev,gen_random_uuid());
    raise exception 'Unauthenticated action allowed';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  outcome:=gen_random_uuid();
  perform public.auction_admin_action('remove_duck','card',one_id,rev,outcome);
  assert (select ducks=0 and not next_bidder from public.card_auction_registrations where id=one_id),'Removing the first duck did not leave the player registered at zero';
  assert (select kind='remove_duck' and actor='10000000-0000-4000-8000-000000000001' and before_state is not null from public.auction_actions where id=outcome),'Duck adjustment was not audited';
  assert (select ducks=1 from public.card_auction_registrations where id=two_id),'Removing a duck affected another player';
  perform public.auction_admin_action('remove_duck','card',one_id,rev,outcome);
  select revision into rev from public.auction_control where id=1;
  begin
    perform public.auction_admin_action('remove_duck','card',one_id,rev,gen_random_uuid());
    raise exception 'Removed a duck below zero';
  exception when raise_exception then if sqlerrm <> 'This player has no ducks left to remove.' then raise; end if; end;
  begin
    perform public.auction_admin_action('carry_forward','card',one_id,rev,gen_random_uuid());
    raise exception 'Carried forward a player with zero ducks';
  exception when raise_exception then if sqlerrm <> 'A player with no ducks cannot be carried forward.' then raise; end if; end;
  perform public.undo_auction_action(outcome,rev);
  assert (select ducks=1 from public.card_auction_registrations where id=one_id),'Undo did not restore the removed duck';
  select revision into rev from public.auction_control where id=1;
  stale_rev:=rev;
  outcome:=gen_random_uuid();
  perform public.auction_admin_action('carry_forward','card',one_id,rev,outcome);
  assert (select round_at is not null from public.auction_actions where id=outcome),'Outcome time was not recorded automatically';
  assert (select next_bidder and ducks=1 from public.card_auction_registrations where id=one_id),'Next bidder duck count changed';
  select revision into rev from public.auction_control where id=1;
  begin
    perform public.auction_admin_action('remove_duck','card',one_id,rev,gen_random_uuid());
    raise exception 'Removed hidden NEXT BIDDER duck';
  exception when raise_exception then if sqlerrm <> 'Clear NEXT BIDDER before changing this player''s ducks.' then raise; end if; end;
  assert (select ducks=2 from public.card_auction_registrations where id=two_id),'Other player did not gain a duck';
  assert (select ducks=1 from public.accessory_auction_registrations where id=accessory_registration),'Category isolation failed';
  perform public.auction_admin_action('carry_forward','card',one_id,rev,outcome);
  assert (select ducks=2 from public.card_auction_registrations where id=two_id),'Retry double-awarded ducks';
  begin
    perform public.auction_admin_action('outbid_again','card',one_id,stale_rev,gen_random_uuid());
    raise exception 'Stale revision accepted';
  exception when raise_exception then if sqlerrm not like 'The auction list changed.%' then raise; end if; end;
  begin
    perform public.auction_admin_action('received','card',two_id,rev,gen_random_uuid());
    raise exception 'Next bidder priority bypassed';
  exception when raise_exception then if sqlerrm not like 'The next bidder has priority%' then raise; end if; end;
  begin
    perform public.auction_admin_action('carry_forward','card',two_id,rev,gen_random_uuid());
    raise exception 'Second next bidder allowed';
  exception when raise_exception then if sqlerrm <> 'This item already has a next bidder.' then raise; end if; end;
  perform public.auction_admin_action('outbid_again','card',one_id,rev,gen_random_uuid());
  assert (select ducks=3 from public.card_auction_registrations where id=two_id);
  select revision into rev from public.auction_control where id=1;
  receipt:=gen_random_uuid();
  perform public.auction_admin_action('received','card',one_id,rev,receipt);
  assert not exists(select 1 from public.card_auction_registrations where id=one_id);
  assert exists(select 1 from public.card_auction_history where registration_id=one_id);
  assert (select ducks=4 from public.card_auction_registrations where id=two_id);
  select revision into rev from public.auction_control where id=1;
  perform public.undo_auction_action(receipt,rev);
  assert (select next_bidder and ducks=1 from public.card_auction_registrations where id=one_id);
  assert (select ducks=3 from public.card_auction_registrations where id=two_id);
  assert not exists(select 1 from public.card_auction_history where registration_id=one_id);
  select revision into rev from public.auction_control where id=1;
  outcome:=gen_random_uuid();
  perform public.auction_admin_action('clear_next','card',one_id,rev,outcome);
  assert (select not next_bidder and ducks=1 from public.card_auction_registrations where id=one_id);
  select revision into rev from public.auction_control where id=1;
  perform public.undo_auction_action(outcome,rev);
  select revision into rev from public.auction_control where id=1;
  outcome:=gen_random_uuid();
  perform public.auction_admin_action('withdraw','card',two_id,rev,outcome);
  assert not exists(select 1 from public.card_auction_registrations where id=two_id);
  assert (select ducks=1 from public.card_auction_registrations where id=one_id);
  select revision into rev from public.auction_control where id=1;
  perform public.undo_auction_action(outcome,rev);
  select revision into rev from public.auction_control where id=1;
  ban_id:=gen_random_uuid();
  perform public.ban_auction_player('dev-one','card',now()+interval '1 day',rev,ban_id);
  assert not exists(select 1 from public.card_auction_registrations where member_id='dev-one');
  assert not exists(select 1 from public.accessory_auction_registrations where member_id='dev-one');
  assert (select ducks=3 from public.card_auction_registrations where id=two_id),'Ban awarded ducks';
  begin
    perform public.register_public_card_auction('dev-one',array['fh']);
    raise exception 'Ban bypassed in Card';
  exception when raise_exception then if sqlerrm <> 'This player is banned from all auction registrations.' then raise; end if; end;
  begin
    perform public.register_public_accessory_auction('dev-one',array['56009017']);
    raise exception 'Ban bypassed in Accessory';
  exception when raise_exception then if sqlerrm <> 'This player is banned from all auction registrations.' then raise; end if; end;
  select revision into rev from public.auction_control where id=1;
  perform public.undo_auction_action(ban_id,rev);
  assert (select next_bidder and ducks=1 from public.card_auction_registrations where id=one_id);
  assert exists(select 1 from public.accessory_auction_registrations where id=accessory_registration);
  assert not exists(select 1 from public.auction_bans where member_id='dev-one');
  select revision into rev from public.auction_control where id=1;
  ban_id:=gen_random_uuid();
  perform public.ban_auction_player('dev-one','accessory',now()+interval '1 day',rev,ban_id);
  update public.auction_bans set banned_at=now()-interval '2 days',expires_at=now()-interval '1 day' where member_id='dev-one';
  assert public.register_public_card_auction('dev-one',array['fh'])=1,'Automatic expiry failed';
  assert (select ducks=1 and not next_bidder from public.card_auction_registrations where member_id='dev-one' and card_id='fh'),'Ban did not reset ducks';
  select revision into rev from public.auction_control where id=1;
  begin
    perform public.undo_auction_action(ban_id,rev);
    raise exception 'Undo overwrote a newer registration';
  exception when raise_exception then if sqlerrm not like 'Cannot undo:%' then raise; end if; end;
  -- Accessory has the same outcome/undo behavior.
  assert public.register_public_accessory_auction('dev-one',array['56009017'])=1;
  select id into accessory_registration from public.accessory_auction_registrations where member_id='dev-one';
  select revision into rev from public.auction_control where id=1;
  outcome:=gen_random_uuid();
  perform public.auction_admin_action('remove_duck','accessory',accessory_registration,rev,outcome);
  assert (select ducks=0 from public.accessory_auction_registrations where id=accessory_registration),'Accessory duck was not removed';
  select revision into rev from public.auction_control where id=1;
  perform public.undo_auction_action(outcome,rev);
  assert (select ducks=1 from public.accessory_auction_registrations where id=accessory_registration),'Accessory undo did not restore the duck';
  select revision into rev from public.auction_control where id=1;
  perform public.auction_admin_action('carry_forward','accessory',accessory_registration,rev,gen_random_uuid());
  assert (select next_bidder and ducks=1 from public.accessory_auction_registrations where id=accessory_registration);
  select revision into rev from public.auction_control where id=1;
  receipt:=gen_random_uuid();
  perform public.auction_admin_action('received','accessory',accessory_registration,rev,receipt);
  assert exists(select 1 from public.accessory_auction_history where registration_id=accessory_registration);
  select revision into rev from public.auction_control where id=1;
  perform public.undo_auction_action(receipt,rev);
  assert not exists(select 1 from public.accessory_auction_history where registration_id=accessory_registration);
  -- Cached pages still use the old receipt RPC; it must also create an audit entry.
  select revision into rev from public.auction_control where id=1;
  perform public.remove_accessory_auction_registration(accessory_registration);
  select id into receipt from public.auction_actions where revision=rev+1;
  assert (select kind='received' and category='accessory' from public.auction_actions where id=receipt),'Legacy receipt bypassed audit history';
  select revision into rev from public.auction_control where id=1;
  perform public.undo_auction_action(receipt,rev);
  assert exists(select 1 from public.accessory_auction_registrations where id=accessory_registration),'Legacy receipt could not be undone';
  assert jsonb_array_length(public.get_auction_action_history())>0;
  assert not has_function_privilege('anon','public.auction_admin_action(text,text,uuid,bigint,uuid)','EXECUTE');
  assert not has_function_privilege('anon','public.remove_accessory_auction_registration(uuid)','EXECUTE');
  assert not has_function_privilege('anon','private.base_register_card(text,text[])','EXECUTE');
end;
$test$;
rollback;
