import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Truck, Wrench, Search as SearchIcon } from 'lucide-react';
import { Section, Eyebrow } from '@/components/ui/Section';
import { PartsFilters } from '@/components/pieces/PartsFilters';
import { SparePartCard, type SparePart } from '@/components/pieces/SparePartCard';
import { getServerSupabase } from '@/lib/supabase';
import type { StockStatus } from '@/components/pieces/StockBadge';

export const metadata: Metadata = {
  title: 'Pièces détachées — Écrans, batteries, connecteurs',
  description:
    "Catalogue de pièces détachées smartphone et tablette : écrans, batteries, connecteurs de charge, cartes mères. Apple, Samsung, Google Pixel. Atelier TOUBA TECH à Lorient.",
  alternates: { canonical: '/pieces-detachees' },
  openGraph: {
    title: 'Pièces détachées — TOUBA TECH',
    description:
      'Catalogue de pièces détachées pour smartphone et tablette. Qualité OEM, compatible premium, service pack.',
    url: '/pieces-detachees',
  },
};

// The catalog is updated frequently by the AI agent — keep it fresh
export const revalidate = 30;
export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
  stock?: string;
  sort?: string;
}

interface PartRow {
  id: string;
  name: string;
  category: string;
  brand: string;
  device_model: string | null;
  quality_grade: string | null;
  compatibility: string[];
  retail_price_cents: number;
  stock_status: StockStatus;
  image_url: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  ecran: 'Écrans',
  batterie: 'Batteries',
  'connecteur-charge': 'Connecteurs de charge',
  'carte-mere': 'Cartes mères',
  vitre: 'Vitres',
  camera: 'Caméras',
  haut_parleur: 'Haut-parleurs',
  'haut-parleur': 'Haut-parleurs',
  bouton: 'Boutons',
  coque: 'Coques',
  nappe: 'Nappes',
  outils: 'Outils',
};

function humanizeCategory(slug: string): string {
  return CATEGORY_LABELS[slug] || slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

async function getPartsAndFacets(filters: SearchParams) {
  const supabase = getServerSupabase();

  // ── 1. Get filtered list of parts ──────────────────────────
  // IMPORTANT: select EXCLUDES supplier_price_cents & margin_rate.
  // The client must never receive those.
  let query = supabase
    .from('spare_parts')
    .select(
      'id, name, category, brand, device_model, quality_grade, compatibility, retail_price_cents, stock_status, image_url'
    )
    .eq('active', true);

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters.brand && filters.brand !== 'all') {
    query = query.eq('brand', filters.brand);
  }
  if (filters.stock === '1') {
    query = query.in('stock_status', ['in_stock', 'low_stock']);
  }

  // Full-text search via the search_vector tsvector column
  if (filters.q && filters.q.trim().length >= 2) {
    const term = filters.q.trim().split(/\s+/).join(' & ');
    query = query.textSearch('search_vector', term, { type: 'websearch', config: 'french' });
  }

  switch (filters.sort) {
    case 'price-asc':
      query = query.order('retail_price_cents', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('retail_price_cents', { ascending: false });
      break;
    default:
      query = query.order('name', { ascending: true });
  }

  query = query.limit(120);

  const { data: parts, error } = await query;
  if (error) {
    console.error('[pieces] fetch error:', error);
  }

  // ── 2. Facet counts — categories & brands (unfiltered for the chips) ──
  // We fetch a slim row to compute facet counts in memory
  const { data: facetRows } = await supabase
    .from('spare_parts')
    .select('category, brand')
    .eq('active', true);

  const categoryCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();
  for (const row of facetRows ?? []) {
    categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
    brandCounts.set(row.brand, (brandCounts.get(row.brand) ?? 0) + 1);
  }

  const categories = Array.from(categoryCounts.entries())
    .map(([value, count]) => ({ value, label: humanizeCategory(value), count }))
    .sort((a, b) => b.count - a.count);

  const brands = Array.from(brandCounts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count);

  // ── 3. Map snake → camel for the client component ──────────
  const mapped: SparePart[] = (parts ?? []).map((row: PartRow) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    deviceModel: row.device_model,
    qualityGrade: row.quality_grade,
    compatibility: row.compatibility || [],
    retailPriceCents: row.retail_price_cents,
    stockStatus: row.stock_status,
    imageUrl: row.image_url,
  }));

  return { parts: mapped, categories, brands };
}

