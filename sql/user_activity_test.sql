-- Run as postgres in SQL Editor. Uses existing sessions but rolls back every write.
begin;
select set_config('test.owner_uid','ed644b6b-9626-4c53-a183-227f67983e6f',true);
select set_config('test.owner_sid',(select id::text from auth.sessions where user_id=current_setting('test.owner_uid')::uuid and (not_after is null or not_after>now()) order by created_at desc limit 1),true);
select set_config('test.other_uid',(select id::text from public.profiles where approved and role='admin' and id<>current_setting('test.owner_uid')::uuid limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.owner_uid'),'session_id',current_setting('test.owner_sid'),'role','authenticated')::text,true);
set local role authenticated;
select public.record_user_activity('users');
select public.record_user_activity('users');
do $$ begin
  if not public.can_view_login_history() then raise exception 'DASH history permission failed'; end if;
  if (select count(*) from public.user_login_history where session_id=current_setting('test.owner_sid')::uuid)<>1 then raise exception 'Session deduplication failed'; end if;
  if not exists(select 1 from public.get_online_users() where user_id=current_setting('test.owner_uid')::uuid) then raise exception 'Presence not visible to admin'; end if;
end $$;
-- Another admin cannot read presence or history, including through the API.
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.other_uid'),'role','authenticated')::text,true);
do $$ begin
  if public.can_view_login_history() then raise exception 'Another admin was granted history permission'; end if;
  if exists(select 1 from public.user_login_history) then raise exception 'History leaked to another admin'; end if;
  if exists(select 1 from public.get_online_users()) then raise exception 'Presence leaked to another admin'; end if;
  if exists(select 1 from public.user_presence) then raise exception 'Presence table leaked to another admin'; end if;
  begin
    perform public.record_user_activity('users');
    raise exception 'Missing session accepted';
  exception when insufficient_privilege then null; end;
end $$;
-- A genuine session belonging to someone else must not be accepted.
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.other_uid'),'session_id',current_setting('test.owner_sid'),'role','authenticated')::text,true);
do $$ begin
  begin
    perform public.record_user_activity('users');
    raise exception 'Wrong user/session pair accepted';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform public.record_user_activity('users');
    raise exception 'Anonymous tracking accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.user_login_history;
    raise exception 'Anonymous history read accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Old presence must not count as online, even when its auth session persists.
update public.user_presence set last_seen_at=now()-interval '3 minutes' where user_id=current_setting('test.owner_uid')::uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.owner_uid'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.get_online_users() where user_id=current_setting('test.owner_uid')::uuid) then raise exception 'Stale presence counted as online'; end if;
end $$;
select 'Owner-only history and presence, deduplication, session validation and expiry checks passed' as result;
rollback;
