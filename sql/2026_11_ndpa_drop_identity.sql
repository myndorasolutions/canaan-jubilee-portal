-- NDPA data minimization.
-- Run this script once in the Supabase SQL editor.
-- It removes NIN / voter ID and selfie storage from households.
-- Existing values in those columns are deleted.

begin;

create or replace function public.submit_household_booking(
  p_full_name text,
  p_whatsapp_number text,
  p_category text,
  p_church_unit_or_referee text,
  p_home_address text,
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
    category,
    church_unit_or_referee,
    home_address,
    device_hash,
    duplicate_flags,
    status,
    expires_at
  ) values (
    v_reference,
    p_full_name,
    p_whatsapp_number,
    p_category,
    p_church_unit_or_referee,
    p_home_address,
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
  text, text, text, text, text, text, jsonb, text[]
) to anon, authenticated;

drop function if exists public.submit_household_booking(
  text, text, text, text, text, text, text, text, jsonb
);

drop function if exists public.submit_household_booking(
  text, text, text, text, text, text, text, text, text[], jsonb
);

drop function if exists public.submit_household_booking(
  text, text, text, text, text, text, text, text, jsonb, text[]
);

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
    'category', v_row.category,
    'churchUnitOrReferee', v_row.church_unit_or_referee,
    'homeAddress', v_row.home_address,
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

alter table public.households drop column if exists nin_or_voter_id;
alter table public.households drop column if exists selfie_url;

commit;
