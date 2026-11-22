-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 001 FOUNDATION
-- Extensions, types, utilitaires, paramètres entreprise, rôles & permissions,
-- profils, journal d'audit.
-- Convention : montants en FCFA (XOF) entiers (bigint) — le XOF n'a pas de
-- subdivision, aucun flottant n'est utilisé. Fuseau : Africa/Dakar.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ─── Types ──────────────────────────────────────────────────────────────────
create type public.app_role as enum ('super_admin', 'owner', 'manager', 'staff', 'sales');

create type public.config_status as enum ('to_configure', 'active', 'inactive');

create type public.appointment_status as enum (
  'pending', 'confirmed', 'deposit_paid', 'in_progress', 'completed', 'cancelled', 'no_show'
);

create type public.order_status as enum (
  'pending', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'delivered',
  'completed', 'cancelled', 'refunded'
);

create type public.payment_method as enum ('cash', 'wave', 'orange_money', 'card', 'bank_transfer', 'gift_card', 'other');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'cancelled');
create type public.payment_kind as enum ('deposit', 'balance', 'full', 'refund');

create type public.stock_reason as enum (
  'initial', 'purchase', 'sale', 'order_reserved', 'order_released', 'return', 'adjustment', 'loss'
);

-- ─── Utilitaires ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Normalise un numéro sénégalais/international en E.164 (+221XXXXXXXXX).
create or replace function public.normalize_phone(p text) returns text
language plpgsql immutable as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '[^0-9]', '', 'g');
  if d like '00%' then d := substr(d, 3); end if;
  if length(d) = 9 and left(d, 1) in ('7', '3') then d := '221' || d; end if;
  if length(d) < 8 or length(d) > 15 then return null; end if;
  return '+' || d;
end $$;

-- Référence lisible : PREFIX-AAMMJJ-XXXXX (alphabet sans caractères ambigus)
create or replace function public.gen_reference(prefix text, len int default 5) returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(len);
  out text := '';
  i int;
begin
  for i in 0 .. len - 1 loop
    out := out || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  if prefix is null then return out; end if;
  return prefix || '-' || to_char(now() at time zone 'Africa/Dakar', 'YYMMDD') || '-' || out;
end $$;

-- ─── Paramètres de l'entreprise (ligne unique) ──────────────────────────────
create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Dada Beauty',
  tagline text,
  description text,
  phone text not null default '+221778088893',
  whatsapp_phone text not null default '+221778088893',
  email text,
  address_line text not null default 'Secteur Deux Boulangeries',
  city text not null default 'Guédiawaye, Dakar',
  country text not null default 'Sénégal',
  map_embed_url text,               -- à configurer : aucune coordonnée GPS inventée
  logo_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  snapchat_url text,
  currency char(3) not null default 'XOF',
  timezone text not null default 'Africa/Dakar',
  -- Réservation
  online_booking_enabled boolean not null default true,
  slot_interval_minutes int not null default 30 check (slot_interval_minutes between 5 and 120),
  booking_min_lead_minutes int not null default 120 check (booking_min_lead_minutes >= 0),
  booking_max_days_ahead int not null default 60 check (booking_max_days_ahead between 1 and 365),
  max_pending_bookings_per_phone int not null default 3 check (max_pending_bookings_per_phone between 1 and 20),
  deposit_policy text not null default 'none' check (deposit_policy in ('none', 'percent', 'fixed')),
  deposit_value bigint not null default 0 check (deposit_value >= 0),
  cancellation_policy text,
  booking_terms text,
  -- Boutique
  shop_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default false,
  delivery_fee bigint check (delivery_fee >= 0),
  delivery_zones_note text,
  -- Paiements (identifiants marchands affichés ; les clés API restent en variables d'env)
  accepted_payment_methods public.payment_method[] not null default array['cash']::public.payment_method[],
  wave_merchant_display text,
  orange_money_merchant_display text,
  -- Fidélité
  loyalty_enabled boolean not null default false,
  loyalty_points_per_1000_xof int not null default 0 check (loyalty_points_per_1000_xof >= 0),
  -- Onboarding
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger trg_business_settings_updated before update on public.business_settings
  for each row execute function public.set_updated_at();

-- ─── Rôles & permissions ────────────────────────────────────────────────────
create table public.roles (
  code public.app_role primary key,
  label text not null,
  description text,
  rank int not null           -- plus petit = plus de pouvoir
);

create table public.permissions (
  code text primary key check (code ~ '^[a-z_]+\.[a-z_]+$'),
  module text not null,
  label text not null
);

create table public.role_permissions (
  role public.app_role not null references public.roles(code) on delete cascade,
  permission text not null references public.permissions(code) on delete cascade,
  primary key (role, permission)
);

-- ─── Profils (1:1 avec auth.users) ──────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'staff',
  employee_id uuid,               -- FK ajoutée après la table employees
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Permission de l'utilisateur courant (utilisée par la RLS et les RPC).
create or replace function public.has_permission(perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = auth.uid() and p.is_active and rp.permission = perm
  )
$$;

create or replace function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.require_permission(perm text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission(perm) then
    raise exception 'PERMISSION_DENIED: %', perm using errcode = '42501';
  end if;
end $$;

-- Garde-fous sur les rôles : personne ne modifie son propre rôle, seul un
-- super_admin attribue super_admin, seul owner/super_admin attribue owner.
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor_role public.app_role := public.current_app_role();
begin
  if auth.uid() is null then return new; end if;  -- service_role / scripts d'admin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if new.id = auth.uid() then
      raise exception 'Vous ne pouvez pas modifier votre propre rôle' using errcode = '42501';
    end if;
    if (new.role = 'super_admin' or old.role = 'super_admin') and actor_role <> 'super_admin' then
      raise exception 'Seul un super administrateur peut gérer ce rôle' using errcode = '42501';
    end if;
    if (new.role = 'owner' or old.role = 'owner') and actor_role not in ('super_admin', 'owner') then
      raise exception 'Seul la propriétaire peut gérer ce rôle' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'INSERT' and new.role in ('super_admin', 'owner') and actor_role not in ('super_admin', 'owner') then
    raise exception 'Rôle non autorisé' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger trg_profiles_guard_role before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- ─── Journal d'audit ────────────────────────────────────────────────────────
create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_role text,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb
);
create index audit_logs_table_idx on public.audit_logs (table_name, occurred_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, occurred_at desc);

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec_id text;
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and o = n then return new; end if;
  rec_id := coalesce(n ->> 'id', o ->> 'id');
  insert into public.audit_logs (actor_id, actor_role, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), coalesce(public.current_app_role()::text, auth.role(), current_user),
          tg_table_name, rec_id, tg_op, o, n);
  return coalesce(new, old);
end $$;

create trigger trg_audit_business_settings after update on public.business_settings
  for each row execute function public.audit_trigger();
create trigger trg_audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();
create trigger trg_audit_role_permissions after insert or update or delete on public.role_permissions
  for each row execute function public.audit_trigger();

-- Limitation anti-abus générique (clé = action + identifiant).
create table public.rate_limits (
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_limits_key_idx on public.rate_limits (key, created_at desc);

create or replace function public.check_rate_limit(p_key text, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.rate_limits where created_at < now() - interval '2 days';
  if (select count(*) from public.rate_limits where key = p_key and created_at > now() - p_window) >= p_max then
    raise exception 'RATE_LIMITED' using errcode = 'P0429',
      hint = 'Trop de tentatives, merci de réessayer plus tard ou de nous contacter sur WhatsApp.';
  end if;
  insert into public.rate_limits (key) values (p_key);
end $$;
