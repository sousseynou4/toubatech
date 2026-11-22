-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 004 BOUTIQUE, PRODUITS, STOCKS, COMMANDES
-- Le stock vit sur les variantes. Il ne change QUE via stock_movements
-- (trigger), ce qui garantit un historique complet et des quantités >= 0.
-- ════════════════════════════════════════════════════════════════════════════

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute function public.set_updated_at();

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(name) between 2 and 160),
  brand text,
  short_description text,
  description text,
  image_id uuid references public.media_assets(id) on delete set null,
  status public.config_status not null default 'to_configure',
  is_online boolean not null default true,       -- visible sur la boutique en ligne
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id, sort_order);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_audit_products after update or delete on public.products
  for each row execute function public.audit_trigger();

create table public.product_images (
  product_id uuid not null references public.products(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order int not null default 0,
  primary key (product_id, media_id)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null default 'Standard',         -- ex. « 18 pouces », « Teinte 02 »
  sku text unique,
  cost_price bigint check (cost_price >= 0),     -- prix d'achat
  sale_price bigint check (sale_price >= 0),     -- null = à configurer
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  alert_threshold int not null default 2 check (alert_threshold >= 0),
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id, sort_order);
create unique index product_variants_one_default on public.product_variants (product_id) where is_default;
create trigger trg_product_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger trg_audit_product_variants after update or delete on public.product_variants
  for each row execute function public.audit_trigger();

-- La quantité ne peut être modifiée que par le trigger des mouvements.
create or replace function public.guard_variant_stock() returns trigger
language plpgsql as $$
begin
  if new.stock_quantity is distinct from old.stock_quantity
     and coalesce(current_setting('dada.stock_tx', true), '') <> 'on' then
    raise exception 'STOCK_DIRECT_UPDATE_FORBIDDEN' using errcode = '42501',
      hint = 'Utilisez un mouvement de stock (historisé).';
  end if;
  return new;
end $$;
create trigger trg_variants_guard_stock before update on public.product_variants
  for each row execute function public.guard_variant_stock();

create or replace function public.guard_variant_initial_stock() returns trigger
language plpgsql as $$
begin
  if new.stock_quantity <> 0 and coalesce(current_setting('dada.stock_tx', true), '') <> 'on' then
    raise exception 'STOCK_DIRECT_UPDATE_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger trg_variants_guard_initial before insert on public.product_variants
  for each row execute function public.guard_variant_initial_stock();

-- Chaque produit possède au moins une variante par défaut.
create or replace function public.products_default_variant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.product_variants (product_id, name, is_default) values (new.id, 'Standard', true);
  return new;
end $$;
create trigger trg_products_default_variant after insert on public.products
  for each row execute function public.products_default_variant();

create table public.stock_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity_delta int not null check (quantity_delta <> 0),
  reason public.stock_reason not null,
  unit_cost bigint check (unit_cost >= 0),
  order_id uuid,                 -- FK ajoutée plus bas
  supplier_id uuid references public.suppliers(id) on delete set null,
  note text,
  resulting_quantity int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_adjustment_needs_note check (reason not in ('adjustment', 'loss') or length(coalesce(note, '')) >= 3)
);
create index stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);

create or replace function public.apply_stock_movement() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_new int;
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  perform set_config('dada.stock_tx', 'on', true);
  update public.product_variants set stock_quantity = stock_quantity + new.quantity_delta
  where id = new.variant_id
  returning stock_quantity into v_new;
  perform set_config('dada.stock_tx', 'off', true);
  if v_new is null then raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0002'; end if;
  new.resulting_quantity := v_new;
  return new;
exception when check_violation then
  raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
end $$;
create trigger trg_stock_movements_apply before insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- Les mouvements sont immuables (correction = nouveau mouvement).
create or replace function public.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'IMMUTABLE_RECORD' using errcode = '42501';
end $$;
create trigger trg_stock_movements_immutable before update or delete on public.stock_movements
  for each row execute function public.forbid_mutation();

-- ─── Commandes (boutique en ligne + ventes en caisse) ───────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.gen_reference('CMD'),
  tracking_code text not null unique default public.gen_reference(null, 8),
  channel text not null default 'online' check (channel in ('online', 'pos')),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  fulfillment text not null default 'pickup' check (fulfillment in ('pickup', 'delivery', 'in_store')),
  delivery_address text,
  delivery_notes text,
  status public.order_status not null default 'pending',
  subtotal bigint not null default 0 check (subtotal >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  delivery_fee bigint not null default 0 check (delivery_fee >= 0),
  total_amount bigint not null default 0 check (total_amount >= 0),
  paid_amount bigint not null default 0,
  preferred_payment_method public.payment_method,
  appointment_id uuid references public.appointments(id) on delete set null,
  promotion_code text,
  stock_released boolean not null default false,
  internal_notes text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();
create trigger trg_audit_orders after insert or update or delete on public.orders
  for each row execute function public.audit_trigger();

alter table public.stock_movements
  add constraint stock_movements_order_fk foreign key (order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'service')),
  variant_id uuid references public.product_variants(id) on delete restrict,
  service_id uuid references public.services(id) on delete restrict,
  label text not null,
  quantity int not null check (quantity between 1 and 100),
  unit_price bigint not null check (unit_price >= 0),
  unit_cost bigint check (unit_cost >= 0),   -- instantané pour le coût des marchandises
  line_total bigint generated always as (quantity * unit_price) stored,
  check ((item_type = 'product' and variant_id is not null) or (item_type = 'service' and service_id is not null))
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status,
  note text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- Commande en ligne sans compte. Prix et stock lus et verrouillés en base.
