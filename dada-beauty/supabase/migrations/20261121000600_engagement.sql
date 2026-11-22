-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 006 AVIS, FIDÉLITÉ, PROMOTIONS, CARTES CADEAUX, DEVIS,
-- NOTIFICATIONS INTERNES, JOURNAL DES MESSAGES SORTANTS
-- ════════════════════════════════════════════════════════════════════════════

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text,
  link text,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  audience_permission text references public.permissions(code) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(recipient_user_id, audience_permission) >= 1)
);
create index notifications_created_idx on public.notifications (created_at desc);

create table public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- Messages sortants (WhatsApp, SMS, email). Statut « not_configured » quand
-- aucun fournisseur n'est connecté : rien n'est prétendu envoyé.
create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  template text not null,
  recipient text not null,
  customer_id uuid references public.customers(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  body text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed', 'not_configured', 'manual')),
  provider_message_id text,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index message_log_created_idx on public.message_log (created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid unique references public.appointments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  display_name text not null check (length(display_name) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  comment text check (length(comment) <= 1500),
  is_verified boolean not null default false,   -- lié à une prestation réellement réalisée
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index reviews_status_idx on public.reviews (status, created_at desc);

-- Avis vérifié : uniquement via le jeton d'un rendez-vous terminé.
create or replace function public.submit_review(p_token text, p_display_name text, p_rating int, p_comment text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare a public.appointments; v_service uuid;
begin
  perform public.check_rate_limit('review:' || left(coalesce(p_token, ''), 32), 5, interval '1 day');
  select * into a from public.appointments where review_token = p_token;
  if not found or a.status <> 'completed' then raise exception 'INVALID_TOKEN' using errcode = 'P0001'; end if;
  if exists (select 1 from public.reviews where appointment_id = a.id) then raise exception 'ALREADY_REVIEWED' using errcode = 'P0001'; end if;
  select service_id into v_service from public.appointment_services where appointment_id = a.id limit 1;
  insert into public.reviews (appointment_id, customer_id, service_id, display_name, rating, comment, is_verified)
  values (a.id, a.customer_id, v_service, trim(p_display_name), p_rating, nullif(trim(coalesce(p_comment, '')), ''), true);
  perform public.notify_internal('review.created', 'Nouvel avis à modérer', p_rating || '/5 — ' || trim(p_display_name),
    '/admin/avis', 'reviews.manage');
end $$;

-- ─── Fidélité ───────────────────────────────────────────────────────────────
create table public.loyalty_accounts (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  points_balance int not null default 0 check (points_balance >= 0),
  lifetime_points int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.loyalty_transactions (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points int not null check (points <> 0),
  reason text not null check (reason in ('appointment_completed', 'order_completed', 'reward_redeemed', 'manual_adjustment', 'expired')),
  appointment_id uuid references public.appointments(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index loyalty_one_award_per_appointment on public.loyalty_transactions (appointment_id) where reason = 'appointment_completed';
create unique index loyalty_one_award_per_order on public.loyalty_transactions (order_id) where reason = 'order_completed';

create or replace function public.apply_loyalty_points(
  p_customer_id uuid, p_points int, p_reason text, p_appointment_id uuid, p_order_id uuid, p_note text
) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  insert into public.loyalty_accounts (customer_id) values (p_customer_id) on conflict do nothing;
  insert into public.loyalty_transactions (customer_id, points, reason, appointment_id, order_id, note, created_by)
  values (p_customer_id, p_points, p_reason, p_appointment_id, p_order_id, p_note, auth.uid());
  update public.loyalty_accounts set points_balance = points_balance + p_points,
    lifetime_points = lifetime_points + greatest(p_points, 0), updated_at = now()
  where customer_id = p_customer_id;
exception when check_violation then
  raise exception 'INSUFFICIENT_POINTS' using errcode = 'P0001';
end $$;

-- Points attribués uniquement à une prestation TERMINÉE et INTÉGRALEMENT PAYÉE.
create or replace function public.award_appointment_loyalty(p_appointment_id uuid) returns int
language plpgsql volatile security definer set search_path = public as $$
declare
  st public.business_settings;
  a public.appointments;
  v_points int;
begin
  select * into st from public.business_settings where id = 1;
  if not st.loyalty_enabled or st.loyalty_points_per_1000_xof <= 0 then return 0; end if;
  select * into a from public.appointments where id = p_appointment_id;
  if a.status <> 'completed' or a.paid_amount < a.total_amount then return 0; end if;
  if exists (select 1 from public.loyalty_transactions where appointment_id = a.id and reason = 'appointment_completed') then return 0; end if;
  v_points := (a.total_amount / 1000) * st.loyalty_points_per_1000_xof;
  if v_points <= 0 then return 0; end if;
  perform public.apply_loyalty_points(a.customer_id, v_points, 'appointment_completed', a.id, null, a.reference);
  return v_points;
end $$;

create or replace function public.trg_appointment_loyalty() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed' or new.paid_amount <> old.paid_amount) then
    perform public.award_appointment_loyalty(new.id);
  end if;
  return new;
end $$;
create trigger trg_appointments_loyalty after update of status, paid_amount on public.appointments
  for each row execute function public.trg_appointment_loyalty();

create or replace function public.adjust_loyalty(p_customer_id uuid, p_points int, p_note text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.require_permission('loyalty.manage');
  if length(coalesce(trim(p_note), '')) < 3 then raise exception 'NOTE_REQUIRED' using errcode = '22023'; end if;
  perform public.apply_loyalty_points(p_customer_id, p_points,
    case when p_points < 0 then 'reward_redeemed' else 'manual_adjustment' end, null, null, p_note);
end $$;

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value bigint not null check (discount_value > 0),
  min_amount bigint not null default 0 check (min_amount >= 0),
  applies_to text not null default 'all' check (applies_to in ('all', 'services', 'products')),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int check (max_uses > 0),
  uses_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);

create table public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.gen_reference(null, 12),
  initial_amount bigint not null check (initial_amount > 0),
  balance bigint not null check (balance >= 0),
  purchaser_customer_id uuid references public.customers(id) on delete set null,
  recipient_name text,
  expires_on date,
  is_active boolean not null default true,
  sold_payment_id uuid references public.payments(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (balance <= initial_amount)
);
create trigger trg_audit_gift_cards after insert or update or delete on public.gift_cards
  for each row execute function public.audit_trigger();

-- ─── Devis événementiels ────────────────────────────────────────────────────
create table public.event_quotes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.gen_reference('DEV'),
  customer_id uuid references public.customers(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  event_type text not null check (event_type in ('mariage', 'bapteme', 'anniversaire', 'ceremonie', 'domicile', 'autre')),
  event_date date not null,
  event_location text not null,
  people_count int not null check (people_count between 1 and 200),
  services_wanted text[] not null default '{}',
  budget_hint bigint check (budget_hint >= 0),
  message text,
  inspiration_paths text[] not null default '{}',   -- bucket privé « quote-inspirations »
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'accepted', 'declined', 'cancelled')),
  quoted_amount bigint check (quoted_amount >= 0),
  quote_details text,
  quoted_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_quotes_status_idx on public.event_quotes (status, event_date);
create trigger trg_event_quotes_updated before update on public.event_quotes
  for each row execute function public.set_updated_at();
create trigger trg_audit_event_quotes after update on public.event_quotes
  for each row execute function public.audit_trigger();

create or replace function public.create_event_quote(
  p_full_name text, p_phone text, p_email text, p_event_type text, p_event_date date, p_event_location text,
  p_people_count int, p_services_wanted text[], p_budget_hint bigint, p_message text,
  p_inspiration_paths text[], p_client_key text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_phone text := public.normalize_phone(p_phone); v_customer uuid; v_q public.event_quotes;
begin
  if v_phone is null then raise exception 'INVALID_PHONE' using errcode = '22023'; end if;
  if p_event_date < (now() at time zone 'Africa/Dakar')::date then raise exception 'DATE_IN_PAST' using errcode = '22023'; end if;
  if coalesce(cardinality(p_inspiration_paths), 0) > 5 then raise exception 'TOO_MANY_FILES' using errcode = '22023'; end if;
  perform public.check_rate_limit('quote:phone:' || v_phone, 3, interval '1 day');
  if p_client_key is not null then perform public.check_rate_limit('quote:client:' || left(p_client_key, 128), 5, interval '1 day'); end if;
  v_customer := public.upsert_customer(p_full_name, v_phone, p_email, false, 'quote');
  insert into public.event_quotes (customer_id, full_name, phone, email, event_type, event_date, event_location,
    people_count, services_wanted, budget_hint, message, inspiration_paths)
  values (v_customer, trim(p_full_name), v_phone, nullif(trim(coalesce(p_email, '')), ''), p_event_type, p_event_date,
    left(trim(p_event_location), 300), p_people_count, coalesce(p_services_wanted, '{}'), p_budget_hint,
    left(p_message, 2000), coalesce(p_inspiration_paths, '{}'))
  returning * into v_q;
  perform public.notify_internal('quote.created', 'Nouvelle demande de devis',
    v_q.reference || ' — ' || p_event_type || ' le ' || to_char(p_event_date, 'DD/MM/YYYY'), '/admin/devis/' || v_q.id, 'quotes.manage');
  return jsonb_build_object('reference', v_q.reference);
end $$;
