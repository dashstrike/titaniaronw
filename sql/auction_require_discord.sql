CREATE OR REPLACE FUNCTION public.get_public_accessory_auctions()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls', 'discord_linked', exists(select 1 from public.member_discord_link_status ds where ds.member_id=m->>'id' and ds.linked)) order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'accessory_id', r.accessory_id, 'ducks', r.ducks, 'created_at', r.created_at) order by r.created_at)
      from public.accessory_auction_registrations r), '[]'::jsonb),
    'last_received', coalesce((select jsonb_object_agg(h.accessory_id,h.received_at)
      from (select accessory_id,max(received_at) as received_at from public.accessory_auction_history group by accessory_id) h), '{}'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_public_card_auctions()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls', 'discord_linked', exists(select 1 from public.member_discord_link_status ds where ds.member_id=m->>'id' and ds.linked)) order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'card_id', r.card_id, 'ducks', r.ducks, 'created_at', r.created_at) order by r.created_at)
      from public.card_auction_registrations r), '[]'::jsonb),
    'last_received', coalesce((select jsonb_object_agg(h.card_id,h.received_at)
      from (select card_id,max(received_at) as received_at from public.card_auction_history group by card_id) h), '{}'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_public_relic_auctions()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'cls', m->>'cls', 'discord_linked', exists(select 1 from public.member_discord_link_status ds where ds.member_id=m->>'id' and ds.linked)) order by lower(m->>'name'))
      from public.planner_state p cross join lateral jsonb_array_elements(coalesce(p.state->'roster','[]'::jsonb)) m
      where p.id=1 and nullif(m->>'id','') is not null and nullif(m->>'name','') is not null
        and lower(coalesce(m->>'status','active')) <> 'inactive'), '[]'::jsonb),
    'registrations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'member_id', r.member_id, 'member_name', r.member_name, 'relic_id', r.relic_id, 'ducks', r.ducks, 'created_at', r.created_at) order by r.created_at)
      from public.relic_auction_registrations r), '[]'::jsonb),
    'last_received', coalesce((select jsonb_object_agg(h.relic_id,h.received_at)
      from (select relic_id,max(received_at) as received_at from public.relic_auction_history group by relic_id) h), '{}'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.register_public_accessory_auction(p_member_id text, p_accessory_ids text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
  if not exists(select 1 from public.member_discord_link_status ds where ds.member_id=p_member_id and ds.linked) then
    raise exception 'No Discord link. Link your Discord account before registering.';
  end if;
  perform pg_advisory_xact_lock(778811,1);
  if exists(select 1 from public.auction_bans where member_id=p_member_id and expires_at>clock_timestamp()) then
    raise exception 'This player is banned from all auction registrations.';
  end if;
  n:=private.base_register_accessory(p_member_id,p_accessory_ids);
  if n>0 then update public.auction_control set revision=revision+1 where id=1; end if;
  return n;
end; $function$;

CREATE OR REPLACE FUNCTION public.register_public_card_auction(p_member_id text, p_card_ids text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
  if not exists(select 1 from public.member_discord_link_status ds where ds.member_id=p_member_id and ds.linked) then
    raise exception 'No Discord link. Link your Discord account before registering.';
  end if;
  perform pg_advisory_xact_lock(778811,1);
  if exists(select 1 from public.auction_bans where member_id=p_member_id and expires_at>clock_timestamp()) then
    raise exception 'This player is banned from all auction registrations.';
  end if;
  n:=private.base_register_card(p_member_id,p_card_ids);
  if n>0 then update public.auction_control set revision=revision+1 where id=1; end if;
  return n;
end; $function$;

CREATE OR REPLACE FUNCTION public.register_public_relic_auction(p_member_id text, p_relic_ids text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare player_name text; inserted_count integer;
begin
  if not exists(select 1 from public.member_discord_link_status ds where ds.member_id=p_member_id and ds.linked) then
    raise exception 'No Discord link. Link your Discord account before registering.';
  end if;
  perform pg_advisory_xact_lock(778811,1);
  if p_relic_ids is null or cardinality(p_relic_ids) not between 1 and 12
    or exists(select 1 from unnest(p_relic_ids) s where s is null or s not in ('bane_str','bane_agi','bane_vit','bane_dex','bane_int','bane_luk','guard_str','guard_agi','guard_vit','guard_dex','guard_int','guard_luk')) then
    raise exception 'Select a valid relic type (Bane or Guard) and stat.';
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
end; $function$;
