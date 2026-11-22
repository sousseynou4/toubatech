-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 002 CATALOGUE DES PRESTATIONS, ÉQUIPE, DISPONIBILITÉS, MÉDIAS
-- ════════════════════════════════════════════════════════════════════════════

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  path text not null,
  public_url text,
  alt text not null default '',
  caption text,
  category text,                  -- makeup | onglerie | cils | coiffure | boutique | salon
  slot text,                      -- emplacement éditorial (home_hero, about, category_makeup…)
  is_published boolean not null default false,
  is_gallery boolean not null default false,
  is_placeholder boolean not null default false,  -- média provisoire à remplacer
  customer_consent_id uuid,       -- cliente ayant consenti (photo de réalisation)
  sort_order int not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);
create index media_assets_gallery_idx on public.media_assets (is_published, is_gallery, category, sort_order);
create index media_assets_slot_idx on public.media_assets (slot) where slot is not null;

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  tagline text,
  description text,
  image_id uuid references public.media_assets(id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_service_categories_updated before update on public.service_categories
  for each row execute function public.set_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(name) between 2 and 120),
  short_description text,
  description text,
  image_id uuid references public.media_assets(id) on delete set null,
  price bigint check (price >= 0),                       -- null = à configurer
  price_is_from boolean not null default false,          -- affiche « à partir de »
  duration_minutes int check (duration_minutes between 5 and 720),  -- null = à configurer
  buffer_minutes int not null default 0 check (buffer_minutes between 0 and 240),
  deposit_amount bigint check (deposit_amount >= 0),     -- surcharge la politique globale
  is_bookable boolean not null default true,
  is_featured boolean not null default false,
  requires_quote boolean not null default false,         -- prestations événementielles
  conditions text,
  status public.config_status not null default 'to_configure',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_active_requires_config check (
    status <> 'active' or (price is not null and duration_minutes is not null)
  )
);
create index services_category_idx on public.services (category_id, sort_order);
create trigger trg_services_updated before update on public.services
  for each row execute function public.set_updated_at();
create trigger trg_audit_services after update or delete on public.services
  for each row execute function public.audit_trigger();

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(display_name) between 2 and 80),
  full_name text,
  phone text,
  email text,
  bio text,
  specialties text[] not null default '{}',
  photo_id uuid references public.media_assets(id) on delete set null,
  color text not null default '#DFAAB9' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  accepts_online_booking boolean not null default true,
  hired_on date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_employees_updated before update on public.employees
  for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_employee_fk foreign key (employee_id) references public.employees(id) on delete set null;
create unique index profiles_employee_unique on public.profiles (employee_id) where employee_id is not null;

create or replace function public.current_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select employee_id from public.profiles where id = auth.uid() and is_active
$$;

create table public.employee_services (
  employee_id uuid not null references public.employees(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (employee_id, service_id)
);
create index employee_services_service_idx on public.employee_services (service_id);

-- Horaires d'ouverture du salon (1 = lundi … 7 = dimanche, ISO)
create table public.business_hours (
  weekday smallint primary key check (weekday between 1 and 7),
  is_closed boolean not null default true,
  open_time time,
  close_time time,
  constraint business_hours_valid check (is_closed or (open_time is not null and close_time is not null and open_time < close_time))
);
create trigger trg_audit_business_hours after update on public.business_hours
  for each row execute function public.audit_trigger();

-- Fermetures exceptionnelles (jours fériés, congés annuels…)
create table public.business_closures (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (start_date <= end_date)
);

-- Plages de travail des employées : plusieurs plages par jour possibles
-- (les pauses sont les trous entre les plages).
create table public.employee_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);
create index employee_schedules_idx on public.employee_schedules (employee_id, weekday);

-- Absences / congés / indisponibilités exceptionnelles
create table public.employee_time_off (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  period tstzrange not null check (not isempty(period)),
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index employee_time_off_idx on public.employee_time_off using gist (employee_id, period);
