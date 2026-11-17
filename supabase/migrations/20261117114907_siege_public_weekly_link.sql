-- Keep the existing projection private; the public wrapper checks Siege's current link.
alter function public.get_public_lineup(text) rename to get_public_lineup_internal;
revoke all on function public.get_public_lineup_internal(text) from public, anon, authenticated;

create function public.get_public_lineup(p_view text, p_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_code text;
begin
  if lower(trim(coalesce(p_view, ''))) = 'siege' then
    select coalesce(state #>> '{publicVisibility,siegeCode}', '')
      into current_code
      from public.planner_state
      where id = 1;
    -- Before the first new publication, preserve the existing public Siege URL.
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
