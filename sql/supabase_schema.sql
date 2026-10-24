-- Canaan Jubilee Auction Portal
-- Run this whole script in the Supabase SQL Editor.
--
-- The public site reads public_products_view and public_settings_view.
-- Those views omit total_stock, booked_stock, subsidized_item_cost,
-- and admin_password_hash.
--
-- The admin screen in this milestone uses the anon key from the browser.
-- The policies below allow that key to manage products so localhost can
-- sync before staff accounts exist. Replace the "browser_manage_*"
-- policies with authenticated staff policies before a public launch.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  image_url text,
  ticket_price numeric not null check (ticket_price >= 0),
  subsidized_item_cost numeric check (subsidized_item_cost is null or subsidized_item_cost >= 0),
  total_stock integer not null default 0 check (total_stock >= 0),
  booked_stock integer not null default 0 check (booked_stock >= 0),
  max_per_household integer not null default 1 check (max_per_household >= 1),
  allow_non_members boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (booked_stock <= total_stock)
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  full_name text not null,
  whatsapp_number text not null unique,
  nin_or_voter_id text not null unique,
  category text not null check (category in ('MEMBER', 'GUEST')),
  church_unit_or_referee text,
  home_address text,
  selfie_url text,
  device_hash text,
  duplicate_flags text[] not null default '{}',
  status text not null default 'PENDING_VERIFICATION'
    check (status in (
      'PENDING_VERIFICATION',
      'ACCREDITED',
      'PAID_ISSUED',
      'EXPIRED',
      'REJECTED'
    )),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  created_at timestamptz not null default now()
);

alter table public.households
  add column if not exists duplicate_flags text[] not null default '{}';

alter table public.households
  add column if not exists whatsapp_initiated boolean not null default false;

alter table public.households
  add column if not exists verification_hash text not null default '';

alter table public.households
  add column if not exists pickup_batch text not null default '';

alter table public.households
  add column if not exists rejection_reason text not null default '';

alter table public.households
  add column if not exists admin_note text not null default '';

alter table public.households
  add column if not exists paid_at timestamptz;

alter table public.households
  add column if not exists payment_method text;

alter table public.households
  add column if not exists issued_by text not null default '';

create table if not exists public.booking_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  ticket_unit_price numeric not null check (ticket_unit_price >= 0),
  subsidized_unit_price numeric,
  status text not null default 'HELD',
  unique (household_id, product_id)
);

alter table public.booking_items
  add column if not exists subsidized_unit_price numeric;

create table if not exists public.system_settings (
  id integer primary key default 1 check (id = 1),
  program_title text not null default 'Canaan Jubilee Auction Portal',
  reply_window_hours integer not null default 72 check (reply_window_hours > 0),
  booking_open boolean not null default true,
  whatsapp_desk_number text not null default '2348000000000',
  church_payment_instructions text not null default 'After accreditation, pay the total ticket fee at the Canaan Ministries church desk and collect your physical tickets during your assigned pickup batch. Bring this confirmation slip and a photo ID that matches the head of household.',
  pickup_batches text[] not null default array[
    'Batch A: 9:00 AM - 11:00 AM',
    'Batch B: 11:00 AM - 1:00 PM',
    'Batch C: 1:00 PM - 3:00 PM'
  ],
  admin_password_hash text
);

alter table public.system_settings
  add column if not exists church_payment_instructions text not null default 'After accreditation, pay the total ticket fee at the Canaan Ministries church desk and collect your physical tickets during your assigned pickup batch. Bring this confirmation slip and a photo ID that matches the head of household.';

alter table public.system_settings
  add column if not exists pickup_batches text[] not null default array[
    'Batch A: 9:00 AM - 11:00 AM',
    'Batch B: 11:00 AM - 1:00 PM',
    'Batch C: 1:00 PM - 3:00 PM'
  ];

update public.system_settings
set whatsapp_desk_number = '2348000000000'
where id = 1
  and coalesce(whatsapp_desk_number, '') = '';

