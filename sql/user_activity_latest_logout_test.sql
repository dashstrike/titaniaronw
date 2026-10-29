-- SQL Editor regression checks. All synthetic history rows are rolled back.
begin;
select set_config('test.owner_uid','ed644b6b-9626-4c53-a183-227f67983e6f',true);
select set_config('test.active_sid',(select id::text from auth.sessions where user_id=current_setting('test.owner_uid')::uuid and (not_after is null or not_after>now()) order by created_at desc limit 1),true);
select set_config('test.other_uid',(select id::text from public.profiles where approved and role='admin' and id<>current_setting('test.owner_uid')::uuid limit 1),true);
select set_config('test.old_sid',gen_random_uuid()::text,true);
select set_config('test.latest_sid',gen_random_uuid()::text,true);
insert into public.user_login_history(session_id,user_id,display_name,signed_in_at) values
  (current_setting('test.old_sid')::uuid,current_setting('test.owner_uid')::uuid,'Test owner',now()-interval '1 hour'),
  (current_setting('test.latest_sid')::uuid,current_setting('test.owner_uid')::uuid,'Test owner',now());
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.owner_uid'),'session_id',current_setting('test.active_sid'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  begin
    perform public.record_user_logout();
    raise exception 'Active session was incorrectly recorded as logged out';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.owner_uid'),'session_id',current_setting('test.latest_sid'),'role','authenticated')::text,true);
select public.record_user_logout();
do $$ begin
  if (select count(*) from public.get_latest_user_logins() where user_id=current_setting('test.owner_uid')::uuid)<>1 then raise exception 'History did not return exactly one row for the owner'; end if;
  if not exists(select 1 from public.get_latest_user_logins() where user_id=current_setting('test.owner_uid')::uuid and signed_in_at=now() and logged_out_at is not null) then raise exception 'Latest login or logout was not returned'; end if;
end $$;
-- Other admins cannot read latest history or mark someone else's logout.
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.other_uid'),'session_id',current_setting('test.old_sid'),'role','authenticated')::text,true);
select public.record_user_logout();
do $$ begin
  begin
    perform * from public.get_latest_user_logins();
    raise exception 'Another admin read latest login history';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.user_login_history where session_id=current_setting('test.old_sid')::uuid and logged_out_at is not null) then raise exception 'Another user forged the logout'; end if;
end $$;
select 'Latest-per-user history, confirmed logout and owner-only permissions passed' as result;
rollback;
