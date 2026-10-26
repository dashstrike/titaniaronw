-- Run after card_auction_history.sql and accessory_auction_setup.sql.
-- Expose only the latest receipt timestamp per item, not player/admin history.
begin;
create or replace function public.get_public_card_auctions()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls') order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'card_id', r.card_id, 'ducks', r.ducks, 'created_at', r.created_at) order by r.created_at)
      from public.card_auction_registrations r), '[]'::jsonb),
    'last_received', coalesce((select jsonb_object_agg(h.card_id,h.received_at)
      from (select card_id,max(received_at) as received_at from public.card_auction_history group by card_id) h), '{}'::jsonb)
  );
$$;
create or replace function public.get_public_accessory_auctions()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls') order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'accessory_id', r.accessory_id, 'ducks', r.ducks, 'created_at', r.created_at) order by r.created_at)
      from public.accessory_auction_registrations r), '[]'::jsonb),
    'last_received', coalesce((select jsonb_object_agg(h.accessory_id,h.received_at)
      from (select accessory_id,max(received_at) as received_at from public.accessory_auction_history group by accessory_id) h), '{}'::jsonb)
  );
$$;
notify pgrst, 'reload schema';
commit;