insert into public.system_settings (id)
values (1)
on conflict (id) do nothing;

create or replace view public.public_products_view
with (security_invoker = false) as
select
  id,
  name,
  category,
  image_url,
  ticket_price,
  max_per_household,
  allow_non_members,
  is_active,
  (total_stock - booked_stock) > 0 as is_available
from public.products;

create or replace view public.public_settings_view
with (security_invoker = false) as
select
  id,
  program_title,
  reply_window_hours,
  booking_open,
  whatsapp_desk_number,
  church_payment_instructions,
  pickup_batches
from public.system_settings
where id = 1;

grant select on public.public_products_view to anon, authenticated;
grant select on public.public_settings_view to anon, authenticated;

alter table public.products enable row level security;
alter table public.households enable row level security;
alter table public.booking_items enable row level security;
alter table public.system_settings enable row level security;

drop policy if exists browser_manage_products on public.products;
create policy browser_manage_products
on public.products
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists browser_manage_settings on public.system_settings;
create policy browser_manage_settings
on public.system_settings
for all
to anon, authenticated
using (true)
with check (true);

-- Testing policies so the admin preview can read bookings from the browser.
-- Replace these before a public launch.
drop policy if exists browser_manage_households on public.households;
create policy browser_manage_households
on public.households
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists browser_manage_booking_items on public.booking_items;
create policy browser_manage_booking_items
on public.booking_items
for all
to anon, authenticated
using (true)
with check (true);

drop function if exists public.submit_household_booking(
  text, text, text, text, text, text, text, text, jsonb
);

drop function if exists public.submit_household_booking(
  text, text, text, text, text, text, text, text, text[], jsonb
);

create or replace function public.submit_household_booking(
  p_full_name text,
  p_whatsapp_number text,
  p_nin_or_voter_id text,
  p_category text,
  p_church_unit_or_referee text,
  p_home_address text,
  p_selfie_url text,
  p_device_hash text,
  p_items jsonb,
  p_duplicate_flags text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_reference text;
  v_expires timestamptz;
  v_hours integer;
  v_item record;
  v_product public.products%rowtype;
  v_qty integer;
  v_product_id uuid;
  v_attempts integer := 0;
  v_seen uuid[] := array[]::uuid[];
  v_existing text;
begin
  if p_category not in ('MEMBER', 'GUEST') then
    raise exception 'Category must be MEMBER or GUEST';
  end if;

  select reference_code
  into v_existing
  from public.households
  where whatsapp_number = p_whatsapp_number
    and status <> 'REJECTED'
  limit 1;

  if v_existing is not null then
    raise exception 'WHATSAPP:%', v_existing;
  end if;

  if exists (
    select 1 from public.households
    where nin_or_voter_id = p_nin_or_voter_id
      and status <> 'REJECTED'
  ) then
    raise exception 'NIN_DUPLICATE';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception 'Choose at least one item';
  end if;

  select coalesce(reply_window_hours, 72)
  into v_hours
  from public.system_settings
  where id = 1;

  v_hours := coalesce(v_hours, 72);

  loop
    v_attempts := v_attempts + 1;
    v_reference := 'CJA-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (
      select 1 from public.households where reference_code = v_reference
    );
    if v_attempts > 20 then
      raise exception 'Could not create a reference code';
    end if;
  end loop;

  insert into public.households (
    reference_code,
    full_name,
    whatsapp_number,
    nin_or_voter_id,
    category,
    church_unit_or_referee,
    home_address,
    selfie_url,
    device_hash,
    duplicate_flags,
    status,
    expires_at
  ) values (
    v_reference,
    p_full_name,
    p_whatsapp_number,
    p_nin_or_voter_id,
    p_category,
    p_church_unit_or_referee,
    p_home_address,
    p_selfie_url,
    p_device_hash,
    coalesce(p_duplicate_flags, array[]::text[]),
    'PENDING_VERIFICATION',
    now() + make_interval(hours => v_hours)
  )
  returning id, expires_at into v_household_id, v_expires;

  for v_item in
    select elem
    from jsonb_array_elements(p_items) as elem
  loop
    v_qty := (v_item.elem->>'quantity')::integer;
    v_product_id := (v_item.elem->>'product_id')::uuid;

    if v_qty is null or v_qty < 1 then
      raise exception 'Quantity must be at least 1';
    end if;

    if v_product_id = any (v_seen) then
      raise exception 'Each item can be booked only once per household';
    end if;
    v_seen := array_append(v_seen, v_product_id);

    select *
    into v_product
    from public.products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'An item in this booking no longer exists';
    end if;

    if not v_product.is_active then
      raise exception '% is not available', v_product.name;
    end if;

    if p_category = 'GUEST' and not v_product.allow_non_members then
      raise exception '% is for church members only', v_product.name;
    end if;

    if v_qty > v_product.max_per_household then
      raise exception 'Too many tickets requested for %', v_product.name;
    end if;

    if v_qty > (v_product.total_stock - v_product.booked_stock) then
      raise exception '% is fully booked', v_product.name;
    end if;

    insert into public.booking_items (
      household_id,
      product_id,
      quantity,
      ticket_unit_price,
      status
    ) values (
      v_household_id,
      v_product.id,
      v_qty,
      v_product.ticket_price,
      'HELD'
    );

    update public.products
    set booked_stock = booked_stock + v_qty
    where id = v_product.id;
  end loop;

  return jsonb_build_object(
    'household_id', v_household_id,
    'reference_code', v_reference,
    'expires_at', v_expires
  );
