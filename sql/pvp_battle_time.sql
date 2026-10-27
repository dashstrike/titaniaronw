-- Upgrade the existing PVP table. All battle times are local GMT+8.
begin;
alter table public.pvp_battles add column if not exists battle_time time(0) without time zone;
-- These two files were confirmed as Tuesday's 22:00 match.
update public.pvp_battles set battle_time = time '22:00'
where category = 'guild_league' and battle_date = date '2026-10-27'
  and ((battlefield = 'main' and source_file = 'main27-10-2026.csv')
    or (battlefield = 'sub' and source_file = 'sub27-10-2026.csv'))
  and battle_time is null;
-- Fail rather than guess a time for any other existing record.
alter table public.pvp_battles alter column battle_time set not null;
alter table public.pvp_battles drop constraint if exists pvp_battles_category_battle_date_battlefield_key;
alter table public.pvp_battles drop constraint if exists pvp_battles_category_battle_date_battle_time_battlefield_key;
alter table public.pvp_battles add constraint pvp_battles_category_battle_date_battle_time_battlefield_key unique(category,battle_date,battle_time,battlefield);
alter table public.pvp_battles drop constraint if exists pvp_battles_battle_time_check;
alter table public.pvp_battles add constraint pvp_battles_battle_time_check check (battle_time < time '24:00' and extract(second from battle_time) = 0);
commit;
