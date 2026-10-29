-- Titania Supabase: presence and login history for DASH only.
-- No auth tables or authentication settings are changed.
-- After this foundation, run user_activity_latest_logout.sql for latest-login/logout support.
begin;
create table public.user_presence (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  last_page text not null default ''
);
create index user_presence_seen_idx on public.user_presence(last_seen_at desc);
create index user_presence_user_idx on public.user_presence(user_id);
create table public.user_login_history (
  session_id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  signed_in_at timestamptz not null,
  recorded_at timestamptz not null default now()
);
create index user_login_history_time_idx on public.user_login_history(signed_in_at desc,session_id);
create index user_login_history_user_idx on public.user_login_history(user_id);
alter table public.user_presence enable row level security;
alter table public.user_login_history enable row level security;
revoke all on public.user_presence,public.user_login_history from anon,authenticated;
grant select on public.user_presence,public.user_login_history to authenticated;

create function public.can_view_login_history() returns boolean
language sql stable security invoker set search_path = '' as $$
  select auth.uid() = 'ed644b6b-9626-4c53-a183-227f67983e6f'::uuid
    and public.current_user_role() = 'admin';
$$;
revoke all on function public.can_view_login_history() from public,anon;
grant execute on function public.can_view_login_history() to authenticated;
create policy user_presence_owner_read on public.user_presence for select to authenticated
  using ((select public.can_view_login_history()));
create policy user_login_history_owner_read on public.user_login_history for select to authenticated
  using ((select public.can_view_login_history()));

-- This endpoint deliberately needs access to auth.sessions. Only the caller's
-- verified session is read; client-supplied IDs, names and timestamps are never used.
create function public.record_user_activity(p_page text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sid uuid := nullif(auth.jwt()->>'session_id','')::uuid;
  v_started timestamptz;
  v_name text;
  v_approved boolean;
begin
  if v_uid is null or v_sid is null then
    raise exception 'A signed-in session is required' using errcode='42501';
  end if;
  select s.created_at into v_started from auth.sessions s
    where s.id=v_sid and s.user_id=v_uid and (s.not_after is null or s.not_after>now());
  if not found then raise exception 'Session is no longer active' using errcode='42501'; end if;
  select coalesce(nullif(p.display_name,''),'Unnamed user'),p.approved into v_name,v_approved
    from public.profiles p where p.id=v_uid;
  if not found then return; end if;
  insert into public.user_login_history(session_id,user_id,display_name,signed_in_at)
    values(v_sid,v_uid,v_name,v_started) on conflict(session_id) do nothing;
  if v_approved then
    insert into public.user_presence(session_id,user_id,last_seen_at,last_page)
      values(v_sid,v_uid,now(),left(coalesce(p_page,''),120))
      on conflict(session_id) do update set last_seen_at=excluded.last_seen_at,last_page=excluded.last_page
      where public.user_presence.last_seen_at < now()-interval '30 seconds';
  end if;
end;
$$;
revoke all on function public.record_user_activity(text) from public,anon;
grant execute on function public.record_user_activity(text) to authenticated;
create function public.get_online_users()
returns table(user_id uuid,display_name text,last_seen_at timestamptz,last_page text)
language sql stable security invoker set search_path = '' as $$
  select distinct on (a.user_id) a.user_id,p.display_name,a.last_seen_at,a.last_page
  from public.user_presence a join public.profiles p on p.id=a.user_id
  where a.last_seen_at>now()-interval '2 minutes' and p.approved
  order by a.user_id,a.last_seen_at desc;
$$;
revoke all on function public.get_online_users() from public,anon;
grant execute on function public.get_online_users() to authenticated;
commit;
