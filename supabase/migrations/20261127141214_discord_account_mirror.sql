-- Private mirror for fast organizer mentions; bot storage owns account linking.
create table public.member_discord_accounts (
  member_id text primary key,
  discord_user_id text check (discord_user_id ~ '^[0-9]{17,20}$'),
  discord_username text,
  updated_at timestamptz not null default now(),
  check (discord_user_id is not null or discord_username is null)
);
alter table public.member_discord_accounts enable row level security;
revoke all on public.member_discord_accounts from public, anon, authenticated;
grant select on public.member_discord_accounts to authenticated;
grant select, insert, update, delete on public.member_discord_accounts to service_role;
create policy member_discord_accounts_organizer_read
on public.member_discord_accounts for select to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid())
  and approved and role in ('admin','party_organizer')));
