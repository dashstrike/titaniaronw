CREATE OR REPLACE FUNCTION public.get_public_guild_runs()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'runs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', gr.id,
          'run_type', gr.run_type,
          'run_date', gr.run_date,
          'run_time', gr.run_time,
          'note', gr.note,
          'status', gr.status,
          'registrations', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'member_id', r.member_id,
                'registration_type', r.registration_type,
                'carry_status', r.carry_status
              )
              order by r.created_at
            )
            from public.guild_run_registrations r
            where r.run_id = gr.id
          ), '[]'::jsonb)
        )
        order by gr.run_date asc, gr.run_time asc nulls last, gr.created_at asc
      )
      from public.guild_runs gr
      where gr.status in ('open','closed')
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', member->>'id',
          'name', member->>'name',
          'cls', member->>'cls',
          'discord_linked', exists (select 1 from public.member_discord_link_status ds where ds.member_id=member->>'id' and ds.linked),
          'status', coalesce(member->>'status','active')
        )
        order by lower(member->>'name')
      )
      from public.planner_state ps
      cross join lateral jsonb_array_elements(coalesce(ps.state->'roster', '[]'::jsonb)) member
      where ps.id = 1
        and nullif(member->>'id', '') is not null
        and nullif(member->>'name', '') is not null
        and (
          lower(coalesce(member->>'status', 'active')) <> 'inactive'
          or exists (
            select 1
            from public.guild_run_registrations r
            join public.guild_runs gr on gr.id = r.run_id
            where r.member_id = member->>'id'
              and gr.status in ('open','closed')
          )
        )
    ), '[]'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.register_public_guild_run(p_run_id uuid, p_member_id text, p_registration_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_registration_type not in ('need_carry', 'carrier') then
    raise exception 'Invalid registration type.';
  end if;

  if not exists (
    select 1
    from public.guild_runs gr
    where gr.id = p_run_id
      and gr.status = 'open'
  ) then
    raise exception 'This guild run is not available for registration.';
  end if;

  if not exists (
    select 1
    from public.planner_state ps
    cross join lateral jsonb_array_elements(coalesce(ps.state->'roster', '[]'::jsonb)) member
    where ps.id = 1
      and member->>'id' = p_member_id
      and nullif(member->>'name', '') is not null
      and lower(coalesce(member->>'status', 'active')) <> 'inactive'
  ) then
    raise exception 'Player was not found in the active Titania roster.';
  end if;

  if not exists (select 1 from public.member_discord_link_status ds where ds.member_id=p_member_id and ds.linked) then
    raise exception 'No Discord link. Link your Discord account before registering.';
  end if;

  insert into public.guild_run_registrations (
    run_id,
    member_id,
    registration_type,
    created_by
  ) values (
    p_run_id,
    p_member_id,
    p_registration_type,
    null
  );
exception
  when unique_violation then
    raise exception 'This player is already registered for this run.' using errcode = '23505';
end;
$function$;
