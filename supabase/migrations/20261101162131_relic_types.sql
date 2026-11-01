-- Split Relic bidding by type. Existing untyped registrations are copied
-- into BOTH Bane and Guard, preserving ducks, timestamps and NEXT BIDDER.
-- Existing receipts remain historical records, without duplicating receipts.
begin;
select pg_advisory_xact_lock(778811,1);
alter table public.relic_auction_registrations drop constraint relic_auction_registrations_relic_id_check;
with converted as (
  update public.relic_auction_registrations set relic_id='bane_'||relic_id
  where relic_id in ('str','agi','vit','dex','int','luk') returning *
)
insert into public.relic_auction_registrations(id,member_id,member_name,relic_id,ducks,created_at,next_bidder)
select gen_random_uuid(),member_id,member_name,'guard_'||substring(relic_id from 6),ducks,created_at,next_bidder from converted;
alter table public.relic_auction_registrations add constraint relic_auction_registrations_relic_id_check check(relic_id in ('bane_str','bane_agi','bane_vit','bane_dex','bane_int','bane_luk','guard_str','guard_agi','guard_vit','guard_dex','guard_int','guard_luk'));
alter table public.relic_auction_history drop constraint relic_auction_history_relic_id_check;
alter table public.relic_auction_history add constraint relic_auction_history_relic_id_check check(relic_id in ('str','agi','vit','dex','int','luk','bane_str','bane_agi','bane_vit','bane_dex','bane_int','bane_luk','guard_str','guard_agi','guard_vit','guard_dex','guard_int','guard_luk'));
-- Older page actions and undo snapshots predate the split; require a refresh.
update public.auction_control set revision=revision+1 where id=1;

create or replace function public.register_public_relic_auction(p_member_id text,p_relic_ids text[])
returns integer language plpgsql security definer set search_path='' as $$
declare player_name text; inserted_count integer;
begin
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
end; $$;

revoke all on function public.register_public_relic_auction(text,text[]) from public,anon,authenticated;
grant execute on function public.register_public_relic_auction(text,text[]) to anon,authenticated;
notify pgrst,'reload schema';
commit;
