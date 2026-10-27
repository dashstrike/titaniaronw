-- One-time correction of the four verified imports from server UTC+7 to GMT+8.
-- ID and original-time guards make this safe to rerun.
begin;
update public.pvp_battles
set battle_time = battle_time + interval '1 hour'
where category = 'guild_league' and battle_date = date '2026-10-27'
  and ((id in ('f2ce3cc5-cf83-4fc9-86b6-b95fe34631c9','044027f5-4584-4626-bdf7-db5a720d4ddd') and battle_time = time '21:30')
    or (id in ('d4a2ab02-99d7-4b80-a13c-6c233d19e62d','bdb80d14-60dd-4d24-91c4-fdcde62f786d') and battle_time = time '22:00'));
commit;
