-- Run in a transaction and roll back: synthetic layout, no persistent roster edits.
begin;
do $$
declare
  original jsonb;
  candidate jsonb;
  saved jsonb;
  invalid jsonb;
  groups jsonb := '{"raid_1":["main_1","main_2","main_3","main_4","main_5","main_6"],"raid_2":["main_7","main_8","main_9","main_10","main_11","main_12"],"sub_raid_1":["sub_1","sub_2","sub_3","sub_4","sub_5","sub_6","sub_7","sub_8"],"sub_raid_2":["sub_9","sub_10","sub_11","sub_12","sub_13","sub_14","sub_15","sub_16"],"sub_raid_5":["sub_17","sub_18"]}';
  rev bigint;
  admin_id uuid;
begin
  select id into admin_id from public.profiles where approved and role='admin' limit 1;
  assert admin_id is not null,'An approved admin is required';
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  execute 'set local role authenticated';
  select state,revision into original,rev from public.planner_state where id=1;
  candidate:=jsonb_set(original,'{assignments}','{"main_1":["Synthetic player",null,null,null,null]}');
  candidate:=jsonb_set(candidate,'{guildRaidGroups}',groups);
  candidate:=jsonb_set(candidate,'{publicVisibility}','{"guildLeague":true,"siege":true}');
  perform public.save_planner_state(candidate,rev);
  select state into saved from public.planner_state where id=1;
  if saved->'guildRaidGroups'<>groups then raise exception 'Layout not persisted'; end if;
  if (saved-'assignments'-'guildRaidGroups'-'publicVisibility') is distinct from (original-'assignments'-'guildRaidGroups'-'publicVisibility') then raise exception 'Unrelated state changed'; end if;
  if public.get_public_lineup('guild')->'guildRaidGroups'<>groups then raise exception 'Public layout missing'; end if;
  if public.get_public_lineup('siege')->'guildRaidGroups'<>'null'::jsonb then raise exception 'GL layout leaked into Siege'; end if;
  update public.planner_state set state=jsonb_set(state,'{publicVisibility,guildLeague}','false') where id=1;
  if public.get_public_lineup('guild') ? 'guildRaidGroups' then raise exception 'Private layout leaked'; end if;
  -- Old clients cannot erase grouping by omitting the field.
  update public.planner_state set state=state-'guildRaidGroups' where id=1;
  if (select state->'guildRaidGroups' from public.planner_state where id=1)<>groups then raise exception 'Old client erased layout'; end if;
  for invalid in select value from jsonb_array_elements(jsonb_build_array(
    '{}'::jsonb,
    groups-'sub_raid_1'-'sub_raid_2'-'sub_raid_5',
    jsonb_set(groups,'{raid_1}','[]'),
    jsonb_set(groups,'{raid_1}','["main_1","main_2","main_3","main_4","main_5","main_6","main_7","main_8","main_9"]'),
    jsonb_set(groups,'{raid_1}','["main_13"]'),
    jsonb_set(groups,'{sub_raid_5}','["sub_19"]'),
    jsonb_set(groups,'{raid_1}','["sub_1"]'),
    jsonb_set(groups,'{raid_1}','["main_7"]'),
    groups||'{"raid_6":["main_1"]}'::jsonb,
    groups-'raid_1'
  )) loop
    begin
      update public.planner_state set state=jsonb_set(state,'{guildRaidGroups}',invalid) where id=1;
      raise exception 'Invalid layout accepted: %',invalid;
    exception when check_violation then null;
    end;
  end loop;
  begin
    update public.planner_state set state=jsonb_set(state,'{assignments,main_1}','["a","b","c","d","e","f"]') where id=1;
    raise exception 'Six players accepted';
  exception when check_violation then null;
  end;
  perform public.save_raid_mode_setting('raid_5','MVP');
  if (select state#>>'{raidModes,raid_5}' from public.planner_state where id=1)<>'MVP' then raise exception 'New raid lost MVP'; end if;
  if has_function_privilege('anon','public.validate_guild_raid_layout()','execute') or has_function_privilege('authenticated','public.validate_guild_raid_layout()','execute') then raise exception 'Private validator exposed'; end if;
end;
$$;
rollback;