export default async function PiecesDetacheesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { parts, categories, brands } = await getPartsAndFacets(searchParams);
  const hasActiveSearch = (searchParams.q && searchParams.q.length > 0) || false;
  const totalCount = parts.length;

  return (
    <>
      <Hero />
      <ReassuranceStrip />

      <Section>
        {/* Breadcrumb */}
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase"
        >
          <Link href="/" className="transition-colors hover:text-ink">
            Accueil
          </Link>
          <span className="mx-2 text-ink-300">/</span>
          <span className="text-ink">Pièces détachées</span>
        </nav>

        <div className="space-y-2">
          <Eyebrow>Catalogue</Eyebrow>
          <h1 className="mt-3 text-hero text-ink">
            Pièces détachées pour smartphones et tablettes.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-500">
            Toutes les pièces sont sélectionnées pour leur qualité (OEM, Service Pack ou Compatible Premium)
            et compatibles avec la majorité des smartphones et tablettes Apple, Samsung et Google.
          </p>
        </div>

        {/* Filters */}
        <div className="mt-10">
          <PartsFilters categories={categories} brands={brands} />
        </div>

        {/* Result summary */}
        <div className="mt-8 flex items-baseline justify-between">
          <p className="text-sm text-ink-500">
            <span className="font-medium text-ink">{totalCount}</span>{' '}
            {totalCount > 1 ? 'pièces trouvées' : 'pièce trouvée'}
            {hasActiveSearch && (
              <span className="text-ink-400">
                {' '}
                pour « <span className="font-medium text-ink">{searchParams.q}</span> »
              </span>
            )}
          </p>
          {totalCount >= 120 && (
            <p className="text-xs text-ink-400">
              Affichage limité à 120 résultats — affinez votre recherche
            </p>
          )}
        </div>

        {/* Grid */}
        {parts.length === 0 ? (
          <EmptyState hasSearch={hasActiveSearch} />
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {parts.map((part) => (
              <SparePartCard key={part.id} part={part} />
            ))}
          </div>
        )}
      </Section>

      <CustomRequestCTA />
    </>
  );
}

/* ─────────────────────────────────  HERO  ───────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink/8">
      <div className="absolute inset-0 gradient-mesh opacity-70" aria-hidden="true" />
      <div className="absolute inset-0 grid-bg opacity-30" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 py-22 md:px-8 md:py-30">
        <div className="grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Eyebrow>Catalogue · Lorient</Eyebrow>
            <h1 className="mt-6 text-display text-ink">
              Pièces détachées
              <br />
              <span className="text-emerald">pour pros et particuliers.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-ink-500">
              Écrans, batteries, connecteurs de charge, cartes mères : notre catalogue couvre
              les références les plus demandées des smartphones et tablettes Apple, Samsung et
              Google. Prix nets, et l'atelier vous aide à choisir la bonne référence.
            </p>
          </div>

          <div className="lg:col-span-4 lg:pl-12">
            <div className="rounded-2xl border border-emerald/20 bg-bone/80 p-5 shadow-soft backdrop-blur-sm">
              <p className="font-mono text-[10px] tracking-[0.22em] text-emerald uppercase">
                Professionnels
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                Vous êtes <strong>réparateur, atelier ou revendeur</strong> ? Demandez-nous un
                devis pour vos commandes en quantité.
              </p>
              <Link
                href="mailto:contact@toubatech.eu?subject=Demande%20de%20devis%20pro"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald hover:underline"
              >
                Demander un devis
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────  REASSURANCE  ───────────────────────────────── */
function ReassuranceStrip() {
  const items = [
    {
      icon: ShieldCheck,
      title: 'Pièces sélectionnées',
      description: 'OEM, Service Pack et Compatible Premium uniquement.',
    },
    {
      icon: Truck,
      title: 'Sur commande',
      description: 'Une référence absente du catalogue ? Nous la cherchons pour vous.',
    },
    {
      icon: Wrench,
      title: "Conseil d'atelier",
      description: "Un doute sur la référence ? L'atelier de Lorient vous aide à choisir.",
    },
    {
      icon: SearchIcon,
      title: 'Recherche puissante',
      description: 'Trouvez votre pièce par modèle, marque ou référence.',
    },
  ];
  return (
    <section className="border-b border-ink/8 bg-mist/30">
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-5 py-10 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-bone text-emerald shadow-soft">
              <item.icon className="h-4 w-4" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium tracking-tight text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────  EMPTY STATE  ───────────────────────────────── */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="mt-12 rounded-3xl border border-ink/10 bg-bone p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mist/40">
        <SearchIcon className="h-5 w-5 text-ink-300" />
      </div>
      <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">
        Aucun résultat
      </p>
      <p className="mt-3 text-[15px] text-ink-500">
        {hasSearch
          ? 'Aucune pièce ne correspond à votre recherche.'
          : 'Aucune pièce ne correspond aux filtres sélectionnés.'}
      </p>
      <p className="mt-2 text-sm text-ink-400">
        Vous cherchez une référence précise ?{' '}
        <Link
          href="mailto:contact@toubatech.eu?subject=Recherche%20pièce%20détachée"
          className="font-medium text-emerald hover:underline"
        >
          Contactez-nous
        </Link>
        , nous pouvons la sourcer.
      </p>
    </div>
  );
}

/* ─────────────────────────────────  CUSTOM REQUEST  ───────────────────────────────── */
function CustomRequestCTA() {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-bone p-10 md:p-16">
        <div className="absolute inset-0 gradient-mesh opacity-60" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <Eyebrow>Pièce spécifique introuvable ?</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Nous sourçons sur commande.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-500">
            Modèle rare, référence ancienne, pièce introuvable en France ? Notre réseau de
            fournisseurs nous permet de localiser et de commander des références spécifiques
            sous 3 à 10 jours.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="mailto:contact@toubatech.eu?subject=Recherche%20pièce%20spécifique"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-bone shadow-soft transition-all hover:bg-ink-700"
            >
              Faire une demande
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/diagnostic"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-bone px-6 text-[15px] font-medium text-ink transition-all hover:border-ink/30 hover:bg-mist/40"
            >
              Réparer par TOUBA TECH
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
