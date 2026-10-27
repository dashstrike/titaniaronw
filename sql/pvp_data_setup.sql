-- Titania uses the existing Supabase backend. Execute this raw SQL once.
-- Each row is an atomic, complete CSV snapshot for one date/time/battlefield.
begin;
create table public.pvp_battles (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('guild_league','siege')),
  battle_date date not null,
  battle_time time(0) without time zone not null check (battle_time < time '24:00' and extract(second from battle_time) = 0),
  battlefield text not null check (battlefield in ('main','sub')),
  source_file text not null,
  players jsonb not null check (jsonb_typeof(players) = 'array' and jsonb_array_length(players) between 1 and 1000),
  imported_by uuid references auth.users(id) on delete set null default auth.uid(),
  imported_at timestamptz not null default now(),
  unique (category,battle_date,battle_time,battlefield)
);
alter table public.pvp_battles enable row level security;
revoke all on public.pvp_battles from anon, authenticated;
grant select, insert, update on public.pvp_battles to authenticated;
create policy pvp_read on public.pvp_battles for select to authenticated
  using ((select public.current_user_approved()));
create policy pvp_insert on public.pvp_battles for insert to authenticated
  with check ((select public.current_user_role()) = 'admin' and imported_by = (select auth.uid()));
create policy pvp_update on public.pvp_battles for update to authenticated
  using ((select public.current_user_role()) = 'admin')
  with check ((select public.current_user_role()) = 'admin' and imported_by = (select auth.uid()));
commit;
