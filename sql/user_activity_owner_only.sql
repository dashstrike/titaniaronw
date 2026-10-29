begin;
drop policy if exists user_presence_admin_read on public.user_presence;
drop policy if exists user_presence_owner_read on public.user_presence;
create policy user_presence_owner_read on public.user_presence for select to authenticated
  using ((select public.can_view_login_history()));
commit;
