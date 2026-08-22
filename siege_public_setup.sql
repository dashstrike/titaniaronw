-- Titania Guild Management - add secure public support for the Siege lineup.
-- Run this once in Supabase SQL Editor after uploading the updated website files.
-- It replaces get_public_lineup(text) so Guild League, Siege, and Polarity Zone
-- each expose only their own published lineup data.

drop function if exists public.get_public_lineup(text);

create function public.get_public_lineup(p_view text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
  v_raid_leaders jsonb := '{}'::jsonb;
  v_raid_modes jsonb := '{}'::jsonb;
  v_roster jsonb := '[]'::jsonb;
  v_used_names text[] := array[]::text[];
  v_event_updated_at text := '';
  v_event_updated_by text := '';
  v_finished_dungeons jsonb := '[]'::jsonb;
begin
  if v_view not in ('guild', 'siege', 'polarity') then
    return jsonb_build_object(
      'published', false,
      'roster', '[]'::jsonb,
      'assignments', '{}'::jsonb,
      'raidLeaders', '{}'::jsonb,
      'raidModes', '{}'::jsonb,
      'finishedDungeons', '[]'::jsonb,
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
      'raidLeaders', '{}'::jsonb,
      'raidModes', '{}'::jsonb,
      'finishedDungeons', '[]'::jsonb,
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
    when 'polarity' then
      v_visibility_key := 'polarityZone';
      v_update_key := 'polarityZone';
      v_assignment_pattern := '^(elite_|dungeon[0-9]+_)';
      v_raid_pattern := '^pz_';
  end case;

  v_published := coalesce((v_state #>> array['publicVisibility', v_visibility_key])::boolean, false);
  v_event_updated_at := coalesce(nullif(v_state #>> array['eventUpdates', v_update_key, 'updatedAt'], ''), v_row_updated_at::text, '');
  v_event_updated_by := coalesce(v_state #>> array['eventUpdates', v_update_key, 'updatedBy'], '');

  -- When an event is private, return no lineup payload at all.
  if not v_published then
    return jsonb_build_object(
      'published', false,
      'roster', '[]'::jsonb,
      'assignments', '{}'::jsonb,
      'raidLeaders', '{}'::jsonb,
      'raidModes', '{}'::jsonb,
      'finishedDungeons', '[]'::jsonb,
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

  -- Only expose name + class for members who are actually present in this event.
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', m.item->>'name',
      'cls', coalesce(nullif(m.item->>'cls', ''), 'Unknown')
    ) order by m.ord), '[]'::jsonb)
    into v_roster
  from jsonb_array_elements(coalesce(v_state->'roster', '[]'::jsonb)) with ordinality as m(item, ord)
  where (m.item->>'name') = any(v_used_names);

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

  return jsonb_build_object(
    'published', true,
    'roster', v_roster,
    'assignments', v_assignments,
    'raidLeaders', v_raid_leaders,
    'raidModes', v_raid_modes,
    'finishedDungeons', v_finished_dungeons,
    'revision', v_revision,
    'updatedAt', v_event_updated_at,
    'updatedBy', v_event_updated_by
  );
end;
$$;

revoke all on function public.get_public_lineup(text) from public;
grant execute on function public.get_public_lineup(text) to anon, authenticated;
