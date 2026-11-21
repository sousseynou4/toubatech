-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 005 PAIEMENTS, CAISSE, DÉPENSES
-- Aucun paiement n'est « réussi » sans : (a) une saisie manuelle par un membre
-- autorisé de l'équipe (espèces / transfert reçu et vérifié), ou (b) une
-- confirmation serveur d'un fournisseur (webhook vérifié, service_role).
-- ════════════════════════════════════════════════════════════════════════════

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.gen_reference('PAY'),
  appointment_id uuid references public.appointments(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  kind public.payment_kind not null,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount bigint not null check (amount > 0),
  currency char(3) not null default 'XOF',
  refund_of uuid references public.payments(id) on delete restrict,
  provider text,                       -- wave | orange_money | manual
  provider_reference text,             -- identifiant de transaction fournisseur
  checkout_url text,
  idempotency_key text unique,
  is_manual boolean not null default false,
  note text,
  recorded_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(appointment_id, order_id) = 1),
  check ((kind = 'refund') = (refund_of is not null))
);
create unique index payments_provider_ref_unique on public.payments (provider, provider_reference) where provider_reference is not null;
create index payments_appointment_idx on public.payments (appointment_id);
create index payments_order_idx on public.payments (order_id);
create index payments_paid_at_idx on public.payments (status, paid_at desc);
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();
create trigger trg_audit_payments after insert or update or delete on public.payments
  for each row execute function public.audit_trigger();

create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid references public.payments(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  error text,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid references auth.users(id) on delete set null,
  opened_at timestamptz not null default now(),
  opening_float bigint not null default 0 check (opening_float >= 0),
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz,
  expected_cash bigint,
  counted_cash bigint check (counted_cash >= 0),
  difference bigint,
  notes text
);
create unique index cash_sessions_single_open on public.cash_sessions ((true)) where closed_at is null;
create trigger trg_audit_cash_sessions after insert or update on public.cash_sessions
  for each row execute function public.audit_trigger();

create table public.cash_transactions (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.cash_sessions(id) on delete restrict,
  direction text not null check (direction in ('in', 'out')),
  category text not null check (category in ('sale', 'deposit', 'balance', 'refund', 'expense', 'withdrawal', 'top_up')),
  amount bigint not null check (amount > 0),
  payment_id uuid references public.payments(id) on delete set null,
  expense_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index cash_transactions_session_idx on public.cash_transactions (session_id, created_at);
create trigger trg_cash_tx_immutable before update or delete on public.cash_transactions
  for each row execute function public.forbid_mutation();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('stock', 'rent', 'salaries', 'utilities', 'marketing', 'equipment', 'consumables', 'transport', 'taxes', 'other')),
  label text not null check (length(label) between 2 and 200),
  amount bigint not null check (amount > 0),
  method public.payment_method not null default 'cash',
  spent_on date not null default (now() at time zone 'Africa/Dakar')::date,
  supplier_id uuid references public.suppliers(id) on delete set null,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (spent_on desc);
create trigger trg_audit_expenses after insert or update or delete on public.expenses
  for each row execute function public.audit_trigger();

alter table public.cash_transactions
  add constraint cash_transactions_expense_fk foreign key (expense_id) references public.expenses(id) on delete set null;

-- ─── Fonctions ──────────────────────────────────────────────────────────────

create or replace function public.open_cash_session_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.cash_sessions where closed_at is null limit 1
$$;

create or replace function public.require_open_cash_session() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid := public.open_cash_session_id();
begin
  if v is null then
    raise exception 'CASH_SESSION_CLOSED' using errcode = 'P0001',
      hint = 'Ouvrez la caisse avant d''enregistrer un mouvement en espèces.';
  end if;
  return v;
end $$;

-- Recalcule le montant encaissé (paiements réussis - remboursements).
create or replace function public.refresh_paid_amount(p_appointment_id uuid, p_order_id uuid) returns bigint
language plpgsql volatile security definer set search_path = public as $$
declare v bigint;
begin
  select coalesce(sum(case when kind = 'refund' then -amount else amount end), 0) into v
  from public.payments
  where status = 'succeeded'
    and ((p_appointment_id is not null and appointment_id = p_appointment_id)
      or (p_order_id is not null and order_id = p_order_id));
  if p_appointment_id is not null then
    update public.appointments set paid_amount = v where id = p_appointment_id;
  else
    update public.orders set paid_amount = v where id = p_order_id;
  end if;
  return v;
