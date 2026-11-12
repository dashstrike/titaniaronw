-- Optional grouping field: no existing lineup is rewritten by this migration.
begin;
create or replace function public.validate_guild_raid_layout()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  groups jsonb;
  entry record;
  assignment record;
  party text;
  used text[] := array[]::text[];
  main_count integer := 0;
  sub_count integer := 0;
begin
  -- Older clients must not silently discard a layout saved by the new editor.
  if not (new.state ? 'guildRaidGroups') then
    if tg_op = 'UPDATE' and old.state ? 'guildRaidGroups' then
      new.state := jsonb_set(new.state, '{guildRaidGroups}', old.state->'guildRaidGroups');
    else
      return new;
    end if;
  end if;
  groups := new.state->'guildRaidGroups';
  if jsonb_typeof(groups) is distinct from 'object' then
    raise exception 'GL_LAYOUT_INVALID: expected raid groups' using errcode='23514';
  end if;
  for entry in select * from jsonb_each(groups) loop
    if entry.key !~ '^(raid_[1-5]|sub_raid_[1-5])$' then
      raise exception 'GL_LAYOUT_INVALID: unknown raid' using errcode='23514';
    end if;
    if jsonb_typeof(entry.value) is distinct from 'array' then
      raise exception 'GL_LAYOUT_INVALID: expected parties' using errcode='23514';
    end if;
    if jsonb_array_length(entry.value) not between 1 and 8 then
      raise exception 'GL_LAYOUT_INVALID: each raid needs 1-8 parties' using errcode='23514';
    end if;
    if entry.key like 'sub_%' then sub_count:=sub_count+1; else main_count:=main_count+1; end if;
    for party in select jsonb_array_elements_text(entry.value) loop
      if party is null or party = any(used)
        or (entry.key like 'sub_%' and party !~ '^sub_([1-9]|1[0-8])$')
        or (entry.key not like 'sub_%' and party !~ '^main_([1-9]|1[0-2])$') then
        raise exception 'GL_LAYOUT_INVALID: invalid or duplicate party' using errcode='23514';
      end if;
      used:=array_append(used,party);
    end loop;
  end loop;
  if main_count not between 1 and 5 or sub_count not between 1 and 5 then
    raise exception 'GL_LAYOUT_INVALID: each battlefield needs 1-5 raids' using errcode='23514';
  end if;
  for assignment in select * from jsonb_each(coalesce(new.state->'assignments','{}'::jsonb)) loop
    if assignment.key ~ '^(main_|sub_)' then
      if assignment.key !~ '^(main_([1-9]|1[0-2])|sub_([1-9]|1[0-8]))$'
        or jsonb_typeof(assignment.value) is distinct from 'array' then
        raise exception 'GL_LAYOUT_INVALID: invalid party assignment' using errcode='23514';
      end if;
      if jsonb_array_length(assignment.value)>5 then
        raise exception 'GL_LAYOUT_INVALID: party exceeds five players' using errcode='23514';
      end if;
      if not (assignment.key=any(used)) and exists (
        select 1 from jsonb_array_elements_text(assignment.value) slot where nullif(btrim(slot),'') is not null
      ) then
        raise exception 'GL_LAYOUT_INVALID: occupied party missing from raid layout. Reload the roster.' using errcode='23514';
      end if;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.validate_guild_raid_layout() from public,anon,authenticated;
create trigger planner_guild_raid_layout before insert or update of state on public.planner_state
for each row execute function public.validate_guild_raid_layout();

