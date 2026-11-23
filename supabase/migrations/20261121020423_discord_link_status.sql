-- Lightweight profile badge; the Cloudflare Durable Object remains authoritative
-- for the Discord user/member relationship and account details.
create table public.member_discord_link_status (
  member_id text primary key,
  linked boolean not null,
  updated_at timestamptz not null default now()
);

alter table public.member_discord_link_status enable row level security;

revoke all on public.member_discord_link_status from public, anon, authenticated;
grant select on public.member_discord_link_status to authenticated;
grant select, insert, update, delete on public.member_discord_link_status to service_role;

create policy member_discord_link_status_select_approved
on public.member_discord_link_status
for select to authenticated
using ((select public.current_user_approved()));
