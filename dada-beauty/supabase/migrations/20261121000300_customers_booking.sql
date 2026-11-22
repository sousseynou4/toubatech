-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 003 CLIENTES & MOTEUR DE RÉSERVATION
-- La prévention des doubles réservations est garantie par PostgreSQL :
-- contrainte d'exclusion GiST sur (employée, plage horaire) pour tous les
-- rendez-vous « bloquants ». Deux transactions simultanées ne peuvent pas
-- réserver la même employée sur des plages qui se chevauchent.
-- ════════════════════════════════════════════════════════════════════════════

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(full_name) between 2 and 120),
  phone text not null unique check (phone ~ '^\+[0-9]{8,15}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  birthday date,
  preferences text,
  internal_notes text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  photo_consent boolean not null default false,
  photo_consent_at timestamptz,
  source text not null default 'admin' check (source in ('online_booking', 'online_shop', 'admin', 'pos', 'quote', 'import')),
  last_visit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_name_idx on public.customers (lower(full_name));
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_audit_customers after delete on public.customers
  for each row execute function public.audit_trigger();

-- Horodatage automatique des consentements
create or replace function public.customers_consent_ts() returns trigger
language plpgsql as $$
begin
  new.phone := coalesce(public.normalize_phone(new.phone), new.phone);
  if new.marketing_consent and (tg_op = 'INSERT' or not old.marketing_consent) then new.marketing_consent_at := now(); end if;
  if not new.marketing_consent then new.marketing_consent_at := null; end if;
  if new.photo_consent and (tg_op = 'INSERT' or not old.photo_consent) then new.photo_consent_at := now(); end if;
  if not new.photo_consent then new.photo_consent_at := null; end if;
  return new;
end $$;
create trigger trg_customers_consent before insert or update on public.customers
  for each row execute function public.customers_consent_ts();

alter table public.media_assets
  add constraint media_assets_consent_fk foreign key (customer_consent_id) references public.customers(id) on delete set null;

-- ─── Rendez-vous ────────────────────────────────────────────────────────────
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.gen_reference('RDV'),
  customer_id uuid not null references public.customers(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  block_end_at timestamptz not null,           -- fin + temps de préparation
  status public.appointment_status not null default 'pending',
  source text not null default 'online' check (source in ('online', 'admin', 'whatsapp', 'phone', 'walk_in')),
  total_amount bigint not null default 0 check (total_amount >= 0),
  deposit_required bigint not null default 0 check (deposit_required >= 0),
  paid_amount bigint not null default 0,        -- maintenu par les fonctions de paiement
  preferred_payment_method public.payment_method,
  customer_notes text,
  internal_notes text,
  review_token text unique default public.gen_reference(null, 16),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at and block_end_at >= end_at),
  constraint appointments_no_overlap exclude using gist (
    employee_id with =,
    tstzrange(start_at, block_end_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'deposit_paid', 'in_progress'))
);
create index appointments_start_idx on public.appointments (start_at);
create index appointments_customer_idx on public.appointments (customer_id, start_at desc);
create index appointments_employee_idx on public.appointments (employee_id, start_at);
create index appointments_status_idx on public.appointments (status, start_at);
create trigger trg_appointments_updated before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger trg_audit_appointments after insert or update or delete on public.appointments
  for each row execute function public.audit_trigger();

create table public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  service_name text not null,          -- instantané au moment de la réservation
  unit_price bigint not null check (unit_price >= 0),
  duration_minutes int not null check (duration_minutes > 0),
  quantity int not null default 1 check (quantity between 1 and 20)
);
create index appointment_services_appt_idx on public.appointment_services (appointment_id);
create index appointment_services_service_idx on public.appointment_services (service_id);