end $$;

-- Passe automatiquement le rendez-vous en « acompte payé » si l'acompte est couvert.
create or replace function public.apply_deposit_status(p_appointment_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_appointment_id for update;
  if a.status in ('pending', 'confirmed') and a.deposit_required > 0 and a.paid_amount >= a.deposit_required then
    update public.appointments set status = 'deposit_paid', confirmed_at = coalesce(confirmed_at, now()) where id = a.id;
    insert into public.appointment_events (appointment_id, event_type, from_status, to_status, details, actor_id)
    values (a.id, 'status_changed', a.status, 'deposit_paid', jsonb_build_object('auto', true), auth.uid());
  end if;
end $$;

-- Paiement saisi par l'équipe (espèces, Wave/Orange Money reçu et vérifié…).
create or replace function public.record_payment(
  p_appointment_id uuid,
  p_order_id uuid,
  p_amount bigint,
  p_method public.payment_method,
  p_kind public.payment_kind,
  p_provider_reference text default null,
  p_note text default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_total bigint;
  v_paid bigint;
  v_customer uuid;
  v_status text;
  v_pay public.payments;
  v_session uuid;
begin
  perform public.require_permission('payments.manage');
  if num_nonnulls(p_appointment_id, p_order_id) <> 1 then raise exception 'ONE_TARGET_REQUIRED' using errcode = '22023'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
  if p_kind = 'refund' then raise exception 'USE_REFUND_FUNCTION' using errcode = '22023'; end if;
  if p_method = 'gift_card' then raise exception 'GIFT_CARD_NOT_SUPPORTED_HERE' using errcode = '22023'; end if;

  if p_idempotency_key is not null then
    select * into v_pay from public.payments where idempotency_key = p_idempotency_key;
    if found then return v_pay.id; end if;
  end if;

  if p_appointment_id is not null then
    select total_amount, paid_amount, customer_id, status::text into v_total, v_paid, v_customer, v_status
    from public.appointments where id = p_appointment_id for update;
    if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
    if v_status in ('cancelled', 'no_show') and p_kind <> 'deposit' then raise exception 'APPOINTMENT_CLOSED' using errcode = 'P0001'; end if;
  else
    select total_amount, paid_amount, customer_id, status::text into v_total, v_paid, v_customer, v_status
    from public.orders where id = p_order_id for update;
    if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
    if v_status in ('cancelled', 'refunded') then raise exception 'ORDER_CLOSED' using errcode = 'P0001'; end if;
  end if;

  if v_paid + p_amount > v_total then
    raise exception 'AMOUNT_EXCEEDS_BALANCE' using errcode = 'P0001',
      detail = format('Reste dû : %s FCFA', v_total - v_paid);
  end if;

  if p_method = 'cash' then v_session := public.require_open_cash_session(); end if;

  insert into public.payments (appointment_id, order_id, customer_id, kind, method, status, amount, provider,
    provider_reference, idempotency_key, is_manual, note, recorded_by, paid_at)
  values (p_appointment_id, p_order_id, v_customer, p_kind, p_method, 'succeeded', p_amount, 'manual',
    nullif(trim(coalesce(p_provider_reference, '')), ''), p_idempotency_key, true, left(p_note, 500), auth.uid(), now())
  returning * into v_pay;

  if v_session is not null then
    insert into public.cash_transactions (session_id, direction, category, amount, payment_id, created_by, note)
    values (v_session, 'in', case p_kind when 'deposit' then 'deposit' when 'balance' then 'balance' else 'sale' end,
            p_amount, v_pay.id, auth.uid(), v_pay.reference);
  end if;

  perform public.refresh_paid_amount(p_appointment_id, p_order_id);
  if p_appointment_id is not null then
    perform public.apply_deposit_status(p_appointment_id);
    insert into public.appointment_events (appointment_id, event_type, details, actor_id)
    values (p_appointment_id, 'payment', jsonb_build_object('payment_id', v_pay.id, 'amount', p_amount, 'method', p_method, 'kind', p_kind), auth.uid());
  end if;
  return v_pay.id;
end $$;

create or replace function public.refund_payment(p_payment_id uuid, p_amount bigint, p_reason text) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  orig public.payments;
  v_refunded bigint;
  v_new uuid;
  v_session uuid;
begin
  perform public.require_permission('payments.refund');
  if length(coalesce(trim(p_reason), '')) < 3 then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  select * into orig from public.payments where id = p_payment_id for update;
  if not found or orig.kind = 'refund' or orig.status <> 'succeeded' then raise exception 'NOT_REFUNDABLE' using errcode = 'P0001'; end if;
  select coalesce(sum(amount), 0) into v_refunded from public.payments where refund_of = orig.id and status = 'succeeded';
  if p_amount is null or p_amount <= 0 or p_amount > orig.amount - v_refunded then
    raise exception 'INVALID_REFUND_AMOUNT' using errcode = '22023';
  end if;
  if orig.method = 'cash' then v_session := public.require_open_cash_session(); end if;

  insert into public.payments (appointment_id, order_id, customer_id, kind, method, status, amount, refund_of,
    provider, is_manual, note, recorded_by, paid_at)
  values (orig.appointment_id, orig.order_id, orig.customer_id, 'refund', orig.method, 'succeeded', p_amount, orig.id,
    'manual', true, left(p_reason, 500), auth.uid(), now())
  returning id into v_new;

  if v_session is not null then
    insert into public.cash_transactions (session_id, direction, category, amount, payment_id, created_by, note)
    values (v_session, 'out', 'refund', p_amount, v_new, auth.uid(), left(p_reason, 200));
  end if;
  perform public.refresh_paid_amount(orig.appointment_id, orig.order_id);
  return v_new;
end $$;

-- Paiement en ligne : création côté serveur (service_role) — montant calculé en base.
create or replace function public.create_provider_payment(
  p_appointment_id uuid, p_order_id uuid, p_kind public.payment_kind, p_provider text, p_idempotency_key text
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_amount bigint;
  v_customer uuid;
  v_pay public.payments;
  v_method public.payment_method;
begin
  if p_provider not in ('wave', 'orange_money') then raise exception 'UNKNOWN_PROVIDER' using errcode = '22023'; end if;
  if num_nonnulls(p_appointment_id, p_order_id) <> 1 then raise exception 'ONE_TARGET_REQUIRED' using errcode = '22023'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 16 then raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023'; end if;
  v_method := p_provider::public.payment_method;

  select * into v_pay from public.payments where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('payment_id', v_pay.id, 'reference', v_pay.reference, 'amount', v_pay.amount, 'status', v_pay.status, 'checkout_url', v_pay.checkout_url);
  end if;

  if p_appointment_id is not null then
    select case when p_kind = 'deposit' then deposit_required - paid_amount else total_amount - paid_amount end, customer_id
    into v_amount, v_customer from public.appointments
    where id = p_appointment_id and status in ('pending', 'confirmed', 'deposit_paid', 'in_progress');
  else
    select total_amount - paid_amount, customer_id into v_amount, v_customer
    from public.orders where id = p_order_id and status not in ('cancelled', 'refunded');
  end if;
  if v_amount is null or v_amount <= 0 then raise exception 'NOTHING_TO_PAY' using errcode = 'P0001'; end if;

  insert into public.payments (appointment_id, order_id, customer_id, kind, method, status, amount, provider, idempotency_key)
  values (p_appointment_id, p_order_id, v_customer, p_kind, v_method, 'pending', v_amount, p_provider, p_idempotency_key)
  returning * into v_pay;
  return jsonb_build_object('payment_id', v_pay.id, 'reference', v_pay.reference, 'amount', v_pay.amount, 'status', v_pay.status);
end $$;

create or replace function public.attach_provider_checkout(p_payment_id uuid, p_provider_reference text, p_checkout_url text)
returns void
language sql volatile security definer set search_path = public as $$
  update public.payments set provider_reference = p_provider_reference, checkout_url = p_checkout_url
  where id = p_payment_id and status = 'pending'
$$;

-- Confirmation par webhook (signature déjà vérifiée par le serveur). Idempotent.
create or replace function public.confirm_provider_payment(
  p_provider text, p_event_id text, p_provider_reference text, p_status public.payment_status,
  p_amount bigint, p_payload jsonb
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_pay public.payments;
  v_event_id bigint;
begin
  insert into public.payment_events (provider, provider_event_id, event_type, payload)
  values (p_provider, p_event_id, p_status::text, coalesce(p_payload, '{}'::jsonb))
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;
  if v_event_id is null then return jsonb_build_object('duplicate', true); end if;

  select * into v_pay from public.payments
  where provider = p_provider and provider_reference = p_provider_reference for update;
  if not found then
    update public.payment_events set error = 'payment_not_found' where id = v_event_id;
    return jsonb_build_object('error', 'payment_not_found');
  end if;
  update public.payment_events set payment_id = v_pay.id where id = v_event_id;

  if v_pay.status <> 'pending' then
    update public.payment_events set processed = true, error = 'already_final' where id = v_event_id;
    return jsonb_build_object('payment_id', v_pay.id, 'status', v_pay.status, 'already_final', true);
  end if;
  if p_status = 'succeeded' and p_amount is distinct from v_pay.amount then
    update public.payment_events set error = 'amount_mismatch' where id = v_event_id;
    update public.payments set status = 'failed', note = 'Montant reçu différent du montant attendu' where id = v_pay.id;
    return jsonb_build_object('error', 'amount_mismatch');
  end if;

  update public.payments set status = p_status, paid_at = case when p_status = 'succeeded' then now() end
  where id = v_pay.id;
  update public.payment_events set processed = true where id = v_event_id;

  if p_status = 'succeeded' then
    perform public.refresh_paid_amount(v_pay.appointment_id, v_pay.order_id);
    if v_pay.appointment_id is not null then
      perform public.apply_deposit_status(v_pay.appointment_id);
    elsif v_pay.order_id is not null then
      update public.orders set status = 'confirmed' where id = v_pay.order_id and status = 'pending';
    end if;
    perform public.notify_internal('payment.succeeded', 'Paiement en ligne reçu',
      v_pay.reference || ' — ' || v_pay.amount || ' FCFA (' || p_provider || ')', '/admin/paiements', 'payments.view');
  end if;
  return jsonb_build_object('payment_id', v_pay.id, 'status', p_status);
end $$;

create or replace function public.open_cash_session(p_opening_float bigint, p_notes text default null) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v uuid;
begin
  perform public.require_permission('cash.manage');
  if public.open_cash_session_id() is not null then raise exception 'CASH_SESSION_ALREADY_OPEN' using errcode = 'P0001'; end if;
  insert into public.cash_sessions (opened_by, opening_float, notes)
  values (auth.uid(), greatest(coalesce(p_opening_float, 0), 0), p_notes) returning id into v;
  return v;
end $$;

create or replace function public.cash_session_expected(p_session_id uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select s.opening_float + coalesce(sum(case when t.direction = 'in' then t.amount else -t.amount end), 0)
  from public.cash_sessions s left join public.cash_transactions t on t.session_id = s.id
  where s.id = p_session_id group by s.opening_float
$$;

create or replace function public.close_cash_session(p_session_id uuid, p_counted_cash bigint, p_notes text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_expected bigint;
begin
  perform public.require_permission('cash.manage');
  if p_counted_cash is null or p_counted_cash < 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
  perform 1 from public.cash_sessions where id = p_session_id and closed_at is null for update;
  if not found then raise exception 'CASH_SESSION_NOT_OPEN' using errcode = 'P0001'; end if;
  v_expected := public.cash_session_expected(p_session_id);
  update public.cash_sessions set closed_at = now(), closed_by = auth.uid(), expected_cash = v_expected,
    counted_cash = p_counted_cash, difference = p_counted_cash - v_expected,
    notes = concat_ws(E'\n', notes, p_notes)
  where id = p_session_id;
  return jsonb_build_object('expected_cash', v_expected, 'counted_cash', p_counted_cash, 'difference', p_counted_cash - v_expected);
end $$;

create or replace function public.cash_movement(p_direction text, p_category text, p_amount bigint, p_note text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.require_permission('cash.manage');
  if p_category not in ('withdrawal', 'top_up') then raise exception 'INVALID_CATEGORY' using errcode = '22023'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
  if length(coalesce(trim(p_note), '')) < 3 then raise exception 'NOTE_REQUIRED' using errcode = '22023'; end if;
  insert into public.cash_transactions (session_id, direction, category, amount, note, created_by)
  values (public.require_open_cash_session(), case when p_category = 'withdrawal' then 'out' else 'in' end,
          p_category, p_amount, p_note, auth.uid());
end $$;

create or replace function public.record_expense(
  p_category text, p_label text, p_amount bigint, p_method public.payment_method,
  p_spent_on date default null, p_supplier_id uuid default null, p_notes text default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v uuid; v_session uuid;
begin
  perform public.require_permission('expenses.manage');
  if p_method = 'cash' then v_session := public.require_open_cash_session(); end if;
  insert into public.expenses (category, label, amount, method, spent_on, supplier_id, notes, recorded_by)
  values (p_category, p_label, p_amount, p_method,
          coalesce(p_spent_on, (now() at time zone 'Africa/Dakar')::date), p_supplier_id, p_notes, auth.uid())
  returning id into v;
  if v_session is not null then
    insert into public.cash_transactions (session_id, direction, category, amount, expense_id, note, created_by)
    values (v_session, 'out', 'expense', p_amount, v, p_label, auth.uid());
  end if;
  return v;
end $$;

-- Vente en caisse (produits et/ou prestations), paiement immédiat.
create or replace function public.pos_checkout(
  p_customer_id uuid,
  p_lines jsonb,       -- [{type:'product', variant_id, quantity} | {type:'service', service_id, quantity, unit_price?}]
  p_payments jsonb,    -- [{method, amount, reference?}]
  p_discount bigint default 0,
  p_note text default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_order public.orders;
  v_cust public.customers;
  v_subtotal bigint := 0;
  v_total bigint;
  v_paid bigint := 0;
  v_session uuid;
  l jsonb;
  pm jsonb;
  v_variant record;
  v_service public.services;
  v_qty int;
  v_price bigint;
  v_pay uuid;
begin
  perform public.require_permission('pos.use');
  if p_idempotency_key is not null then
    select * into v_order from public.orders o
    where o.channel = 'pos' and o.internal_notes like '%[idem:' || p_idempotency_key || ']%';
    if found then return jsonb_build_object('order_id', v_order.id, 'reference', v_order.reference, 'total_amount', v_order.total_amount, 'duplicate', true); end if;
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 50 then
    raise exception 'INVALID_LINES' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'PAYMENT_REQUIRED' using errcode = '22023';
  end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT' using errcode = '22023'; end if;
  if coalesce(p_discount, 0) > 0 then perform public.require_permission('pos.discount'); end if;

  if p_customer_id is not null then
    select * into v_cust from public.customers where id = p_customer_id;
    if not found then raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0002'; end if;
  end if;

  insert into public.orders (channel, customer_id, customer_name, customer_phone, fulfillment, status, created_by, internal_notes)
  values ('pos', p_customer_id, coalesce(v_cust.full_name, 'Client(e) en caisse'), coalesce(v_cust.phone, '—'),
          'in_store', 'completed', auth.uid(),
          concat_ws(' ', left(p_note, 500), case when p_idempotency_key is not null then '[idem:' || p_idempotency_key || ']' end))
  returning * into v_order;

  for l in select * from jsonb_array_elements(p_lines) loop
    v_qty := coalesce((l ->> 'quantity')::int, 1);
    if v_qty < 1 or v_qty > 100 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;
    if l ->> 'type' = 'product' then
      select v.id, v.sale_price, v.cost_price, v.name, p.name as pname into v_variant
      from public.product_variants v join public.products p on p.id = v.product_id
      where v.id = (l ->> 'variant_id')::uuid and v.is_active and p.status <> 'inactive'
      for update of v;
      if not found or v_variant.sale_price is null then raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001'; end if;
      insert into public.order_items (order_id, item_type, variant_id, label, quantity, unit_price, unit_cost)
      values (v_order.id, 'product', v_variant.id,
        v_variant.pname || case when v_variant.name <> 'Standard' then ' — ' || v_variant.name else '' end,
        v_qty, v_variant.sale_price, v_variant.cost_price);
      insert into public.stock_movements (variant_id, quantity_delta, reason, order_id, note)
      values (v_variant.id, -v_qty, 'sale', v_order.id, v_order.reference);
      v_subtotal := v_subtotal + v_variant.sale_price * v_qty;
    elsif l ->> 'type' = 'service' then
      select * into v_service from public.services where id = (l ->> 'service_id')::uuid and status <> 'inactive';
      if not found then raise exception 'SERVICE_UNAVAILABLE' using errcode = 'P0001'; end if;
      v_price := v_service.price;
      if l ? 'unit_price' and (l ->> 'unit_price')::bigint is distinct from v_service.price then
        -- Prix libre autorisé uniquement si la prestation n'a pas de tarif, ou avec la permission dédiée.
        if v_service.price is not null then perform public.require_permission('pos.override_price'); end if;
        v_price := (l ->> 'unit_price')::bigint;
      end if;
      if v_price is null or v_price < 0 then raise exception 'SERVICE_PRICE_REQUIRED: %', v_service.name using errcode = '22023'; end if;
      insert into public.order_items (order_id, item_type, service_id, label, quantity, unit_price)
      values (v_order.id, 'service', v_service.id, v_service.name, v_qty, v_price);
      v_subtotal := v_subtotal + v_price * v_qty;
    else
      raise exception 'INVALID_LINE_TYPE' using errcode = '22023';
    end if;
  end loop;

  if coalesce(p_discount, 0) > v_subtotal then raise exception 'DISCOUNT_TOO_HIGH' using errcode = '22023'; end if;
  v_total := v_subtotal - coalesce(p_discount, 0);

  for pm in select * from jsonb_array_elements(p_payments) loop
    if (pm ->> 'amount')::bigint is null or (pm ->> 'amount')::bigint <= 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
    if (pm ->> 'method') = 'gift_card' then raise exception 'GIFT_CARD_NOT_SUPPORTED_HERE' using errcode = '22023'; end if;
    v_paid := v_paid + (pm ->> 'amount')::bigint;
  end loop;
  if v_paid <> v_total then
    raise exception 'PAYMENT_MISMATCH' using errcode = 'P0001', detail = format('Total %s FCFA, payé %s FCFA', v_total, v_paid);
  end if;

  update public.orders set subtotal = v_subtotal, discount_amount = coalesce(p_discount, 0), total_amount = v_total,
    completed_at = now() where id = v_order.id;

  for pm in select * from jsonb_array_elements(p_payments) loop
    insert into public.payments (order_id, customer_id, kind, method, status, amount, provider, provider_reference,
      is_manual, recorded_by, paid_at)
    values (v_order.id, p_customer_id, 'full', (pm ->> 'method')::public.payment_method, 'succeeded',
      (pm ->> 'amount')::bigint, 'manual', nullif(pm ->> 'reference', ''), true, auth.uid(), now())
    returning id into v_pay;
    if pm ->> 'method' = 'cash' then
      v_session := coalesce(v_session, public.require_open_cash_session());
      insert into public.cash_transactions (session_id, direction, category, amount, payment_id, created_by, note)
      values (v_session, 'in', 'sale', (pm ->> 'amount')::bigint, v_pay, auth.uid(), v_order.reference);
    end if;
  end loop;
  perform public.refresh_paid_amount(null, v_order.id);
  if p_customer_id is not null then update public.customers set last_visit_at = now() where id = p_customer_id; end if;
  insert into public.order_events (order_id, to_status, note, actor_id) values (v_order.id, 'completed', 'Vente en caisse', auth.uid());

  return jsonb_build_object('order_id', v_order.id, 'reference', v_order.reference, 'total_amount', v_total);
end $$;
