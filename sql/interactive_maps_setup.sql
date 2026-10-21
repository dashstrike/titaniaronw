create table if not exists public.interactive_maps (
  map_key text primary key check (map_key in ('gl_main', 'gl_sub', 'siege_outer', 'siege_inner', 'siege_emp_room')),
  layout jsonb not null default '{"version":1,"background":"","items":[]}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.interactive_maps (map_key)
values ('gl_main'), ('gl_sub'), ('siege_outer'), ('siege_inner'), ('siege_emp_room')
on conflict (map_key) do nothing;

alter table public.interactive_maps enable row level security;

drop policy if exists interactive_maps_select_approved on public.interactive_maps;
create policy interactive_maps_select_approved
on public.interactive_maps
for select
to authenticated
using (public.current_user_approved());

drop policy if exists interactive_maps_insert_organizer on public.interactive_maps;
create policy interactive_maps_insert_organizer
on public.interactive_maps
for insert
to authenticated
with check (public.current_user_role() in ('party_organizer', 'admin'));

drop policy if exists interactive_maps_update_organizer on public.interactive_maps;
create policy interactive_maps_update_organizer
on public.interactive_maps
for update
to authenticated
using (public.current_user_role() in ('party_organizer', 'admin'))
with check (public.current_user_role() in ('party_organizer', 'admin'));

drop policy if exists interactive_maps_delete_admin on public.interactive_maps;
create policy interactive_maps_delete_admin
on public.interactive_maps
for delete
to authenticated
using (public.current_user_role() = 'admin');

revoke all on public.interactive_maps from anon;
grant select, insert, update on public.interactive_maps to authenticated;
