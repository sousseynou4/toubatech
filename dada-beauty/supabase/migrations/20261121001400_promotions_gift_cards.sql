-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 014 CODES PROMO ET CARTES CADEAUX APPLIQUÉS AUTOMATIQUEMENT
--
-- Codes promo : la remise est TOUJOURS recalculée en base, à partir des prix
-- réels (jamais du navigateur), en caisse comme dans la boutique en ligne.
-- Une utilisation est comptée par commande, et rendue si la commande est
-- annulée ou remboursée.
--
-- Cartes cadeaux : le solde ne change QUE par le registre gift_card_transactions
-- (émission, utilisation, remboursement), sur le modèle des mouvements de stock.
-- Une carte vendue en espèces entre dans la caisse ouverte.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Colonnes ───────────────────────────────────────────────────────────────
alter table public.orders
  add column promotion_id uuid references public.promotions(id) on delete set null,
  add column promotion_discount bigint not null default 0 check (promotion_discount >= 0),
  add column promotion_released boolean not null default false;

alter table public.payments
  add column gift_card_id uuid references public.gift_cards(id) on delete restrict,
  add constraint payments_gift_card_method check ((method = 'gift_card') = (gift_card_id is not null));
create index payments_gift_card_idx on public.payments (gift_card_id) where gift_card_id is not null;

alter table public.gift_cards
  add column sale_method public.payment_method check (sale_method is distinct from 'gift_card'),
  add column sale_reference text,
  add column note text;

alter table public.cash_transactions drop constraint cash_transactions_category_check;
alter table public.cash_transactions
  add constraint cash_transactions_category_check
    check (category in ('sale', 'deposit', 'balance', 'refund', 'expense', 'withdrawal', 'top_up', 'gift_card_sale')),
  add column gift_card_id uuid references public.gift_cards(id) on delete set null;

-- ─── Registre des cartes cadeaux ────────────────────────────────────────────
create table public.gift_card_transactions (
  id bigint generated always as identity primary key,
  gift_card_id uuid not null references public.gift_cards(id) on delete restrict,
  kind text not null check (kind in ('issue', 'redeem', 'refund')),
  amount bigint not null check (amount <> 0),        -- variation signée du solde
  payment_id uuid references public.payments(id) on delete set null,
  resulting_balance bigint,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'redeem') = (amount < 0))
);
create index gift_card_tx_card_idx on public.gift_card_transactions (gift_card_id, created_at desc);

-- Reprise des cartes existantes (avant la pose des triggers).
insert into public.gift_card_transactions (gift_card_id, kind, amount, resulting_balance, note, created_by, created_at)
select id, 'issue', initial_amount, initial_amount, 'Reprise de l''existant', created_by, created_at from public.gift_cards;
insert into public.gift_card_transactions (gift_card_id, kind, amount, resulting_balance, note, created_at)
select id, 'redeem', balance - initial_amount, balance, 'Reprise : utilisations antérieures', now()
from public.gift_cards where balance < initial_amount;

create trigger trg_gift_card_tx_immutable before update or delete on public.gift_card_transactions
  for each row execute function public.forbid_mutation();

create or replace function public.apply_gift_card_transaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_new bigint;
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  perform set_config('dada.gift_tx', 'on', true);
  update public.gift_cards set balance = balance + new.amount where id = new.gift_card_id
  returning balance into v_new;
  perform set_config('dada.gift_tx', 'off', true);
  if v_new is null then raise exception 'GIFT_CARD_NOT_FOUND' using errcode = 'P0002'; end if;
  new.resulting_balance := v_new;
  return new;
exception when check_violation then
  raise exception 'GIFT_CARD_INSUFFICIENT_BALANCE' using errcode = 'P0001';
end $$;
create trigger trg_gift_card_tx_apply before insert on public.gift_card_transactions
  for each row execute function public.apply_gift_card_transaction();

