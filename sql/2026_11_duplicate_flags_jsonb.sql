-- duplicate_flags is jsonb in the live database.
-- The booking function was still inserting a text[].
-- Run this once in the Supabase SQL editor.

begin;

drop function if exists public.submit_household_booking(
  text, text, text, text, text, text, jsonb, text[]
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'duplicate_flags'
      and udt_name = '_text'
  ) then
    alter table public.households
      alter column duplicate_flags type jsonb
      using to_jsonb(duplicate_flags);
  end if;
end $$;

alter table public.households
  alter column duplicate_flags set default '[]'::jsonb;

create or replace function public.submit_household_booking(
  p_full_name text,
  p_whatsapp_number text,
  p_category text,
  p_church_unit_or_referee text,
  p_home_address text,
  p_device_hash text,
  p_items jsonb,
  p_duplicate_flags jsonb default '[]'::jsonb
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
    coalesce(p_duplicate_flags, '[]'::jsonb),
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
      product_name,
      quantity,
      ticket_unit_price,
      status
    ) values (
      v_household_id,
      v_product.id,
      coalesce(nullif(v_item.elem->>'product_name', ''), v_product.name),
      v_qty,
      v_product.ticket_price,
      'RESERVED'
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
  text, text, text, text, text, text, jsonb, jsonb
) to anon, authenticated;

commit;