create or replace function public.create_public_order(
  p_items jsonb,                 -- [{ "variant_id": uuid, "quantity": int }]
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_fulfillment text default 'pickup',
  p_delivery_address text default null,
  p_delivery_notes text default null,
  p_payment_method public.payment_method default null,
  p_marketing_consent boolean default false,
  p_client_key text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  st public.business_settings;
  v_phone text := public.normalize_phone(p_phone);
  v_customer uuid;
  v_order public.orders;
  v_subtotal bigint := 0;
  v_fee bigint := 0;
  it record;
  v_count int;
begin
  select * into st from public.business_settings where id = 1;
  if not st.shop_enabled then raise exception 'SHOP_DISABLED' using errcode = 'P0001'; end if;
  if p_full_name is null or length(trim(p_full_name)) not between 2 and 120 then raise exception 'INVALID_NAME' using errcode = '22023'; end if;
  if v_phone is null then raise exception 'INVALID_PHONE' using errcode = '22023'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_ITEMS' using errcode = '22023'; end if;
  v_count := jsonb_array_length(p_items);
  if v_count = 0 or v_count > 30 then raise exception 'INVALID_ITEMS' using errcode = '22023'; end if;

  if p_fulfillment = 'pickup' and not st.pickup_enabled then raise exception 'PICKUP_DISABLED' using errcode = 'P0001'; end if;
  if p_fulfillment = 'delivery' then
    if not st.delivery_enabled then raise exception 'DELIVERY_DISABLED' using errcode = 'P0001'; end if;
    if length(trim(coalesce(p_delivery_address, ''))) < 5 then raise exception 'ADDRESS_REQUIRED' using errcode = '22023'; end if;
    v_fee := coalesce(st.delivery_fee, 0);
  elsif p_fulfillment <> 'pickup' then
    raise exception 'INVALID_FULFILLMENT' using errcode = '22023';
  end if;

  perform public.check_rate_limit('order:phone:' || v_phone, 5, interval '1 hour');
  if p_client_key is not null then
    perform public.check_rate_limit('order:client:' || left(p_client_key, 128), 10, interval '1 hour');
  end if;

  v_customer := public.upsert_customer(p_full_name, v_phone, p_email, p_marketing_consent, 'online_shop');

  insert into public.orders (channel, customer_id, customer_name, customer_phone, customer_email, fulfillment,
    delivery_address, delivery_notes, status, delivery_fee, preferred_payment_method)
  values ('online', v_customer, trim(p_full_name), v_phone, nullif(trim(coalesce(p_email, '')), ''), p_fulfillment,
    case when p_fulfillment = 'delivery' then trim(p_delivery_address) end, left(p_delivery_notes, 500),
    'pending', v_fee, p_payment_method)
  returning * into v_order;

  -- Regroupe les quantités par variante et verrouille les lignes (ordre stable = pas d'interblocage).
  for it in
    select v.id as variant_id, v.sale_price, v.cost_price, v.stock_quantity, v.name as variant_name,
           p.name as product_name, q.qty
    from (
      select (x ->> 'variant_id')::uuid as variant_id, sum((x ->> 'quantity')::int) as qty
      from jsonb_array_elements(p_items) x group by 1
    ) q
    join public.product_variants v on v.id = q.variant_id
    join public.products p on p.id = v.product_id
    where v.is_active and p.status = 'active' and p.is_online and v.sale_price is not null
    order by v.id
    for update of v
  loop
    if it.qty is null or it.qty < 1 or it.qty > 20 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;
    if it.stock_quantity < it.qty then raise exception 'INSUFFICIENT_STOCK: %', it.product_name using errcode = 'P0001'; end if;
    insert into public.order_items (order_id, item_type, variant_id, label, quantity, unit_price, unit_cost)
    values (v_order.id, 'product', it.variant_id,
      it.product_name || case when it.variant_name <> 'Standard' then ' — ' || it.variant_name else '' end,
      it.qty, it.sale_price, it.cost_price);
    insert into public.stock_movements (variant_id, quantity_delta, reason, order_id, note)
    values (it.variant_id, -it.qty, 'order_reserved', v_order.id, v_order.reference);
    v_subtotal := v_subtotal + it.sale_price * it.qty;
  end loop;

  if (select count(*) from public.order_items where order_id = v_order.id)
     <> (select count(distinct x ->> 'variant_id') from jsonb_array_elements(p_items) x) then
    raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  update public.orders set subtotal = v_subtotal, total_amount = v_subtotal + v_fee
  where id = v_order.id returning * into v_order;

  insert into public.order_events (order_id, to_status, note) values (v_order.id, 'pending', 'Commande en ligne');
  perform public.notify_internal('order.created', 'Nouvelle commande en ligne',
    v_order.reference || ' — ' || trim(p_full_name) || ' — ' || v_order.total_amount || ' FCFA',
    '/admin/commandes/' || v_order.id, 'orders.view');

  return jsonb_build_object('order_id', v_order.id, 'reference', v_order.reference,
    'tracking_code', v_order.tracking_code, 'total_amount', v_order.total_amount,
    'subtotal', v_order.subtotal, 'delivery_fee', v_order.delivery_fee, 'status', v_order.status);
end $$;

-- Suivi de commande public : référence + code de suivi OU téléphone.
create or replace function public.track_order(p_reference text, p_secret text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  select jsonb_build_object(
    'reference', o.reference, 'status', o.status, 'fulfillment', o.fulfillment,
    'total_amount', o.total_amount, 'paid_amount', o.paid_amount, 'created_at', o.created_at,
    'items', (select jsonb_agg(jsonb_build_object('label', i.label, 'quantity', i.quantity, 'line_total', i.line_total))
              from public.order_items i where i.order_id = o.id),
    'history', (select jsonb_agg(jsonb_build_object('status', e.to_status, 'at', e.created_at) order by e.created_at)
                from public.order_events e where e.order_id = o.id and e.to_status is not null)
  ) into r
  from public.orders o
  where o.reference = upper(trim(p_reference))
    and (o.tracking_code = upper(trim(p_secret)) or o.customer_phone = public.normalize_phone(p_secret));
  return r;
end $$;

-- Remise en stock d'une commande annulée (une seule fois).
create or replace function public.release_order_stock(p_order_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare o public.orders; it record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if o.stock_released then return; end if;
  for it in select variant_id, sum(quantity) as qty from public.order_items
            where order_id = o.id and item_type = 'product' group by variant_id order by variant_id loop
    insert into public.stock_movements (variant_id, quantity_delta, reason, order_id, note)
    values (it.variant_id, it.qty, case when o.channel = 'pos' then 'return' else 'order_released' end::public.stock_reason,
            o.id, 'Annulation ' || o.reference);
  end loop;
  update public.orders set stock_released = true where id = o.id;
end $$;

create or replace function public.set_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  o public.orders;
  allowed boolean;
begin
  perform public.require_permission('orders.manage');
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if o.status = p_status then return; end if;
  allowed := case o.status
    when 'pending' then p_status in ('confirmed', 'processing', 'cancelled')
    when 'confirmed' then p_status in ('processing', 'ready_for_pickup', 'shipped', 'cancelled')
    when 'processing' then p_status in ('ready_for_pickup', 'shipped', 'cancelled')
    when 'ready_for_pickup' then p_status in ('delivered', 'cancelled')
    when 'shipped' then p_status in ('delivered', 'cancelled')
    when 'delivered' then p_status in ('refunded')
    when 'completed' then p_status in ('refunded')
    else false end;
  if not allowed then raise exception 'INVALID_TRANSITION: % -> %', o.status, p_status using errcode = 'P0001'; end if;
  if p_status = 'refunded' then perform public.require_permission('payments.refund'); end if;

  if p_status in ('cancelled', 'refunded') then
    perform public.release_order_stock(o.id);
  end if;

  update public.orders set status = p_status,
    completed_at = case when p_status = 'delivered' then now() else completed_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
  where id = o.id;
  insert into public.order_events (order_id, from_status, to_status, note, actor_id)
  values (o.id, o.status, p_status, left(p_note, 500), auth.uid());
end $$;

-- Mouvement de stock manuel (réception fournisseur, inventaire, casse…)
create or replace function public.record_stock_movement(
  p_variant_id uuid, p_delta int, p_reason public.stock_reason, p_note text default null,
  p_unit_cost bigint default null, p_supplier_id uuid default null
) returns int
language plpgsql volatile security definer set search_path = public as $$
declare v_res int;
begin
  perform public.require_permission('inventory.manage');
  if p_reason not in ('initial', 'purchase', 'return', 'adjustment', 'loss') then
    raise exception 'INVALID_REASON' using errcode = '22023';
  end if;
  if p_reason in ('purchase', 'initial', 'return') and p_delta <= 0 then raise exception 'DELTA_MUST_BE_POSITIVE' using errcode = '22023'; end if;
  if p_reason = 'loss' and p_delta >= 0 then raise exception 'DELTA_MUST_BE_NEGATIVE' using errcode = '22023'; end if;
  insert into public.stock_movements (variant_id, quantity_delta, reason, note, unit_cost, supplier_id)
  values (p_variant_id, p_delta, p_reason, p_note, p_unit_cost, p_supplier_id)
  returning resulting_quantity into v_res;
  if p_reason = 'purchase' and p_unit_cost is not null then
    update public.product_variants set cost_price = p_unit_cost where id = p_variant_id;
  end if;
  return v_res;
end $$;
