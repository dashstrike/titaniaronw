begin;
select set_config('request.jwt.claims','{"sub":"ed644b6b-9626-4c53-a183-227f67983e6f","role":"authenticated"}',true);
set local role authenticated;
do $test$
declare original jsonb; candidate jsonb; current_revision bigint; saved jsonb; gl jsonb; siege jsonb;
begin
select state,revision into original,current_revision from public.planner_state where id=1;
candidate:=jsonb_set(original,'{raidTeamNames}','{"raid_1":"Test GL","sub_raid_1":"Test Sub","siege_raid_1":"Test Siege","siege_sub_raid_1":"Test Siege Sub","pz_star_1":"Private"}');
candidate:=jsonb_set(candidate,'{publicVisibility}','{"guildLeague":true,"siege":true,"polarityZone":false}');
perform public.save_planner_state(candidate,current_revision);
select state into saved from public.planner_state where id=1;
if (saved-'raidTeamNames'-'publicVisibility') is distinct from (original-'raidTeamNames'-'publicVisibility') then raise exception 'Existing fields changed'; end if;
gl:=public.get_public_lineup('guild');siege:=public.get_public_lineup('siege');
if gl->'raidTeamNames' <> '{"raid_1":"Test GL","sub_raid_1":"Test Sub"}'::jsonb then raise exception 'GL names/filter failed';end if;
if siege->'raidTeamNames' <> '{"siege_raid_1":"Test Siege","siege_sub_raid_1":"Test Siege Sub"}'::jsonb then raise exception 'Siege names/filter failed';end if;
update public.planner_state set state=jsonb_set(state,'{publicVisibility,guildLeague}','false') where id=1;
if public.get_public_lineup('guild')->'raidTeamNames' <> '{}'::jsonb then raise exception 'Unpublished name leaked';end if;
end $test$;
rollback;