create table public.appointment_events (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_type text not null,   -- created | status_changed | rescheduled | note | payment
  from_status public.appointment_status,
  to_status public.appointment_status,
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index appointment_events_appt_idx on public.appointment_events (appointment_id, created_at);

-- ─── Fonctions de réservation ───────────────────────────────────────────────

create or replace function public.compute_deposit(p_price bigint, p_service_deposit bigint) returns bigint
language plpgsql stable security definer set search_path = public as $$
declare s public.business_settings;
begin
  select * into s from public.business_settings where id = 1;
  if p_price is null then return 0; end if;
  if p_service_deposit is not null then return least(p_service_deposit, p_price); end if;
  return case s.deposit_policy
    when 'percent' then least(p_price, round(p_price * s.deposit_value / 100.0)::bigint)
    when 'fixed' then least(p_price, s.deposit_value)
    else 0 end;
end $$;

-- Prestation réservable en ligne ?
create or replace function public.service_is_bookable(s public.services) returns boolean
language sql stable as $$
  select s.status = 'active' and s.is_bookable and not s.requires_quote
     and s.price is not null and s.duration_minutes is not null
$$;

-- Créneaux réellement disponibles pour une prestation et une date (heure de Dakar).
create or replace function public.get_available_slots(
  p_service_id uuid, p_date date, p_employee_id uuid default null
) returns table (slot_start timestamptz, slot_end timestamptz, employee_id uuid)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  st public.business_settings;
  svc public.services;
  tz text;
  v_today date;
  v_dow int;
  v_block interval;
  v_step interval;
begin
  select * into st from public.business_settings where id = 1;
  tz := coalesce(st.timezone, 'Africa/Dakar');
  if not st.online_booking_enabled then return; end if;

  select * into svc from public.services where id = p_service_id;
  if not found or not public.service_is_bookable(svc) then return; end if;

  v_today := (now() at time zone tz)::date;
  if p_date < v_today or p_date > v_today + st.booking_max_days_ahead then return; end if;
  if exists (select 1 from public.business_closures c where p_date between c.start_date and c.end_date) then return; end if;

  v_dow := extract(isodow from p_date)::int;
  v_block := make_interval(mins => svc.duration_minutes + svc.buffer_minutes);
  v_step := make_interval(mins => st.slot_interval_minutes);

  return query
  with bh as (
    select h.open_time, h.close_time from public.business_hours h
    where h.weekday = v_dow and not h.is_closed
  ),
  emps as (
    select e.id from public.employees e
    join public.employee_services es on es.employee_id = e.id and es.service_id = p_service_id
    where e.is_active and e.accepts_online_booking
      and (p_employee_id is null or e.id = p_employee_id)
  ),
  windows as (
    select sch.employee_id,
           p_date + greatest(sch.start_time, bh.open_time) as w_start,
           p_date + least(sch.end_time, bh.close_time) as w_end
    from public.employee_schedules sch
    join emps on emps.id = sch.employee_id
    cross join bh
    where sch.weekday = v_dow and greatest(sch.start_time, bh.open_time) < least(sch.end_time, bh.close_time)
  ),
  candidates as (
    select w.employee_id, (t at time zone tz) as c_start
    from windows w
    cross join lateral generate_series(w.w_start, w.w_end - v_block, v_step) as t
  )
  select c.c_start, c.c_start + make_interval(mins => svc.duration_minutes), c.employee_id
  from candidates c
  where c.c_start >= now() + make_interval(mins => st.booking_min_lead_minutes)
    and not exists (
      select 1 from public.appointments a
      where a.employee_id = c.employee_id
        and a.status in ('pending', 'confirmed', 'deposit_paid', 'in_progress')
        and tstzrange(a.start_at, a.block_end_at, '[)') && tstzrange(c.c_start, c.c_start + v_block, '[)')
    )
    and not exists (
      select 1 from public.employee_time_off o
      where o.employee_id = c.employee_id and o.period && tstzrange(c.c_start, c.c_start + v_block, '[)')
    )
  order by c.c_start, c.employee_id;
end $$;

-- Employées habilitées et réservables en ligne pour une prestation (vue publique minimale).
create or replace function public.public_service_employees(p_service_id uuid)
returns table (id uuid, display_name text, specialties text[], photo_url text)
language sql stable security definer set search_path = public as $$
  select e.id, e.display_name, e.specialties, m.public_url
  from public.employees e
  join public.employee_services es on es.employee_id = e.id and es.service_id = p_service_id
  left join public.media_assets m on m.id = e.photo_id and m.is_published
  where e.is_active and e.accepts_online_booking
  order by e.sort_order, e.display_name
$$;

create or replace function public.upsert_customer(
  p_full_name text, p_phone text, p_email text, p_marketing_consent boolean, p_source text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_id uuid;
begin
  if v_phone is null then raise exception 'INVALID_PHONE' using errcode = '22023'; end if;
  insert into public.customers (full_name, phone, email, marketing_consent, source)
  values (trim(p_full_name), v_phone, nullif(trim(coalesce(p_email, '')), ''), coalesce(p_marketing_consent, false), p_source)
  on conflict (phone) do update
    set email = coalesce(public.customers.email, excluded.email),
        marketing_consent = public.customers.marketing_consent or excluded.marketing_consent
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.notify_internal(
  p_type text, p_title text, p_body text, p_link text, p_audience text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- La table notifications est créée dans la migration 006.
  insert into public.notifications (type, title, body, link, audience_permission)
  values (p_type, p_title, p_body, p_link, p_audience);
end $$;

-- Réservation publique (sans compte). Prix, durée, acompte et disponibilité
-- sont TOUJOURS recalculés côté base : aucune valeur financière n'est
-- acceptée depuis le navigateur.
create or replace function public.create_public_booking(
  p_service_id uuid,
  p_start timestamptz,
  p_employee_id uuid,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_notes text default null,
  p_marketing_consent boolean default false,
  p_payment_method public.payment_method default null,
  p_client_key text default null
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
begin
  select * into st from public.business_settings where id = 1;
  if not st.online_booking_enabled then raise exception 'BOOKING_DISABLED' using errcode = 'P0001'; end if;
  if p_full_name is null or length(trim(p_full_name)) not between 2 and 120 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if v_phone is null then raise exception 'INVALID_PHONE' using errcode = '22023'; end if;
  if p_notes is not null and length(p_notes) > 1000 then raise exception 'NOTES_TOO_LONG' using errcode = '22023'; end if;

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

  v_customer := public.upsert_customer(p_full_name, v_phone, p_email, p_marketing_consent, 'online_booking');
  v_deposit := public.compute_deposit(svc.price, svc.deposit_amount);

  begin
    insert into public.appointments (customer_id, employee_id, start_at, end_at, block_end_at, status, source,
      total_amount, deposit_required, preferred_payment_method, customer_notes)
    values (v_customer, v_employee, p_start,
      p_start + make_interval(mins => svc.duration_minutes),
      p_start + make_interval(mins => svc.duration_minutes + svc.buffer_minutes),
      'pending', 'online', svc.price, v_deposit, p_payment_method, nullif(trim(coalesce(p_notes, '')), ''))
    returning * into v_appt;
  exception when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end;

  insert into public.appointment_services (appointment_id, service_id, service_name, unit_price, duration_minutes)
  values (v_appt.id, svc.id, svc.name, svc.price, svc.duration_minutes);

  insert into public.appointment_events (appointment_id, event_type, to_status, details)
  values (v_appt.id, 'created', 'pending', jsonb_build_object('source', 'online'));

  select display_name into v_emp_name from public.employees where id = v_employee;

  perform public.notify_internal('appointment.created', 'Nouvelle demande de rendez-vous',
    trim(p_full_name) || ' — ' || svc.name || ' le ' ||
      to_char(p_start at time zone coalesce(st.timezone, 'Africa/Dakar'), 'DD/MM/YYYY à HH24:MI'),
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
    'deposit_required', v_appt.deposit_required
  );
end $$;

-- Consultation publique d'un rendez-vous : référence + téléphone requis.
create or replace function public.get_public_booking(p_reference text, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  select jsonb_build_object(
    'reference', a.reference, 'status', a.status, 'start_at', a.start_at, 'end_at', a.end_at,
    'total_amount', a.total_amount, 'deposit_required', a.deposit_required, 'paid_amount', a.paid_amount,
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

-- Annulation par la cliente (référence + téléphone), dans le délai autorisé.
create or replace function public.cancel_public_booking(p_reference text, p_phone text, p_reason text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  a public.appointments;
  st public.business_settings;
begin
  select * into st from public.business_settings where id = 1;
  perform public.check_rate_limit('cancel:' || coalesce(public.normalize_phone(p_phone), 'x'), 10, interval '1 hour');
  select ap.* into a from public.appointments ap join public.customers c on c.id = ap.customer_id
  where ap.reference = upper(trim(p_reference)) and c.phone = public.normalize_phone(p_phone)
  for update of ap;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if a.status not in ('pending', 'confirmed') then raise exception 'NOT_CANCELLABLE' using errcode = 'P0001'; end if;
  if a.start_at < now() + make_interval(mins => st.booking_min_lead_minutes) then
    raise exception 'TOO_LATE_TO_CANCEL' using errcode = 'P0001';
  end if;
  update public.appointments set status = 'cancelled', cancelled_at = now(),
    cancel_reason = coalesce(left(p_reason, 500), 'Annulé par la cliente') where id = a.id;
  insert into public.appointment_events (appointment_id, event_type, from_status, to_status, details)
  values (a.id, 'status_changed', a.status, 'cancelled', jsonb_build_object('by', 'customer'));
  perform public.notify_internal('appointment.cancelled', 'Rendez-vous annulé par une cliente',
    a.reference, '/admin/rendez-vous/' || a.id, 'appointments.view_all');
  return jsonb_build_object('reference', a.reference, 'status', 'cancelled');
end $$;

-- Peut-on agir sur ce rendez-vous ?
create or replace function public.can_manage_appointment(p_employee_id uuid, p_full boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_permission('appointments.manage')
      or (not p_full and public.has_permission('appointments.update_own') and p_employee_id = public.current_employee_id())
$$;

-- Création manuelle par l'équipe (téléphone, WhatsApp, sur place…).
create or replace function public.staff_create_appointment(
  p_customer_id uuid,
  p_service_ids uuid[],
  p_employee_id uuid,
  p_start timestamptz,
  p_source text default 'admin',
  p_status public.appointment_status default 'confirmed',
  p_internal_notes text default null,
  p_ignore_hours boolean default false
) returns uuid
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_total bigint := 0;
  v_duration int := 0;
  v_buffer int := 0;
  v_deposit bigint := 0;
  v_appt uuid;
  svc record;
  v_n int;
begin
  perform public.require_permission('appointments.manage');
  if p_status not in ('pending', 'confirmed') then raise exception 'INVALID_INITIAL_STATUS' using errcode = '22023'; end if;
  if p_service_ids is null or cardinality(p_service_ids) = 0 then raise exception 'NO_SERVICE' using errcode = '22023'; end if;
  if not exists (select 1 from public.employees where id = p_employee_id and is_active) then
    raise exception 'INVALID_EMPLOYEE' using errcode = '22023';
  end if;

  select count(*) into v_n from public.services where id = any(p_service_ids);
  if v_n <> (select count(distinct x) from unnest(p_service_ids) x) then raise exception 'INVALID_SERVICE' using errcode = '22023'; end if;

  for svc in select * from public.services where id = any(p_service_ids) loop
    if svc.price is null or svc.duration_minutes is null then
      raise exception 'SERVICE_NOT_CONFIGURED: %', svc.name using errcode = 'P0001';
    end if;
    v_total := v_total + svc.price;
    v_duration := v_duration + svc.duration_minutes;
    v_buffer := greatest(v_buffer, svc.buffer_minutes);
    v_deposit := v_deposit + public.compute_deposit(svc.price, svc.deposit_amount);
  end loop;

  if not p_ignore_hours and exists (
    select 1 from public.employee_time_off o
    where o.employee_id = p_employee_id
      and o.period && tstzrange(p_start, p_start + make_interval(mins => v_duration + v_buffer), '[)')
  ) then
    raise exception 'EMPLOYEE_ON_LEAVE' using errcode = 'P0001';
  end if;

  begin
    insert into public.appointments (customer_id, employee_id, start_at, end_at, block_end_at, status, source,
      total_amount, deposit_required, internal_notes, created_by, confirmed_at)
    values (p_customer_id, p_employee_id, p_start,
      p_start + make_interval(mins => v_duration),
      p_start + make_interval(mins => v_duration + v_buffer),
      p_status, coalesce(p_source, 'admin'), v_total, v_deposit, p_internal_notes, auth.uid(),
      case when p_status = 'confirmed' then now() end)
    returning id into v_appt;
  exception when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end;

  insert into public.appointment_services (appointment_id, service_id, service_name, unit_price, duration_minutes)
  select v_appt, s.id, s.name, s.price, s.duration_minutes from public.services s where s.id = any(p_service_ids);

  insert into public.appointment_events (appointment_id, event_type, to_status, details, actor_id)
  values (v_appt, 'created', p_status, jsonb_build_object('source', p_source), auth.uid());
  return v_appt;
end $$;

-- Changement de statut avec machine à états.
create or replace function public.set_appointment_status(
  p_appointment_id uuid, p_status public.appointment_status, p_reason text default null
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  a public.appointments;
  allowed boolean;
begin
  select * into a from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;

  if not public.can_manage_appointment(a.employee_id, p_status not in ('in_progress', 'completed')) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;
  if a.status = p_status then return; end if;

  allowed := case a.status
    when 'pending' then p_status in ('confirmed', 'deposit_paid', 'in_progress', 'cancelled', 'no_show')
    when 'confirmed' then p_status in ('deposit_paid', 'in_progress', 'cancelled', 'no_show', 'pending')
    when 'deposit_paid' then p_status in ('in_progress', 'cancelled', 'no_show')
    when 'in_progress' then p_status in ('completed', 'cancelled')
    else false end;
  if not allowed then
    raise exception 'INVALID_TRANSITION: % -> %', a.status, p_status using errcode = 'P0001';
  end if;
  if p_status = 'deposit_paid' and a.paid_amount < greatest(a.deposit_required, 1) then
    raise exception 'DEPOSIT_NOT_RECORDED' using errcode = 'P0001',
      hint = 'Enregistrez d''abord le paiement de l''acompte dans la caisse.';
  end if;

  begin
    update public.appointments set
      status = p_status,
      confirmed_at = case when p_status = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
      completed_at = case when p_status = 'completed' then now() else completed_at end,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
      cancel_reason = case when p_status in ('cancelled', 'no_show') then left(p_reason, 500) else cancel_reason end
    where id = a.id;
  exception when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end;

  if p_status = 'completed' then
    update public.customers set last_visit_at = now() where id = a.customer_id;
  end if;

  insert into public.appointment_events (appointment_id, event_type, from_status, to_status, details, actor_id)
  values (a.id, 'status_changed', a.status, p_status, jsonb_build_object('reason', p_reason), auth.uid());
end $$;

-- Report d'un rendez-vous (nouvelle date et/ou nouvelle employée).
create or replace function public.reschedule_appointment(
  p_appointment_id uuid, p_new_start timestamptz, p_new_employee_id uuid default null, p_reason text default null
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  a public.appointments;
  v_len interval;
  v_block interval;
begin
  perform public.require_permission('appointments.manage');
  select * into a from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if a.status not in ('pending', 'confirmed', 'deposit_paid') then
    raise exception 'NOT_RESCHEDULABLE' using errcode = 'P0001';
  end if;
  v_len := a.end_at - a.start_at;
  v_block := a.block_end_at - a.start_at;
  begin
    update public.appointments set
      start_at = p_new_start, end_at = p_new_start + v_len, block_end_at = p_new_start + v_block,
      employee_id = coalesce(p_new_employee_id, employee_id)
    where id = a.id;
  exception when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end;
  insert into public.appointment_events (appointment_id, event_type, details, actor_id)
  values (a.id, 'rescheduled', jsonb_build_object(
    'from_start', a.start_at, 'to_start', p_new_start,
    'from_employee', a.employee_id, 'to_employee', coalesce(p_new_employee_id, a.employee_id),
    'reason', p_reason), auth.uid());
end $$;

create or replace function public.update_appointment_notes(p_appointment_id uuid, p_notes text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_appointment_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.can_manage_appointment(a.employee_id, false) then raise exception 'PERMISSION_DENIED' using errcode = '42501'; end if;
  update public.appointments set internal_notes = left(p_notes, 4000) where id = a.id;
end $$;
