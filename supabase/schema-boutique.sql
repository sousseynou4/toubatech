-- ────────────────────────────────────────────────────────────────────────────
-- TOUBA TECH — Schéma Boutique
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run
-- (peut être exécuté plusieurs fois sans danger — toutes les commandes sont idempotentes)
-- ────────────────────────────────────────────────────────────────────────────

-- ENUMs
do $$ begin
  create type product_grade as enum ('A', 'B', 'C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_category as enum ('smartphone', 'tablette', 'accessoire');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'pending',      -- Session Stripe créée, pas encore payée
    'paid',         -- Webhook Stripe confirme le paiement
    'preparing',    -- Préparation de la commande à l'atelier
    'shipped',      -- Expédiée
    'delivered',    -- Livrée
    'cancelled',    -- Annulée
    'refunded'      -- Remboursée
  );
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- PRODUCTS — Catalogue reconditionné
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                  uuid primary key default uuid_generate_v4(),
  slug                text unique not null,          -- URL-friendly (ex: iphone-13-128go-grade-a)
  category            product_category not null,
  brand               text not null,
  model               text not null,
  storage             text,                          -- "128 Go", "256 Go", null pour accessoires
  color               text,
  grade               product_grade not null,
  price_cents         int not null check (price_cents > 0),
  original_price_cents int,                          -- Prix neuf de référence (pour affichage économie)
  co2_saved_kg        numeric(6,2),                  -- Économie CO2 estimée
  warranty_months     int not null default 12,
  stock               int not null default 1 check (stock >= 0),
  description         text,
  short_description   text,
  features            text[] default '{}',           -- Bullet points
  images              text[] default '{}',           -- URLs ordonnées (1ère = principale)
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists products_slug_idx on public.products (slug);
create index if not exists products_category_idx on public.products (category) where active = true;
create index if not exists products_grade_idx on public.products (grade) where active = true;
create index if not exists products_active_idx on public.products (active, created_at desc);

-- Mise à jour auto de updated_at
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row
  execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- ORDERS — Commandes
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                      uuid primary key default uuid_generate_v4(),
  reference               text unique not null,                  -- Format: ORD-YYMMDD-XXXX
  status                  order_status not null default 'pending',

  -- Stripe
  stripe_session_id       text unique,
  stripe_payment_intent   text,

  -- Client (pas de compte utilisateur pour l'instant — guest checkout)
  customer_email          text not null,
  customer_name           text,
  customer_phone          text,

  -- Adresse de livraison (jsonb pour flexibilité)
  shipping_address        jsonb,

  -- Montants en centimes
  subtotal_cents          int not null,
  shipping_cents          int not null default 0,
  total_cents             int not null,
  currency                text not null default 'eur',

  -- Items achetés (snapshot au moment de la commande, jsonb pour ne pas dépendre des produits)
  -- Format: [{ product_id, slug, name, grade, price_cents, quantity }, ...]
  items                   jsonb not null,

  -- Métadonnées
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  paid_at                 timestamptz,
  shipped_at              timestamptz
);

