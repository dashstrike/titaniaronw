-- TITANIA PUBLIC VIEW SETUP
-- Run this once in Supabase Dashboard > SQL Editor.
-- It DOES NOT make planner_state public.
-- Anonymous users can only call get_public_lineup(), which returns lineup-safe fields.

create or replace function public.get_public_lineup()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ps as (
    select state, revision, updated_at
    from public.planner_state
    where id = 1
  ),
  assigned_names as (
    select distinct s.member_name
    from ps
    cross join lateral jsonb_each(coalesce(ps.state -> 'assignments', '{}'::jsonb)) a(team_key, slots)
    cross join lateral jsonb_array_elements_text(
      case when jsonb_typeof(a.slots) = 'array' then a.slots else '[]'::jsonb end
    ) s(member_name)
    where nullif(btrim(s.member_name), '') is not null
  ),
  public_roster as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', coalesce(m.member ->> 'name', ''),
          'cls', coalesce(nullif(m.member ->> 'cls', ''), 'Unknown'),
          'gr', coalesce(m.member -> 'gr', '0'::jsonb)
        ) order by lower(coalesce(m.member ->> 'name', ''))
      ),
      '[]'::jsonb
    ) as roster
    from ps
    cross join lateral jsonb_array_elements(coalesce(ps.state -> 'roster', '[]'::jsonb)) m(member)
    where coalesce(m.member ->> 'name', '') in (select member_name from assigned_names)
      and coalesce(lower(m.member ->> 'status'), 'active') <> 'inactive'
  )
  select jsonb_build_object(
    'roster', public_roster.roster,
    'assignments', coalesce(ps.state -> 'assignments', '{}'::jsonb),
    'raidLeaders', coalesce(ps.state -> 'raidLeaders', '{}'::jsonb),
    'raidModes', coalesce(ps.state -> 'raidModes', '{}'::jsonb),
    'finishedDungeons', coalesce(ps.state -> 'finishedDungeons', '[]'::jsonb),
    'revision', ps.revision,
    'updatedAt', ps.updated_at
  )
  from ps, public_roster;
$$;

revoke all on function public.get_public_lineup() from public;
grant execute on function public.get_public_lineup() to anon, authenticated;

-- planner_state remains private. No anon table permissions are granted here.
