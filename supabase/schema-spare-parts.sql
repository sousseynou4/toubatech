-- ────────────────────────────────────────────────────────────────────────────
-- TOUBA TECH — Schéma Pièces Détachées (Agent IA)
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run
-- ────────────────────────────────────────────────────────────────────────────

-- Extension pour recherche full-text accent-insensitive
create extension if not exists "unaccent";

-- ENUMs
do $$ begin
  create type part_stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'on_order');
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- SPARE_PARTS — Catalogue pièces détachées, alimenté par l'agent IA
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.spare_parts (
  id                  uuid primary key default uuid_generate_v4(),

  -- IDENTITÉ — clé externe pour idempotence des UPSERT
  external_id         text unique not null,           -- Ex: "UTOPYA-IP13-SCREEN-OEM"
  supplier            text,                            -- Ex: "Utopya", "Pièces2Mobile"

  -- DESCRIPTIF
  name                text not null,                   -- "Écran iPhone 13 OEM Noir"
  description         text,
  category            text not null,                   -- "ecran", "batterie", "connecteur-charge"...
  brand               text not null,                   -- "Apple", "Samsung", "Universal"
  device_model        text,                            -- "iPhone 13", "Galaxy S22"
  quality_grade       text,                            -- "OEM", "Compatible Premium", "Service Pack"
  compatibility       text[] default '{}',             -- Modèles compatibles ["iPhone 13", "iPhone 13 Mini"]

  -- TARIFICATION — supplier_price NE DOIT JAMAIS être exposé côté client
  supplier_price_cents int not null check (supplier_price_cents >= 0),
  margin_rate         numeric(4,2) not null default 1.50 check (margin_rate >= 1.0 and margin_rate <= 10.0),
  retail_price_cents  int not null check (retail_price_cents >= 0),
  currency            text not null default 'eur',

  -- STOCK
  stock_status        part_stock_status not null default 'in_stock',
  stock_quantity      int default 0 check (stock_quantity >= 0),

  -- VISUEL
  image_url           text,

  -- ÉTAT
  active              boolean not null default true,    -- Soft-delete (jamais de suppression dure)

  -- MÉTA-AGENT
  last_synced_at      timestamptz not null default now(),  -- Dernière mise à jour par l'agent
  sync_source         text,                                 -- "ai-agent-v1", "manual", etc.

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Index pour performance
create index if not exists spare_parts_external_id_idx on public.spare_parts (external_id);
create index if not exists spare_parts_active_idx on public.spare_parts (active) where active = true;
create index if not exists spare_parts_category_idx on public.spare_parts (category) where active = true;
create index if not exists spare_parts_brand_idx on public.spare_parts (brand) where active = true;
create index if not exists spare_parts_stock_idx on public.spare_parts (stock_status) where active = true;

-- ────────────────────────────────────────────────────────────────────────────
-- COLONNE GÉNÉRÉE search_vector — recherche full-text accent-insensitive
-- ────────────────────────────────────────────────────────────────────────────
alter table public.spare_parts
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('french', coalesce(unaccent(name), '')), 'A') ||
    setweight(to_tsvector('french', coalesce(unaccent(brand), '')), 'A') ||
    setweight(to_tsvector('french', coalesce(unaccent(device_model), '')), 'A') ||
    setweight(to_tsvector('french', coalesce(unaccent(category), '')), 'B') ||
    setweight(to_tsvector('french', coalesce(unaccent(description), '')), 'C') ||
    setweight(to_tsvector('french', coalesce(unaccent(array_to_string(compatibility, ' ')), '')), 'B')
  ) stored;