create index if not exists orders_reference_idx on public.orders (reference);
create index if not exists orders_email_idx on public.orders (customer_email);
create index if not exists orders_stripe_session_idx on public.orders (stripe_session_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row
  execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
-- Products : lecture publique (catalogue visible par tous), écriture via service_role
alter table public.products enable row level security;
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (active = true);

-- Orders : lecture/écriture uniquement via service_role (jamais d'accès direct client)
alter table public.orders enable row level security;
-- Aucune policy publique → blocage par défaut

-- ────────────────────────────────────────────────────────────────────────────
-- Seed data — Quelques produits de test pour démarrer
-- (À remplacer par tes vrais produits Leboncoin une fois prêt)
-- ────────────────────────────────────────────────────────────────────────────
insert into public.products (slug, category, brand, model, storage, color, grade, price_cents, original_price_cents, co2_saved_kg, description, short_description, features, images)
values
  ('iphone-13-128go-noir-grade-a', 'smartphone', 'Apple', 'iPhone 13', '128 Go', 'Noir Minuit', 'A', 47900, 80900, 67.5,
   'iPhone 13 reconditionné en parfait état esthétique (Grade A). Batterie testée à 88% de capacité minimum. Vendu nu, sans accessoires d''origine — fourni avec câble Lightning compatible et notice rapide. Garantie 12 mois TOUBA TECH pièces et main-d''œuvre.',
   'iPhone 13 128 Go, Grade A, batterie ≥ 88%',
   array['Écran OLED Super Retina XDR 6,1"', 'Puce A15 Bionic', 'Double caméra 12 Mpx', 'Compatible 5G', 'Reconditionné dans notre atelier à Lorient', 'Désinfecté UV-C, données effacées de manière sécurisée'],
   array['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=1200&q=80']),

  ('iphone-12-64go-bleu-grade-b', 'smartphone', 'Apple', 'iPhone 12', '64 Go', 'Bleu Pacifique', 'B', 32900, 64900, 64.2,
   'iPhone 12 reconditionné, état correct (Grade B) — micro-rayures sur la coque possibles, écran parfait. Batterie ≥ 85%. Idéal premier smartphone enfant ou usage secondaire. Garantie 12 mois.',
   'iPhone 12 64 Go, Grade B, micro-rayures coque',
   array['Écran OLED 6,1"', 'Puce A14 Bionic', 'Compatible 5G', 'Reconditionné à Lorient', 'Batterie ≥ 85%'],
   array['https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?w=1200&q=80']),

  ('samsung-galaxy-s22-128go-grade-a', 'smartphone', 'Samsung', 'Galaxy S22', '128 Go', 'Phantom Black', 'A', 36900, 84900, 71.8,
   'Samsung Galaxy S22 reconditionné Grade A, comme neuf. Écran Dynamic AMOLED 2X 120Hz parfaitement préservé. Triple capteur photo, processeur Snapdragon 8 Gen 1 ou Exynos 2200 selon arrivage.',
   'Galaxy S22 128 Go, Grade A, écran impeccable',
   array['Écran Dynamic AMOLED 2X 6,1" 120Hz', 'Triple capteur 50+12+10 Mpx', 'Compatible 5G', 'IP68', 'Garantie 12 mois'],
   array['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1200&q=80']),

  ('iphone-se-2022-64go-grade-a', 'smartphone', 'Apple', 'iPhone SE 2022', '64 Go', 'Minuit', 'A', 26900, 52900, 58.4,
   'iPhone SE 3ème génération (2022), Grade A. Touch ID, format compact, idéal usage quotidien. Puce A15 Bionic — performances équivalentes à un iPhone 13.',
   'iPhone SE 2022, Grade A, Touch ID',
   array['Écran Retina HD 4,7"', 'Touch ID', 'Puce A15 Bionic', 'Compatible 5G', 'Format compact'],
   array['https://images.unsplash.com/photo-1592286927505-1def25115558?w=1200&q=80']),

  ('ipad-air-2022-64go-wifi-grade-a', 'tablette', 'Apple', 'iPad Air 2022', '64 Go', 'Gris Sidéral', 'A', 44900, 79900, 82.3,
   'iPad Air 5ème génération, puce M1, Grade A. Écran Liquid Retina 10,9 pouces, parfait pour la création et la productivité. WiFi uniquement.',
   'iPad Air M1 64 Go WiFi, Grade A',
   array['Puce Apple M1', 'Écran Liquid Retina 10,9"', 'Compatible Apple Pencil 2', 'USB-C', 'Garantie 12 mois'],
   array['https://images.unsplash.com/photo-1561154464-82e9adf32764?w=1200&q=80']),

  ('samsung-galaxy-tab-s7-grade-b', 'tablette', 'Samsung', 'Galaxy Tab S7', '128 Go', 'Mystic Black', 'B', 29900, 64900, 78.9,
   'Galaxy Tab S7 reconditionné, Grade B. Quelques micro-rayures à l''arrière, écran AMOLED 120Hz impeccable. S Pen inclus.',
   'Galaxy Tab S7 128 Go, Grade B, S Pen inclus',
   array['Écran AMOLED 11" 120Hz', 'S Pen inclus', 'Snapdragon 865+', 'Quad speakers AKG', 'Compatible DeX'],
   array['https://images.unsplash.com/photo-1632634571161-0bdb88f4c8b3?w=1200&q=80']),

  ('iphone-11-128go-vert-grade-c', 'smartphone', 'Apple', 'iPhone 11', '128 Go', 'Vert', 'C', 22900, 44900, 59.7,
   'iPhone 11 reconditionné Grade C — état d''usage avec rayures visibles sur la coque, écran fonctionnel sans défaut critique. Batterie ≥ 80%. Petit prix, gros usage.',
   'iPhone 11 128 Go, Grade C, état d''usage',
   array['Écran Liquid Retina HD 6,1"', 'Puce A13 Bionic', 'Double caméra 12 Mpx', 'Étanche IP68', 'Garantie 12 mois TOUBA TECH'],
   array['https://images.unsplash.com/photo-1574755393849-623942496936?w=1200&q=80']),

  ('chargeur-magsafe-officiel', 'accessoire', 'Apple', 'Chargeur MagSafe', null, 'Blanc', 'A', 3900, 4900, 0.8,
   'Chargeur MagSafe officiel Apple, reconditionné Grade A. Câble USB-C. Recharge sans fil jusqu''à 15W pour iPhone 12 et supérieurs.',
   'MagSafe Apple, Grade A',
   array['Charge sans fil 15W', 'Câble USB-C inclus', 'Compatible iPhone 12+', 'Câble 1 mètre'],
   array['https://images.unsplash.com/photo-1625948515291-69613efd103f?w=1200&q=80'])

on conflict (slug) do nothing;