-- Le montant et le solde ne se modifient que par le registre.
create or replace function public.guard_gift_card_balance() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('dada.gift_tx', true), '') <> 'on' then
    if tg_op = 'INSERT' or new.balance is distinct from old.balance or new.initial_amount is distinct from old.initial_amount
       or new.code is distinct from old.code then
      raise exception 'GIFT_CARD_DIRECT_UPDATE_FORBIDDEN' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger trg_gift_cards_guard before insert or update on public.gift_cards
  for each row execute function public.guard_gift_card_balance();

-- Privilèges : écriture directe limitée aux champs descriptifs.
revoke insert, update, delete on public.gift_cards from authenticated;
grant update (is_active, recipient_name, expires_on, note) on public.gift_cards to authenticated;
revoke insert, update on public.promotions from authenticated;
grant insert (code, description, discount_type, discount_value, min_amount, applies_to, starts_at, ends_at, max_uses, is_active)
  on public.promotions to authenticated;
grant update (code, description, discount_type, discount_value, min_amount, applies_to, starts_at, ends_at, max_uses, is_active)
  on public.promotions to authenticated;

alter table public.gift_card_transactions enable row level security;
revoke all on public.gift_card_transactions from anon, authenticated;
grant select on public.gift_card_transactions to authenticated;
create policy gift_card_tx_read on public.gift_card_transactions for select to authenticated
  using (public.has_permission('loyalty.manage'));