create index if not exists spare_parts_search_idx on public.spare_parts using gin (search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER : retail_price calculé automatiquement à chaque insert/update
-- Calcul : retail_price_cents = round(supplier_price_cents × margin_rate)
-- Cela évite toute incohérence si l'agent oublie de calculer côté client.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.compute_retail_price()
returns trigger
language plpgsql
as $$
begin
  new.retail_price_cents := round(new.supplier_price_cents * new.margin_rate);
  return new;
end;
$$;

drop trigger if exists spare_parts_compute_price on public.spare_parts;
create trigger spare_parts_compute_price
  before insert or update of supplier_price_cents, margin_rate
  on public.spare_parts
  for each row
  execute function public.compute_retail_price();

-- Trigger updated_at (utilise la fonction touch_updated_at déjà créée pour diagnostics)
drop trigger if exists spare_parts_updated_at on public.spare_parts;
create trigger spare_parts_updated_at
  before update on public.spare_parts
  for each row
  execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
alter table public.spare_parts enable row level security;

-- Policy : lecture publique des pièces actives, SANS exposer le supplier_price
-- (le supplier_price est filtré au niveau SELECT côté serveur,
-- mais on bloque aussi tout accès direct depuis le client)
drop policy if exists "spare_parts_public_read" on public.spare_parts;
-- Pas de policy publique — toute lecture passe par notre API serveur via service_role.
-- Cela garantit que supplier_price reste invisible même en cas de bug côté client.

-- ────────────────────────────────────────────────────────────────────────────
-- LOGS de synchronisation — pour audit
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.sync_logs (
  id              uuid primary key default uuid_generate_v4(),
  source          text not null,                       -- "ai-agent-v1"
  parts_received  int not null default 0,
  parts_created   int not null default 0,
  parts_updated   int not null default 0,
  parts_failed    int not null default 0,
  errors          jsonb,
  duration_ms     int,
  ip_address      text,
  created_at      timestamptz not null default now()
);

create index if not exists sync_logs_created_at_idx on public.sync_logs (created_at desc);

alter table public.sync_logs enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- Seed data — quelques pièces de démonstration pour tester l'affichage
-- (À écraser dès que ton agent IA fait sa première sync)
-- ────────────────────────────────────────────────────────────────────────────
insert into public.spare_parts (external_id, supplier, name, description, category, brand, device_model, quality_grade, compatibility, supplier_price_cents, margin_rate, stock_status, stock_quantity, image_url)
values
  ('DEMO-IP13-SCREEN-OEM', 'Démo', 'Écran iPhone 13 OEM Noir', 'Écran OLED de remplacement qualité OEM avec châssis, vitre tactile et connecteurs.', 'ecran', 'Apple', 'iPhone 13', 'OEM', array['iPhone 13'], 5500, 1.80, 'in_stock', 12, 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=800&q=80'),

  ('DEMO-IP14-SCREEN-OEM', 'Démo', 'Écran iPhone 14 OEM Noir', 'Écran OLED de remplacement qualité OEM avec châssis et connecteurs.', 'ecran', 'Apple', 'iPhone 14', 'OEM', array['iPhone 14'], 7800, 1.75, 'in_stock', 8, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800&q=80'),

  ('DEMO-IP13-BATTERY', 'Démo', 'Batterie iPhone 13', 'Batterie de remplacement 3 240 mAh avec adhésifs.', 'batterie', 'Apple', 'iPhone 13', 'Compatible Premium', array['iPhone 13'], 1800, 2.20, 'in_stock', 25, 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80'),

  ('DEMO-IP12-BATTERY', 'Démo', 'Batterie iPhone 12', 'Batterie de remplacement 2 815 mAh avec adhésifs.', 'batterie', 'Apple', 'iPhone 12', 'Compatible Premium', array['iPhone 12', 'iPhone 12 Mini'], 1600, 2.30, 'in_stock', 18, 'https://images.unsplash.com/photo-1591290619762-e93c5b0a4b87?w=800&q=80'),

  ('DEMO-IP-CHARGER-CONNECTOR', 'Démo', 'Connecteur de charge iPhone Lightning', 'Nappe complète avec connecteur Lightning, microphone et antenne.', 'connecteur-charge', 'Apple', 'iPhone (multi)', 'Compatible Premium', array['iPhone 11', 'iPhone 12', 'iPhone 13'], 900, 2.50, 'in_stock', 30, null),

  ('DEMO-S22-SCREEN-SP', 'Démo', 'Écran Samsung Galaxy S22 Service Pack', 'Écran AMOLED original Samsung Service Pack avec châssis.', 'ecran', 'Samsung', 'Galaxy S22', 'Service Pack', array['Galaxy S22'], 11000, 1.65, 'in_stock', 5, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80'),

  ('DEMO-S22-BATTERY', 'Démo', 'Batterie Samsung Galaxy S22', 'Batterie de remplacement 3 700 mAh.', 'batterie', 'Samsung', 'Galaxy S22', 'Compatible Premium', array['Galaxy S22'], 1900, 2.20, 'low_stock', 3, null),

  ('DEMO-USB-C-CONNECTOR-UNIV', 'Démo', 'Connecteur de charge USB-C universel Android', 'Nappe connecteur USB-C pour réparation Android variés.', 'connecteur-charge', 'Universal', 'Multi-marques', 'Compatible Premium', array['Galaxy S21', 'Galaxy S22', 'Pixel 6', 'Pixel 7'], 700, 2.80, 'in_stock', 50, null)

on conflict (external_id) do nothing;
