-- Add MVP to Guild League main raids only. Existing data and permissions stay unchanged.
create or replace function public.save_raid_mode_setting(p_raid_id text, p_mode text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
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

  v_mode := case when p_raid_id in ('raid_1','raid_2','raid_3') and upper(coalesce(p_mode,'')) = 'MVP' then 'MVP' when upper(coalesce(p_mode,'')) = 'DEF' then 'DEF' else 'ATK' end;

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
$$;

grant execute on function public.save_raid_mode_setting(text,text) to authenticated;

