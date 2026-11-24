-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 016 CODES PROMO SUR LES RÉSERVATIONS EN LIGNE
-- La remise est calculée en base sur le prix réel de la prestation ; l'acompte
-- est recalculé sur le montant remisé. Une annulation rend l'utilisation du code.
-- Les statistiques déduisent la remise (les lignes de prestation restent au prix catalogue).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.appointments
  add column promotion_id uuid references public.promotions(id) on delete set null,
  add column promotion_code text,
  add column discount_amount bigint not null default 0 check (discount_amount >= 0),
  add column promotion_released boolean not null default false;

-- Annulation : l'utilisation du code est rendue une seule fois (quel que soit le chemin d'annulation).
create or replace function public.trg_appointment_release_promotion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled'
     and new.promotion_id is not null and not new.promotion_released then
    update public.promotions set uses_count = greatest(uses_count - 1, 0) where id = new.promotion_id;
    new.promotion_released := true;
  end if;
  return new;
end $$;
create trigger trg_appointments_release_promotion before update of status on public.appointments
  for each row execute function public.trg_appointment_release_promotion();

-- Aperçu public : remise, total et acompte qu'obtiendrait la cliente (sans consommer le code).
create or replace function public.check_booking_promotion(p_code text, p_service_id uuid, p_client_key text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  svc public.services;
  r jsonb;
  v_discount bigint;
begin
  perform public.check_rate_limit('promo:client:' || coalesce(left(p_client_key, 128), 'unknown'), 20, interval '1 hour');
  select * into svc from public.services where id = p_service_id;
  if not found or not public.service_is_bookable(svc) then return jsonb_build_object('ok', false, 'reason', 'SERVICE_NOT_BOOKABLE'); end if;
  r := public.evaluate_promotion(p_code, svc.price, 0, false);
  if not (r ->> 'ok')::boolean then return r; end if;
  v_discount := (r ->> 'discount')::bigint;
  return (r - 'promotion_id') || jsonb_build_object(
    'price', svc.price,
    'total_amount', svc.price - v_discount,
    'deposit_required', public.compute_deposit(svc.price - v_discount, svc.deposit_amount));
end $$;

-- Réservation publique : code promo facultatif.
drop function public.create_public_booking(uuid, timestamptz, uuid, text, text, text, text, boolean, public.payment_method, text);
create function public.create_public_booking(
  p_service_id uuid,
  p_start timestamptz,
  p_employee_id uuid,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_notes text default null,
  p_marketing_consent boolean default false,
  p_payment_method public.payment_method default null,
  p_client_key text default null,
  p_promotion_code text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  st public.business_settings;
  svc public.services;
  v_phone text := public.normalize_phone(p_phone);
  v_date date;
  v_employee uuid;
  v_customer uuid;
  v_appt public.appointments;
  v_deposit bigint;
  v_emp_name text;
  v_promo jsonb;
  v_discount bigint := 0;
begin
  select * into st from public.business_settings where id = 1;
  if not st.online_booking_enabled then raise exception 'BOOKING_DISABLED' using errcode = 'P0001'; end if;
  if p_full_name is null or length(trim(p_full_name)) not between 2 and 120 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if v_phone is null then raise exception 'INVALID_PHONE' using errcode = '22023'; end if;
  if p_notes is not null and length(p_notes) > 1000 then raise exception 'NOTES_TOO_LONG' using errcode = '22023'; end if;
  if p_payment_method = 'gift_card' then raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023'; end if;

  perform public.check_rate_limit('booking:phone:' || v_phone, 5, interval '1 hour');
  if p_client_key is not null then
    perform public.check_rate_limit('booking:client:' || left(p_client_key, 128), 10, interval '1 hour');
  end if;
  if (select count(*) from public.appointments a join public.customers c on c.id = a.customer_id
      where c.phone = v_phone and a.status = 'pending' and a.start_at > now()) >= st.max_pending_bookings_per_phone then
    raise exception 'TOO_MANY_PENDING' using errcode = 'P0001';
  end if;

  select * into svc from public.services where id = p_service_id;
  if not found or not public.service_is_bookable(svc) then raise exception 'SERVICE_NOT_BOOKABLE' using errcode = 'P0001'; end if;

  v_date := (p_start at time zone coalesce(st.timezone, 'Africa/Dakar'))::date;

  -- Le créneau doit figurer dans les disponibilités calculées par le serveur.
  -- Sans employée choisie : la moins chargée ce jour-là.
  select s.employee_id into v_employee
  from public.get_available_slots(p_service_id, v_date, p_employee_id) s
  where s.slot_start = p_start
  order by (select count(*) from public.appointments a2
            where a2.employee_id = s.employee_id
              and (a2.start_at at time zone coalesce(st.timezone, 'Africa/Dakar'))::date = v_date
              and a2.status in ('pending', 'confirmed', 'deposit_paid', 'in_progress')), s.employee_id
  limit 1;
  if v_employee is null then raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001'; end if;

  -- Code promo : remise sur le prix de la prestation, acompte recalculé sur le montant remisé.
  if length(trim(coalesce(p_promotion_code, ''))) > 0 then
    v_promo := public.consume_promotion(p_promotion_code, svc.price, 0);
    v_discount := (v_promo ->> 'discount')::bigint;
  end if;

  v_customer := public.upsert_customer(p_full_name, v_phone, p_email, p_marketing_consent, 'online_booking');
  v_deposit := public.compute_deposit(svc.price - v_discount, svc.deposit_amount);

  begin
    insert into public.appointments (customer_id, employee_id, start_at, end_at, block_end_at, status, source,
      total_amount, deposit_required, preferred_payment_method, customer_notes,
      promotion_id, promotion_code, discount_amount)
    values (v_customer, v_employee, p_start,
      p_start + make_interval(mins => svc.duration_minutes),
      p_start + make_interval(mins => svc.duration_minutes + svc.buffer_minutes),
      'pending', 'online', svc.price - v_discount, v_deposit, p_payment_method, nullif(trim(coalesce(p_notes, '')), ''),
      (v_promo ->> 'promotion_id')::uuid, v_promo ->> 'code', v_discount)
    returning * into v_appt;
  exception when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end;

  insert into public.appointment_services (appointment_id, service_id, service_name, unit_price, duration_minutes)
  values (v_appt.id, svc.id, svc.name, svc.price, svc.duration_minutes);

  insert into public.appointment_events (appointment_id, event_type, to_status, details)
  values (v_appt.id, 'created', 'pending', jsonb_build_object('source', 'online')
    || case when v_promo is not null then jsonb_build_object('promotion_code', v_promo ->> 'code', 'discount', v_discount) else '{}'::jsonb end);

  select display_name into v_emp_name from public.employees where id = v_employee;

  perform public.notify_internal('appointment.created', 'Nouvelle demande de rendez-vous',
    trim(p_full_name) || ' — ' || svc.name || ' le ' ||
      to_char(p_start at time zone coalesce(st.timezone, 'Africa/Dakar'), 'DD/MM/YYYY à HH24:MI')
      || coalesce(' — code ' || (v_promo ->> 'code'), ''),
    '/admin/rendez-vous/' || v_appt.id, 'appointments.view_all');

  return jsonb_build_object(
    'appointment_id', v_appt.id,
    'reference', v_appt.reference,
    'status', v_appt.status,
    'start_at', v_appt.start_at,
    'end_at', v_appt.end_at,
    'service_name', svc.name,
    'employee_name', v_emp_name,
    'total_amount', v_appt.total_amount,
    'discount_amount', v_appt.discount_amount,
    'promotion_code', v_appt.promotion_code,
    'deposit_required', v_appt.deposit_required
  );
end $$;

-- Consultation publique : affiche aussi la remise.
create or replace function public.get_public_booking(p_reference text, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  select jsonb_build_object(
    'reference', a.reference, 'status', a.status, 'start_at', a.start_at, 'end_at', a.end_at,
    'total_amount', a.total_amount, 'discount_amount', a.discount_amount, 'promotion_code', a.promotion_code,
    'deposit_required', a.deposit_required, 'paid_amount', a.paid_amount,
    'employee_name', e.display_name,
    'services', (select jsonb_agg(jsonb_build_object('name', s.service_name, 'price', s.unit_price, 'duration', s.duration_minutes))
                 from public.appointment_services s where s.appointment_id = a.id)
  ) into r
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  join public.employees e on e.id = a.employee_id
  where a.reference = upper(trim(p_reference)) and c.phone = public.normalize_phone(p_phone);
  return r;
end $$;

-- Statistiques : les remises des rendez-vous sont déduites du chiffre d'affaires net.
create or replace function public.analytics_summary(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_services bigint; v_products bigint; v_discounts bigint; v_cogs bigint; v_cash_in bigint; v_refunds bigint;
  v_expenses bigint; v_deposits bigint; v_total int; v_completed int; v_cancelled int; v_noshow int;
  v_new_customers int; v_orders int; v_tickets int;
begin
  perform public.require_permission('analytics.view');
  if p_to < p_from or p_to - p_from > 1100 then raise exception 'INVALID_RANGE' using errcode = '22023'; end if;

  select coalesce(sum(amount) filter (where line_type = 'service'), 0),
         coalesce(sum(amount) filter (where line_type = 'product'), 0),
         coalesce(sum(cost), 0)
  into v_services, v_products, v_cogs
  from public.v_recognized_sales where day between p_from and p_to;

  select coalesce(sum(discount_amount), 0), count(*) into v_discounts, v_orders
  from public.orders where status in ('delivered', 'completed') and public.local_date(completed_at) between p_from and p_to;
  -- Remises des codes promo sur les rendez-vous terminés (les prestations sont comptées au prix catalogue).
  v_discounts := v_discounts + (select coalesce(sum(discount_amount), 0) from public.appointments
    where status = 'completed' and public.local_date(completed_at) between p_from and p_to);

  select coalesce(sum(amount) filter (where kind <> 'refund'), 0), coalesce(sum(amount) filter (where kind = 'refund'), 0)
  into v_cash_in, v_refunds
  from public.payments where status = 'succeeded' and public.local_date(paid_at) between p_from and p_to;

  select coalesce(sum(amount), 0) into v_expenses from public.expenses where spent_on between p_from and p_to;

  select coalesce(sum(p.amount), 0) into v_deposits
  from public.payments p join public.appointments a on a.id = p.appointment_id
  where p.status = 'succeeded' and p.kind = 'deposit' and a.status in ('pending', 'confirmed', 'deposit_paid', 'in_progress');

  select count(*), count(*) filter (where status = 'completed'), count(*) filter (where status = 'cancelled'),
         count(*) filter (where status = 'no_show')
  into v_total, v_completed, v_cancelled, v_noshow
  from public.appointments where public.local_date(start_at) between p_from and p_to;

  select count(*) into v_new_customers from public.customers where public.local_date(created_at) between p_from and p_to;
  v_tickets := v_completed + v_orders;

  return jsonb_build_object(
    'from', p_from, 'to', p_to,
    'revenue_services', v_services,
    'revenue_products', v_products,
    'discounts', v_discounts,
    'revenue_net', v_services + v_products - v_discounts,
    'cogs', v_cogs,
    'gross_margin_products', v_products - v_cogs,
    'expenses', v_expenses,
    'estimated_result', v_services + v_products - v_discounts - v_cogs - v_expenses,
    'cash_in', v_cash_in,
    'refunds', v_refunds,
    'deposits_held', v_deposits,
    'appointments_total', v_total,
    'appointments_completed', v_completed,
    'appointments_cancelled', v_cancelled,
    'appointments_no_show', v_noshow,
    'cancellation_rate', case when v_total > 0 then round(v_cancelled * 100.0 / v_total, 1) else 0 end,
    'no_show_rate', case when v_total > 0 then round(v_noshow * 100.0 / v_total, 1) else 0 end,
    'new_customers', v_new_customers,
    'orders_completed', v_orders,
    'average_ticket', case when v_tickets > 0 then (v_services + v_products - v_discounts) / v_tickets else 0 end
  );
end $$;

revoke execute on function
  public.trg_appointment_release_promotion(),
  public.check_booking_promotion(text, uuid, text),
  public.create_public_booking(uuid, timestamptz, uuid, text, text, text, text, boolean, public.payment_method, text, text)
from public, anon, authenticated;
grant execute on function
  public.check_booking_promotion(text, uuid, text),
  public.create_public_booking(uuid, timestamptz, uuid, text, text, text, text, boolean, public.payment_method, text, text)
to anon, authenticated;