-- ─── Codes promo : calcul ───────────────────────────────────────────────────
-- Évalue un code sur des sous-totaux réels. Ne lève pas d'erreur : renvoie
-- { ok, reason?, promotion_id?, discount? } pour que l'appelant décide.
create or replace function public.evaluate_promotion(
  p_code text, p_services_subtotal bigint, p_products_subtotal bigint, p_lock boolean default false
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  pr public.promotions;
  v_code text := upper(trim(coalesce(p_code, '')));
  v_eligible bigint;
  v_discount bigint;
begin
  if v_code = '' then return jsonb_build_object('ok', false, 'reason', 'PROMO_INVALID'); end if;
  if p_lock then
    select * into pr from public.promotions where code = v_code for update;
  else
    select * into pr from public.promotions where code = v_code;
  end if;
  if not found or not pr.is_active then return jsonb_build_object('ok', false, 'reason', 'PROMO_INVALID'); end if;
  if pr.starts_at is not null and now() < pr.starts_at then return jsonb_build_object('ok', false, 'reason', 'PROMO_NOT_STARTED'); end if;
  if pr.ends_at is not null and now() > pr.ends_at then return jsonb_build_object('ok', false, 'reason', 'PROMO_EXPIRED'); end if;
  if pr.max_uses is not null and pr.uses_count >= pr.max_uses then return jsonb_build_object('ok', false, 'reason', 'PROMO_EXHAUSTED'); end if;

  v_eligible := case pr.applies_to
    when 'services' then coalesce(p_services_subtotal, 0)
    when 'products' then coalesce(p_products_subtotal, 0)
    else coalesce(p_services_subtotal, 0) + coalesce(p_products_subtotal, 0) end;
  if v_eligible <= 0 then return jsonb_build_object('ok', false, 'reason', 'PROMO_NOT_APPLICABLE', 'applies_to', pr.applies_to); end if;
  if v_eligible < pr.min_amount then
    return jsonb_build_object('ok', false, 'reason', 'PROMO_MIN_AMOUNT', 'min_amount', pr.min_amount);
  end if;

  v_discount := case pr.discount_type
    when 'percent' then (v_eligible * pr.discount_value) / 100   -- arrondi à l'inférieur, en FCFA
    else least(pr.discount_value, v_eligible) end;
  return jsonb_build_object('ok', true, 'promotion_id', pr.id, 'code', pr.code, 'description', pr.description,
    'discount', v_discount, 'discount_type', pr.discount_type, 'discount_value', pr.discount_value, 'applies_to', pr.applies_to);
end $$;

-- Applique un code (verrou + compteur) ou lève l'erreur métier correspondante.
create or replace function public.consume_promotion(p_code text, p_services_subtotal bigint, p_products_subtotal bigint)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare r jsonb;
begin
  r := public.evaluate_promotion(p_code, p_services_subtotal, p_products_subtotal, true);
  if not (r ->> 'ok')::boolean then
    raise exception '%', r ->> 'reason' using errcode = 'P0001',
      detail = case when r ? 'min_amount' then format('Minimum : %s FCFA', r ->> 'min_amount') else '' end;
  end if;
  update public.promotions set uses_count = uses_count + 1 where id = (r ->> 'promotion_id')::uuid;
  return r;
end $$;

-- Rend l'utilisation d'un code quand une commande est annulée ou remboursée (une seule fois).
create or replace function public.release_order_promotion(p_order_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if o.promotion_id is null or o.promotion_released then return; end if;
  update public.promotions set uses_count = greatest(uses_count - 1, 0) where id = o.promotion_id;
  update public.orders set promotion_released = true where id = o.id;
end $$;

-- Aperçu public d'un code sur le panier en ligne (prix lus en base, limité en fréquence).
create or replace function public.check_promotion(p_code text, p_items jsonb, p_client_key text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_products bigint;
begin
  perform public.check_rate_limit('promo:client:' || coalesce(left(p_client_key, 128), 'unknown'), 20, interval '1 hour');
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_ITEMS');
  end if;
  select coalesce(sum(v.sale_price * least(greatest(q.qty, 0), 20)), 0) into v_products
  from (select (x ->> 'variant_id')::uuid as variant_id, sum((x ->> 'quantity')::int) as qty
        from jsonb_array_elements(p_items) x group by 1) q
  join public.product_variants v on v.id = q.variant_id
  join public.products p on p.id = v.product_id
  where v.is_active and p.status = 'active' and p.is_online and v.sale_price is not null;
  return public.evaluate_promotion(p_code, 0, v_products, false) - 'promotion_id';
end $$;

-- Aperçu en caisse : mêmes règles de prix que pos_checkout, sans consommer le code.
create or replace function public.pos_preview_promotion(p_code text, p_lines jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_services bigint := 0;
  v_products bigint := 0;
  l jsonb;
  v_qty int;
  v_price bigint;
begin
  perform public.require_permission('pos.use');
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 50 then raise exception 'INVALID_LINES' using errcode = '22023'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    v_qty := least(greatest(coalesce((l ->> 'quantity')::int, 1), 1), 100);
    if l ->> 'type' = 'product' then
      select v.sale_price into v_price from public.product_variants v where v.id = (l ->> 'variant_id')::uuid;
      v_products := v_products + coalesce(v_price, 0) * v_qty;
    elsif l ->> 'type' = 'service' then
      select coalesce(s.price, (l ->> 'unit_price')::bigint) into v_price from public.services s where s.id = (l ->> 'service_id')::uuid;
      v_services := v_services + coalesce(v_price, 0) * v_qty;
    end if;
  end loop;
  return public.evaluate_promotion(p_code, v_services, v_products, false) - 'promotion_id';
end $$;

-- ─── Cartes cadeaux : émission, consultation, utilisation ───────────────────
create or replace function public.issue_gift_card(
  p_amount bigint,
  p_recipient_name text default null,
  p_expires_on date default null,
  p_purchaser_customer_id uuid default null,
  p_sale_method public.payment_method default null,  -- null = carte offerte
  p_sale_reference text default null,
  p_note text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_card public.gift_cards;
  v_session uuid;
begin
  -- Vendre une carte = acte de caisse ; l'offrir = geste commercial réservé à la gestion fidélité.
  if p_sale_method is null then
    perform public.require_permission('loyalty.manage');
    if length(coalesce(trim(p_note), '')) < 3 then raise exception 'NOTE_REQUIRED' using errcode = '22023'; end if;
  elsif not (public.has_permission('loyalty.manage') or public.has_permission('pos.use')) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;
  if p_sale_method = 'gift_card' then raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023'; end if;
  if p_amount is null or p_amount < 1000 or p_amount > 10000000 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
  if p_expires_on is not null and p_expires_on < public.local_date(now()) then raise exception 'DATE_IN_PAST' using errcode = '22023'; end if;
  if p_sale_method = 'cash' then v_session := public.require_open_cash_session(); end if;

  perform set_config('dada.gift_tx', 'on', true);
  insert into public.gift_cards (initial_amount, balance, purchaser_customer_id, recipient_name, expires_on,
    sale_method, sale_reference, note, created_by)
  values (p_amount, 0, p_purchaser_customer_id, nullif(trim(coalesce(p_recipient_name, '')), ''), p_expires_on,
    p_sale_method, nullif(trim(coalesce(p_sale_reference, '')), ''), left(p_note, 500), auth.uid())
  returning * into v_card;
  perform set_config('dada.gift_tx', 'off', true);

  insert into public.gift_card_transactions (gift_card_id, kind, amount, note)
  values (v_card.id, 'issue', p_amount,
    case when p_sale_method is null then 'Carte offerte : ' || trim(p_note) else 'Vente' end);

  if v_session is not null then
    insert into public.cash_transactions (session_id, direction, category, amount, gift_card_id, created_by, note)
    values (v_session, 'in', 'gift_card_sale', p_amount, v_card.id, auth.uid(), 'Carte cadeau ' || v_card.code);
  end if;
  return jsonb_build_object('id', v_card.id, 'code', v_card.code, 'amount', p_amount);
end $$;

-- Consultation du solde par l'équipe (caisse / encaissement).
create or replace function public.gift_card_lookup(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.gift_cards;
begin
  if not (public.has_permission('pos.use') or public.has_permission('payments.manage') or public.has_permission('loyalty.manage')) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;
  select * into c from public.gift_cards where code = upper(trim(coalesce(p_code, '')));
  if not found then return null; end if;
  return jsonb_build_object('code', c.code, 'balance', c.balance, 'initial_amount', c.initial_amount,
    'recipient_name', c.recipient_name, 'expires_on', c.expires_on, 'is_active', c.is_active,
    'usable', c.is_active and c.balance > 0 and (c.expires_on is null or c.expires_on >= public.local_date(now())));
end $$;

-- Paiement par carte cadeau : verrouille la carte, crée le paiement et débite le solde.
create or replace function public.redeem_gift_card(
  p_code text, p_amount bigint, p_appointment_id uuid, p_order_id uuid, p_customer_id uuid,
  p_kind public.payment_kind, p_note text default null, p_idempotency_key text default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  c public.gift_cards;
  v_pay uuid;
begin
  select * into c from public.gift_cards where code = upper(trim(coalesce(p_code, ''))) for update;
  if not found then raise exception 'GIFT_CARD_NOT_FOUND' using errcode = 'P0002'; end if;
  if not c.is_active then raise exception 'GIFT_CARD_INACTIVE' using errcode = 'P0001'; end if;
  if c.expires_on is not null and c.expires_on < public.local_date(now()) then raise exception 'GIFT_CARD_EXPIRED' using errcode = 'P0001'; end if;
  if c.balance < p_amount then
    raise exception 'GIFT_CARD_INSUFFICIENT_BALANCE' using errcode = 'P0001', detail = format('Solde disponible : %s FCFA', c.balance);
  end if;

  insert into public.payments (appointment_id, order_id, customer_id, kind, method, status, amount, provider,
    provider_reference, gift_card_id, idempotency_key, is_manual, note, recorded_by, paid_at)
  values (p_appointment_id, p_order_id, p_customer_id, p_kind, 'gift_card', 'succeeded', p_amount, 'gift_card',
    null, c.id, p_idempotency_key, true, left(p_note, 500), auth.uid(), now())
  returning id into v_pay;

  insert into public.gift_card_transactions (gift_card_id, kind, amount, payment_id, note)
  values (c.id, 'redeem', -p_amount, v_pay, coalesce(
    (select 'Commande ' || reference from public.orders where id = p_order_id),
    (select 'Rendez-vous ' || reference from public.appointments where id = p_appointment_id)));
  return v_pay;
end $$;

-- ─── Paiement saisi par l'équipe : carte cadeau acceptée ────────────────────
create or replace function public.record_payment(
  p_appointment_id uuid,
  p_order_id uuid,
  p_amount bigint,
  p_method public.payment_method,
  p_kind public.payment_kind,
  p_provider_reference text default null,   -- pour une carte cadeau : son code
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
  v_pay_id uuid;
  v_session uuid;
begin
  perform public.require_permission('payments.manage');
  if num_nonnulls(p_appointment_id, p_order_id) <> 1 then raise exception 'ONE_TARGET_REQUIRED' using errcode = '22023'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
  if p_kind = 'refund' then raise exception 'USE_REFUND_FUNCTION' using errcode = '22023'; end if;
  if p_method = 'gift_card' and length(trim(coalesce(p_provider_reference, ''))) = 0 then
    raise exception 'GIFT_CARD_CODE_REQUIRED' using errcode = '22023';
  end if;

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

  if p_method = 'gift_card' then
    v_pay_id := public.redeem_gift_card(p_provider_reference, p_amount, p_appointment_id, p_order_id, v_customer,
      p_kind, p_note, p_idempotency_key);
  else
    if p_method = 'cash' then v_session := public.require_open_cash_session(); end if;
    insert into public.payments (appointment_id, order_id, customer_id, kind, method, status, amount, provider,
      provider_reference, idempotency_key, is_manual, note, recorded_by, paid_at)
    values (p_appointment_id, p_order_id, v_customer, p_kind, p_method, 'succeeded', p_amount, 'manual',
      nullif(trim(coalesce(p_provider_reference, '')), ''), p_idempotency_key, true, left(p_note, 500), auth.uid(), now())
    returning id into v_pay_id;
    if v_session is not null then
      insert into public.cash_transactions (session_id, direction, category, amount, payment_id, created_by, note)
      values (v_session, 'in', case p_kind when 'deposit' then 'deposit' when 'balance' then 'balance' else 'sale' end,
              p_amount, v_pay_id, auth.uid(), (select reference from public.payments where id = v_pay_id));
    end if;
  end if;

  perform public.refresh_paid_amount(p_appointment_id, p_order_id);
  if p_appointment_id is not null then
    perform public.apply_deposit_status(p_appointment_id);
    insert into public.appointment_events (appointment_id, event_type, details, actor_id)
    values (p_appointment_id, 'payment', jsonb_build_object('payment_id', v_pay_id, 'amount', p_amount, 'method', p_method, 'kind', p_kind), auth.uid());
  end if;
  return v_pay_id;
end $$;

-- ─── Remboursement : une carte cadeau est recréditée ────────────────────────
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
    provider, provider_reference, gift_card_id, is_manual, note, recorded_by, paid_at)
  values (orig.appointment_id, orig.order_id, orig.customer_id, 'refund', orig.method, 'succeeded', p_amount, orig.id,
    case when orig.method = 'gift_card' then 'gift_card' else 'manual' end, null, orig.gift_card_id,
    true, left(p_reason, 500), auth.uid(), now())
  returning id into v_new;

  if orig.method = 'gift_card' then
    insert into public.gift_card_transactions (gift_card_id, kind, amount, payment_id, note)
    values (orig.gift_card_id, 'refund', p_amount, v_new, left(p_reason, 200));
  end if;
  if v_session is not null then
    insert into public.cash_transactions (session_id, direction, category, amount, payment_id, created_by, note)
    values (v_session, 'out', 'refund', p_amount, v_new, auth.uid(), left(p_reason, 200));
  end if;
  perform public.refresh_paid_amount(orig.appointment_id, orig.order_id);
  return v_new;
end $$;

-- ─── Annulation / remboursement de commande : le code promo est rendu ───────
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
    perform public.release_order_promotion(o.id);
  end if;

  update public.orders set status = p_status,
    completed_at = case when p_status = 'delivered' then now() else completed_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
  where id = o.id;
  insert into public.order_events (order_id, from_status, to_status, note, actor_id)
  values (o.id, o.status, p_status, left(p_note, 500), auth.uid());
end $$;

-- ─── Commande en ligne : code promo ─────────────────────────────────────────
drop function public.create_public_order(jsonb, text, text, text, text, text, text, public.payment_method, boolean, text);
create function public.create_public_order(
  p_items jsonb,                 -- [{ "variant_id": uuid, "quantity": int }]
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_fulfillment text default 'pickup',
  p_delivery_address text default null,
  p_delivery_notes text default null,
  p_payment_method public.payment_method default null,
  p_marketing_consent boolean default false,
  p_client_key text default null,
  p_promotion_code text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  st public.business_settings;
  v_phone text := public.normalize_phone(p_phone);
  v_customer uuid;
  v_order public.orders;
  v_subtotal bigint := 0;
  v_fee bigint := 0;
  v_promo jsonb;
  v_discount bigint := 0;
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
  if p_payment_method = 'gift_card' then raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023'; end if;

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

  -- Code promo : la boutique ne vend que des produits (les frais de livraison ne sont pas remisés).
  if length(trim(coalesce(p_promotion_code, ''))) > 0 then
    v_promo := public.consume_promotion(p_promotion_code, 0, v_subtotal);
    v_discount := (v_promo ->> 'discount')::bigint;
  end if;

  update public.orders set subtotal = v_subtotal, discount_amount = v_discount, promotion_discount = v_discount,
    promotion_id = (v_promo ->> 'promotion_id')::uuid, promotion_code = v_promo ->> 'code',
    total_amount = v_subtotal - v_discount + v_fee
  where id = v_order.id returning * into v_order;

  insert into public.order_events (order_id, to_status, note) values (v_order.id, 'pending',
    'Commande en ligne' || coalesce(' — code ' || (v_promo ->> 'code'), ''));
  perform public.notify_internal('order.created', 'Nouvelle commande en ligne',
    v_order.reference || ' — ' || trim(p_full_name) || ' — ' || v_order.total_amount || ' FCFA',
    '/admin/commandes/' || v_order.id, 'orders.view');

  return jsonb_build_object('order_id', v_order.id, 'reference', v_order.reference,
    'tracking_code', v_order.tracking_code, 'total_amount', v_order.total_amount,
    'subtotal', v_order.subtotal, 'discount_amount', v_order.discount_amount, 'promotion_code', v_order.promotion_code,
    'delivery_fee', v_order.delivery_fee, 'status', v_order.status);
end $$;

-- Suivi public : affiche aussi la remise.
create or replace function public.track_order(p_reference text, p_secret text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  select jsonb_build_object(
    'reference', o.reference, 'status', o.status, 'fulfillment', o.fulfillment,
    'subtotal', o.subtotal, 'discount_amount', o.discount_amount, 'delivery_fee', o.delivery_fee,
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

-- ─── Caisse : code promo + paiement par carte cadeau ────────────────────────
drop function public.pos_checkout(uuid, jsonb, jsonb, bigint, text, text);
create function public.pos_checkout(
  p_customer_id uuid,
  p_lines jsonb,       -- [{type:'product', variant_id, quantity} | {type:'service', service_id, quantity, unit_price?}]
  p_payments jsonb,    -- [{method, amount, reference?}] ; carte cadeau : {method:'gift_card', amount, reference: <code>}
  p_discount bigint default 0,          -- remise manuelle (permission pos.discount)
  p_note text default null,
  p_idempotency_key text default null,
  p_promotion_code text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_order public.orders;
  v_cust public.customers;
  v_services bigint := 0;
  v_products bigint := 0;
  v_subtotal bigint;
  v_promo jsonb;
  v_promo_discount bigint := 0;
  v_discount bigint;
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
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) > 6 then
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
      v_products := v_products + v_variant.sale_price * v_qty;
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
      v_services := v_services + v_price * v_qty;
    else
      raise exception 'INVALID_LINE_TYPE' using errcode = '22023';
    end if;
  end loop;
  v_subtotal := v_services + v_products;

  if length(trim(coalesce(p_promotion_code, ''))) > 0 then
    v_promo := public.consume_promotion(p_promotion_code, v_services, v_products);
    v_promo_discount := (v_promo ->> 'discount')::bigint;
  end if;
  v_discount := v_promo_discount + coalesce(p_discount, 0);
  if v_discount > v_subtotal then raise exception 'DISCOUNT_TOO_HIGH' using errcode = '22023'; end if;
  v_total := v_subtotal - v_discount;

  for pm in select * from jsonb_array_elements(p_payments) loop
    if (pm ->> 'amount')::bigint is null or (pm ->> 'amount')::bigint <= 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
    if (pm ->> 'method') = 'gift_card' and length(trim(coalesce(pm ->> 'reference', ''))) = 0 then
      raise exception 'GIFT_CARD_CODE_REQUIRED' using errcode = '22023';
    end if;
    v_paid := v_paid + (pm ->> 'amount')::bigint;
  end loop;
  if v_paid <> v_total then
    raise exception 'PAYMENT_MISMATCH' using errcode = 'P0001', detail = format('Total %s FCFA, payé %s FCFA', v_total, v_paid);
  end if;

  update public.orders set subtotal = v_subtotal, discount_amount = v_discount, promotion_discount = v_promo_discount,
    promotion_id = (v_promo ->> 'promotion_id')::uuid, promotion_code = v_promo ->> 'code', total_amount = v_total,
    completed_at = now() where id = v_order.id;

  for pm in select * from jsonb_array_elements(p_payments) loop
    if pm ->> 'method' = 'gift_card' then
      perform public.redeem_gift_card(pm ->> 'reference', (pm ->> 'amount')::bigint, null, v_order.id, p_customer_id, 'full');
      continue;
    end if;
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
  insert into public.order_events (order_id, to_status, note, actor_id) values (v_order.id, 'completed',
    'Vente en caisse' || coalesce(' — code ' || (v_promo ->> 'code'), ''), auth.uid());

  return jsonb_build_object('order_id', v_order.id, 'reference', v_order.reference, 'total_amount', v_total,
    'discount_amount', v_discount, 'promotion_discount', v_promo_discount, 'promotion_code', v_promo ->> 'code');
end $$;

-- ─── Droits d'exécution ─────────────────────────────────────────────────────
revoke execute on function
  public.evaluate_promotion(text, bigint, bigint, boolean),
  public.consume_promotion(text, bigint, bigint),
  public.release_order_promotion(uuid),
  public.redeem_gift_card(text, bigint, uuid, uuid, uuid, public.payment_kind, text, text),
  public.apply_gift_card_transaction(),
  public.guard_gift_card_balance(),
  public.check_promotion(text, jsonb, text),
  public.create_public_order(jsonb, text, text, text, text, text, text, public.payment_method, boolean, text, text),
  public.pos_checkout(uuid, jsonb, jsonb, bigint, text, text, text),
  public.issue_gift_card(bigint, text, date, uuid, public.payment_method, text, text),
  public.gift_card_lookup(text),
  public.pos_preview_promotion(text, jsonb)
from public, anon, authenticated;

grant execute on function
  public.check_promotion(text, jsonb, text),
  public.create_public_order(jsonb, text, text, text, text, text, text, public.payment_method, boolean, text, text)
to anon, authenticated;

grant execute on function
  public.pos_checkout(uuid, jsonb, jsonb, bigint, text, text, text),
  public.issue_gift_card(bigint, text, date, uuid, public.payment_method, text, text),
  public.gift_card_lookup(text),
  public.pos_preview_promotion(text, jsonb)
to authenticated;