end;
$$;

grant execute on function public.submit_household_booking(
  text, text, text, text, text, text, text, text, jsonb, text[]
) to anon, authenticated;

create or replace function public.lookup_household_booking(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := upper(trim(coalesce(p_query, '')));
  v_row public.households%rowtype;
  v_items jsonb;
begin
  if v_query = '' then
    return null;
  end if;

  v_query := regexp_replace(v_query, '^#', '');

  select *
  into v_row
  from public.households
  where reference_code = v_query
     or whatsapp_number = trim(p_query)
     or whatsapp_number = v_query
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'productId', bi.product_id,
        'productName', p.name,
        'quantity', bi.quantity,
        'ticketUnitPrice', bi.ticket_unit_price
      )
    ),
    '[]'::jsonb
  )
  into v_items
  from public.booking_items bi
  join public.products p on p.id = bi.product_id
  where bi.household_id = v_row.id;

  return jsonb_build_object(
    'id', v_row.id,
    'referenceCode', v_row.reference_code,
    'fullName', v_row.full_name,
    'whatsappNumber', v_row.whatsapp_number,
    'ninOrVoterId', v_row.nin_or_voter_id,
    'category', v_row.category,
    'churchUnitOrReferee', v_row.church_unit_or_referee,
    'homeAddress', v_row.home_address,
    'selfieDataUrl', v_row.selfie_url,
    'deviceHash', v_row.device_hash,
    'duplicateFlags', coalesce(to_jsonb(v_row.duplicate_flags), '[]'::jsonb),
    'items', v_items,
    'totalTicketFee', (
      select coalesce(sum(bi.quantity * bi.ticket_unit_price), 0)
      from public.booking_items bi
      where bi.household_id = v_row.id
    ),
    'status', v_row.status,
    'createdAt', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'whatsappInitiated', v_row.whatsapp_initiated,
    'verificationHash', v_row.verification_hash,
    'pickupBatch', v_row.pickup_batch,
    'rejectionReason', v_row.rejection_reason,
    'adminNote', v_row.admin_note,
    'paidAt', v_row.paid_at,
    'paymentMethod', v_row.payment_method,
    'issuedBy', v_row.issued_by
  );
end;
$$;

grant execute on function public.lookup_household_booking(text) to anon, authenticated;
