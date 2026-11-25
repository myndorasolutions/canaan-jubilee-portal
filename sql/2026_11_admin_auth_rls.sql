-- Lock admin tables to signed-in Supabase users.
-- Public catalog reads stay on security_invoker = false views.
-- Public booking and slip lookup stay on SECURITY DEFINER functions.
-- Run this in the Supabase SQL Editor after sql/supabase_schema.sql.

begin;

drop policy if exists browser_manage_products on public.products;
drop policy if exists browser_manage_households on public.households;
drop policy if exists browser_manage_booking_items on public.booking_items;
drop policy if exists browser_manage_settings on public.system_settings;

alter table public.products enable row level security;
alter table public.households enable row level security;
alter table public.booking_items enable row level security;
alter table public.system_settings enable row level security;

revoke all on table public.products from anon;
revoke all on table public.households from anon;
revoke all on table public.booking_items from anon;
revoke all on table public.system_settings from anon;

revoke all on table public.products from public;
revoke all on table public.households from public;
revoke all on table public.booking_items from public;
revoke all on table public.system_settings from public;

revoke all on table public.products from authenticated;
grant select, insert, update, delete on table public.products to authenticated;

revoke all on table public.households from authenticated;
grant select, update on table public.households to authenticated;

revoke all on table public.booking_items from authenticated;
grant select, update on table public.booking_items to authenticated;

revoke all on table public.system_settings from authenticated;
grant select, insert, update on table public.system_settings to authenticated;

drop policy if exists authenticated_manage_products on public.products;
create policy authenticated_manage_products
on public.products
for all
to authenticated
using (true)
with check (true);

drop policy if exists authenticated_read_households on public.households;
create policy authenticated_read_households
on public.households
for select
to authenticated
using (true);

drop policy if exists authenticated_update_households on public.households;
create policy authenticated_update_households
on public.households
for update
to authenticated
using (true)
with check (true);

drop policy if exists authenticated_read_booking_items on public.booking_items;
create policy authenticated_read_booking_items
on public.booking_items
for select
to authenticated
using (true);

drop policy if exists authenticated_update_booking_items on public.booking_items;
create policy authenticated_update_booking_items
on public.booking_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists authenticated_read_settings on public.system_settings;
create policy authenticated_read_settings
on public.system_settings
for select
to authenticated
using (true);

drop policy if exists authenticated_insert_settings on public.system_settings;
create policy authenticated_insert_settings
on public.system_settings
for insert
to authenticated
with check (true);

drop policy if exists authenticated_update_settings on public.system_settings;
create policy authenticated_update_settings
on public.system_settings
for update
to authenticated
using (true)
with check (true);

alter view public.public_products_view set (security_invoker = false);
alter view public.public_settings_view set (security_invoker = false);

grant select on public.public_products_view to anon, authenticated;
grant select on public.public_settings_view to anon, authenticated;

alter function public.submit_household_booking(
  text, text, text, text, text, text, jsonb, jsonb
) security definer;

grant execute on function public.submit_household_booking(
  text, text, text, text, text, text, jsonb, jsonb
) to anon, authenticated;

alter function public.lookup_household_booking(text) security definer;

grant execute on function public.lookup_household_booking(text) to anon, authenticated;

create or replace function public.set_household_verification_hash(
  p_household_id uuid,
  p_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_household_id is null then
    return;
  end if;
  if p_hash is null or length(trim(p_hash)) = 0 or length(p_hash) > 128 then
    raise exception 'invalid verification hash';
  end if;

  update public.households
  set verification_hash = trim(p_hash)
  where id = p_household_id
    and coalesce(verification_hash, '') = '';
end;
$$;

revoke all on function public.set_household_verification_hash(uuid, text) from public;
grant execute on function public.set_household_verification_hash(uuid, text) to anon, authenticated;

commit;