CREATE OR REPLACE FUNCTION public.get_public_lineup(p_view text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_view text := lower(trim(coalesce(p_view, '')));
  v_state jsonb := '{}'::jsonb;
  v_revision bigint := 0;
  v_row_updated_at timestamptz;
  v_visibility_key text;
  v_update_key text;
  v_assignment_pattern text;
  v_raid_pattern text;
  v_published boolean := false;
  v_assignments jsonb := '{}'::jsonb;
  v_raid_team_names jsonb := '{}'::jsonb;
  v_raid_commanders jsonb := '{}'::jsonb;
  v_raid_leaders jsonb := '{}'::jsonb;
  v_raid_modes jsonb := '{}'::jsonb;
  v_roster jsonb := '[]'::jsonb;
  v_used_names text[] := array[]::text[];
  v_event_updated_at text := '';
  v_event_updated_by text := '';
  v_finished_dungeons jsonb := '[]'::jsonb;
  v_siege_raid_groups jsonb := '{}'::jsonb;
  v_pre_attendance jsonb := '{}'::jsonb;
  v_attendance_event_id uuid;
  v_today date := current_date;
  v_next_tuesday date;
  v_next_thursday date;
  v_next_sunday date;
  v_attendance_type text;
  v_attendance_date date;
begin
  if v_view not in ('guild', 'siege', 'polarity') then
    return jsonb_build_object(
      'published', false,
      'roster', '[]'::jsonb,
      'assignments', '{}'::jsonb,
      'raidTeamNames', '{}'::jsonb,
      'raidCommanders', '{}'::jsonb,
      'raidLeaders', '{}'::jsonb,
      'raidModes', '{}'::jsonb,
      'siegeRaidGroups', '{}'::jsonb,
      'finishedDungeons', '[]'::jsonb,
      'preAttendance', '{}'::jsonb,
      'revision', 0,
      'updatedAt', ''
    );
  end if;

  select coalesce(ps.state, '{}'::jsonb), coalesce(ps.revision, 0), ps.updated_at
    into v_state, v_revision, v_row_updated_at
  from public.planner_state ps
  where ps.id = 1;

  if not found then
    return jsonb_build_object(
      'published', false,
      'roster', '[]'::jsonb,
      'assignments', '{}'::jsonb,
      'raidTeamNames', '{}'::jsonb,
      'raidCommanders', '{}'::jsonb,
      'raidLeaders', '{}'::jsonb,
      'raidModes', '{}'::jsonb,
      'siegeRaidGroups', '{}'::jsonb,
      'finishedDungeons', '[]'::jsonb,
      'preAttendance', '{}'::jsonb,
      'revision', 0,
      'updatedAt', ''
    );
  end if;

  case v_view
    when 'guild' then
      v_visibility_key := 'guildLeague';
      v_update_key := 'guildLeague';
      v_assignment_pattern := '^(main_|sub_)';
      v_raid_pattern := '^(raid_[0-9]+|sub_raid_[0-9]+)$';
    when 'siege' then
      v_visibility_key := 'siege';
      v_update_key := 'siege';
      v_assignment_pattern := '^siege_(main_|sub_)';
      v_raid_pattern := '^siege_(raid_[0-9]+|sub_raid_[0-9]+)$';
      v_siege_raid_groups := coalesce(v_state->'siegeRaidGroups', '{}'::jsonb);
    when 'polarity' then
      v_visibility_key := 'polarityZone';
      v_update_key := 'polarityZone';
      v_assignment_pattern := '^(elite_|dungeon[0-9]+_)';
      v_raid_pattern := '^pz_';
  end case;

  v_published := coalesce((v_state #>> array['publicVisibility', v_visibility_key])::boolean, false);
  v_event_updated_at := coalesce(nullif(v_state #>> array['eventUpdates', v_update_key, 'updatedAt'], ''), v_row_updated_at::text, '');
  v_event_updated_by := coalesce(v_state #>> array['eventUpdates', v_update_key, 'updatedBy'], '');

  if not v_published then
    return jsonb_build_object(
      'published', false,
      'roster', '[]'::jsonb,
      'assignments', '{}'::jsonb,
      'raidTeamNames', '{}'::jsonb,
      'raidCommanders', '{}'::jsonb,
      'raidLeaders', '{}'::jsonb,
      'raidModes', '{}'::jsonb,
      'siegeRaidGroups', '{}'::jsonb,
      'finishedDungeons', '[]'::jsonb,
      'preAttendance', '{}'::jsonb,
      'revision', v_revision,
      'updatedAt', v_event_updated_at,
      'updatedBy', v_event_updated_by
    );
  end if;

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    into v_assignments
  from jsonb_each(coalesce(v_state->'assignments', '{}'::jsonb)) e
  where e.key ~ v_assignment_pattern;

  select coalesce(array_agg(distinct x.member_name) filter (where x.member_name is not null and x.member_name <> ''), array[]::text[])
    into v_used_names
  from (
    select jsonb_array_elements_text(e.value) as member_name
    from jsonb_each(v_assignments) e
    where jsonb_typeof(e.value) = 'array'
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
      'name', m.item->>'name',
      'cls', coalesce(nullif(m.item->>'cls', ''), 'Unknown'),
      'title', coalesce((
        select d.title
        from public.member_csv_data d
        where d.member_id = m.item->>'id'
        limit 1
      ), '')
    ) order by m.ord), '[]'::jsonb)
    into v_roster
  from jsonb_array_elements(coalesce(v_state->'roster', '[]'::jsonb)) with ordinality as m(item, ord)
  where (m.item->>'name') = any(v_used_names);

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    into v_raid_team_names
  from jsonb_each(coalesce(v_state->'raidTeamNames', '{}'::jsonb)) e
  where e.key ~ v_raid_pattern;

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    into v_raid_commanders
  from jsonb_each(coalesce(v_state->'raidCommanders', '{}'::jsonb)) e
  where e.key ~ v_raid_pattern;

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    into v_raid_leaders
  from jsonb_each(coalesce(v_state->'raidLeaders', '{}'::jsonb)) e
  where e.key ~ v_raid_pattern;

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    into v_raid_modes
  from jsonb_each(coalesce(v_state->'raidModes', '{}'::jsonb)) e
  where e.key ~ v_raid_pattern;

  if v_view = 'polarity' then
    v_finished_dungeons := coalesce(v_state->'finishedDungeons', '[]'::jsonb);
  end if;

  -- Resolve the same upcoming attendance event used by the management planner.
  if v_view = 'guild' then
    v_next_tuesday := v_today + ((2 - extract(dow from v_today)::int + 7) % 7);
    v_next_thursday := v_today + ((4 - extract(dow from v_today)::int + 7) % 7);
    if v_next_tuesday <= v_next_thursday then
      v_attendance_type := 'guild_league_tuesday';
      v_attendance_date := v_next_tuesday;
    else
      v_attendance_type := 'guild_league_thursday';
      v_attendance_date := v_next_thursday;
    end if;
  elsif v_view = 'siege' then
    v_next_sunday := v_today + ((0 - extract(dow from v_today)::int + 7) % 7);
    v_attendance_type := 'siege';
    v_attendance_date := v_next_sunday;
  end if;

  if v_attendance_type is not null and to_regclass('public.attendance_events') is not null and to_regclass('public.attendance_records') is not null then
    select ae.id
      into v_attendance_event_id
    from public.attendance_events ae
    where ae.event_type = v_attendance_type
      and ae.event_date = v_attendance_date
    limit 1;

    if v_attendance_event_id is not null then
      select coalesce(jsonb_object_agg(ar.member_name, ar.pre_status), '{}'::jsonb)
        into v_pre_attendance
      from public.attendance_records ar
      where ar.event_id = v_attendance_event_id
        and ar.member_name = any(v_used_names)
        and ar.pre_status in ('no_response','going','not_going');
    end if;
  end if;

  return jsonb_build_object(
    'published', true,
    'roster', v_roster,
    'assignments', v_assignments,
    'raidTeamNames', v_raid_team_names,
    'raidCommanders', v_raid_commanders,
    'raidLeaders', v_raid_leaders,
    'raidModes', v_raid_modes,
    'siegeRaidGroups', v_siege_raid_groups,
    'guildRaidGroups', case when v_view = 'guild' then v_state->'guildRaidGroups' else null end,
    'finishedDungeons', v_finished_dungeons,
    'preAttendance', v_pre_attendance,
    'attendanceEventType', coalesce(v_attendance_type, ''),
    'attendanceEventDate', coalesce(v_attendance_date::text, ''),
    'revision', v_revision,
    'updatedAt', v_event_updated_at,
    'updatedBy', v_event_updated_by
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_raid_mode_setting(p_raid_id text, p_mode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_state jsonb;
  v_modes jsonb;
  v_mode text;
  v_revision bigint;
  v_updated_at timestamptz;
begin
  if nullif(btrim(coalesce(p_raid_id,'')), '') is null then
    raise exception 'INVALID_RAID_ID';
  end if;

  v_mode := case when p_raid_id in ('raid_1','raid_2','raid_3','raid_4','raid_5') and upper(coalesce(p_mode,'')) = 'MVP' then 'MVP' when upper(coalesce(p_mode,'')) = 'DEF' then 'DEF' else 'ATK' end;

  select state into v_state
  from public.planner_state
  where id = 1
  for update;

  v_state := coalesce(v_state, '{}'::jsonb);
  v_modes := coalesce(v_state -> 'raidModes', '{}'::jsonb);
  v_modes := jsonb_set(v_modes, array[p_raid_id], to_jsonb(v_mode), true);
  v_state := jsonb_set(v_state, '{raidModes}', v_modes, true);

  update public.planner_state
  set state = v_state,
      revision = revision + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where id = 1
  returning revision, updated_at into v_revision, v_updated_at;

  return jsonb_build_object(
    'revision', v_revision,
    'updatedAt', v_updated_at,
    'raidId', p_raid_id,
    'mode', v_mode
  );
end;
$function$
;
notify pgrst, 'reload schema';
commit;
