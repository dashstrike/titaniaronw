-- Run after user_activity_setup.sql. Existing history and owner-only RLS stay intact.
begin;
alter table public.user_login_history add column if not exists logged_out_at timestamptz;
create index if not exists user_login_history_latest_idx on public.user_login_history(user_id,signed_in_at desc,session_id);

-- The client calls this with its original signed JWT after signOut succeeds.
-- PostgREST still verifies the JWT; this endpoint then requires the session to
-- have actually been removed. It can only update that token's own history row.
create or replace function public.record_user_logout() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sid uuid := nullif(auth.jwt()->>'session_id','')::uuid;
begin
  if v_uid is null or v_sid is null then raise exception 'A signed-in token is required' using errcode='42501'; end if;
  if exists(select 1 from auth.sessions s where s.id=v_sid) then
    raise exception 'Session is still signed in' using errcode='42501';
  end if;
  update public.user_login_history set logged_out_at=now()
    where session_id=v_sid and user_id=v_uid and logged_out_at is null;
end;
$$;
revoke all on function public.record_user_logout() from public,anon;
grant execute on function public.record_user_logout() to authenticated;

create or replace function public.get_latest_user_logins()
returns table(user_id uuid,display_name text,signed_in_at timestamptz,logged_out_at timestamptz)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not coalesce(public.can_view_login_history(),false) then
    raise exception 'Only DASH can view login history' using errcode='42501';
  end if;
  return query
    select latest.user_id,latest.display_name,latest.signed_in_at,latest.logged_out_at
    from (
      select distinct on (h.user_id) h.user_id,coalesce(p.display_name,h.display_name) as display_name,h.signed_in_at,h.logged_out_at
      from public.user_login_history h left join public.profiles p on p.id=h.user_id
      where h.user_id is not null
      order by h.user_id,h.signed_in_at desc,h.session_id
    ) latest order by latest.signed_in_at desc;
end;
$$;
revoke all on function public.get_latest_user_logins() from public,anon;
grant execute on function public.get_latest_user_logins() to authenticated;
commit;
