-- Extend the existing public lineup gate to Guild League without changing Siege.
create or replace function public.get_public_lineup(p_view text, p_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_code text;
  code_key text;
begin
  case lower(trim(coalesce(p_view, '')))
    when 'siege' then code_key := 'siegeCode';
    when 'guild' then code_key := 'guildLeagueCode';
    else code_key := null;
  end case;

  if code_key is not null then
    select coalesce(state #>> array['publicVisibility', code_key], '')
      into current_code
      from public.planner_state
      where id = 1;
    -- Existing base URLs continue until their first coded publication.
    if coalesce(current_code, '') <> '' and
       (p_code is null or p_code !~ '^[A-Za-z0-9]{15}$' or p_code <> current_code) then
      return jsonb_build_object('published', false, 'roster', '[]'::jsonb,
        'assignments', '{}'::jsonb, 'raidTeamNames', '{}'::jsonb,
        'raidCommanders', '{}'::jsonb, 'raidLeaders', '{}'::jsonb,
        'raidModes', '{}'::jsonb, 'siegeRaidGroups', '{}'::jsonb,
        'finishedDungeons', '[]'::jsonb, 'preAttendance', '{}'::jsonb,
        'revision', 0, 'updatedAt', '');
    end if;
  end if;
  return public.get_public_lineup_internal(p_view);
end;
$$;

revoke all on function public.get_public_lineup(text,text) from public, anon, authenticated;
grant execute on function public.get_public_lineup(text,text) to anon, authenticated;
notify pgrst, 'reload schema';
