-- DEVELOPMENT ONLY: Bane/Guard isolation; all writes are rolled back.
begin;
do $$
declare bane_one uuid; bane_two uuid; guard_one uuid; guard_two uuid; rev bigint; action uuid;
begin
  assert exists(select 1 from auth.users where id='10000000-0000-4000-8000-000000000001' and email='dev-admin@titania.test'),'Development fixture required';
  delete from public.auction_bans where member_id in ('dev-one','dev-two');
  delete from public.relic_auction_registrations where relic_id in ('bane_str','guard_str');
  perform set_config('request.jwt.claim.sub','',true);
  assert public.register_public_relic_auction('dev-one',array['bane_str','guard_str'])=2;
  assert public.register_public_relic_auction('dev-two',array['bane_str','guard_str'])=2;
  assert public.register_public_relic_auction('dev-one',array['bane_str','guard_str'])=0;
  begin
    perform public.register_public_relic_auction('dev-one',array['str']);
    raise exception 'Untyped registration accepted';
  exception when raise_exception then if sqlerrm<>'Select a valid relic type (Bane or Guard) and stat.' then raise; end if; end;
  select id into bane_one from public.relic_auction_registrations where relic_id='bane_str' and member_id='dev-one';
  select id into bane_two from public.relic_auction_registrations where relic_id='bane_str' and member_id='dev-two';
  select id into guard_one from public.relic_auction_registrations where relic_id='guard_str' and member_id='dev-one';
  select id into guard_two from public.relic_auction_registrations where relic_id='guard_str' and member_id='dev-two';
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  select revision into rev from public.auction_control where id=1;
  perform public.auction_admin_action('carry_forward','relic',bane_one,rev,gen_random_uuid());
  assert (select next_bidder from public.relic_auction_registrations where id=bane_one);
  assert (select ducks=2 from public.relic_auction_registrations where id=bane_two);
  assert (select ducks=1 and not next_bidder from public.relic_auction_registrations where id=guard_one);
  select revision into rev from public.auction_control where id=1;
  action:=gen_random_uuid();
  perform public.auction_admin_action('received','relic',guard_one,rev,action);
  assert not exists(select 1 from public.relic_auction_registrations where id=guard_one);
  assert (select relic_id='guard_str' from public.relic_auction_history where registration_id=guard_one);
  assert (select ducks=2 from public.relic_auction_registrations where id=guard_two);
  assert (select next_bidder and ducks=1 from public.relic_auction_registrations where id=bane_one);
  assert (select ducks=2 from public.relic_auction_registrations where id=bane_two);
  select revision into rev from public.auction_control where id=1;
  perform public.undo_auction_action(action,rev);
  assert (select ducks=1 from public.relic_auction_registrations where id=guard_one);
  assert (select ducks=1 from public.relic_auction_registrations where id=guard_two);
  assert (select next_bidder from public.relic_auction_registrations where id=bane_one);
  assert not exists(select 1 from public.relic_auction_history where registration_id=guard_one);
end; $$;
rollback;
