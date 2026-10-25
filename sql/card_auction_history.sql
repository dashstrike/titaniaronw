-- Run after card_auction_setup.sql (or the existing ongoing/ducks upgrades).
begin;
create table public.card_auction_history (
  registration_id uuid primary key,
  member_id text not null,
  card_id text not null,
  ducks integer not null check (ducks >= 1),
  registered_at timestamptz not null,
  received_at timestamptz not null default now(),
  received_by uuid not null references auth.users(id)
);
create index card_auction_history_member_idx on public.card_auction_history(member_id, received_at desc);
alter table public.card_auction_history enable row level security;
revoke all on public.card_auction_history from anon,authenticated;

create or replace function public.remove_card_auction_registration(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  card_key text;
  registration public.card_auction_registrations%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved and role='admin') then
    raise exception 'Auction admin access is required.' using errcode='42501';
  end if;
  select card_id into card_key from public.card_auction_registrations where id=p_id;
  if card_key is null then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(728541,pg_catalog.hashtext(card_key));
  delete from public.card_auction_registrations where id=p_id returning * into registration;
  if found then
    insert into public.card_auction_history(registration_id,member_id,card_id,ducks,registered_at,received_by)
      values(registration.id,registration.member_id,registration.card_id,registration.ducks,registration.created_at,auth.uid());
    update public.card_auction_registrations set ducks=ducks+1 where card_id=card_key;
  end if;
end;
$$;

create function public.get_member_card_history(p_member_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and approved) then
    raise exception 'Approved Titania access is required.' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(h) order by coalesce(h.received_at,h.registered_at) desc) from (
    select id as registration_id,card_id,ducks,created_at as registered_at,null::timestamptz as received_at,'registered'::text as status
      from public.card_auction_registrations where member_id=p_member_id
    union all
    select registration_id,card_id,ducks,registered_at,received_at,'received'::text
      from public.card_auction_history where member_id=p_member_id
  ) h),'[]'::jsonb);
end;
$$;
revoke all on function public.get_member_card_history(text) from public,anon,authenticated;
grant execute on function public.get_member_card_history(text) to authenticated;
revoke all on function public.remove_card_auction_registration(uuid) from public,anon,authenticated;
grant execute on function public.remove_card_auction_registration(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
