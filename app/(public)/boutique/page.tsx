import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Leaf, ShieldCheck, RefreshCw, Truck } from 'lucide-react';
import { Section, Eyebrow } from '@/components/ui/Section';
import { ProductCard, type Product } from '@/components/boutique/ProductCard';
import { BoutiqueFilters } from '@/components/boutique/BoutiqueFilters';
import { getServerSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Boutique reconditionné — iPhone, Galaxy & iPad à Lorient',
  description:
    "Smartphones, tablettes et accessoires reconditionnés à Lorient. iPhone, Samsung Galaxy, iPad. Grade A, B ou C. Garantie 12 mois TOUBA TECH. Économie circulaire, livraison Morbihan & toute la France.",
  alternates: { canonical: '/boutique' },
  openGraph: {
    title: 'Boutique reconditionné — TOUBA TECH',
    description:
      'Téléphones et tablettes reconditionnés garantis 12 mois. Reconditionnement local à Lorient.',
    url: '/boutique',
  },
};

// Don't cache aggressively — products may go in/out of stock often
export const revalidate = 60;

interface SearchParams {
  category?: string;
  grade?: string;
  sort?: string;
}

async function getProducts(filters: SearchParams): Promise<Product[]> {
  const supabase = getServerSupabase();
  let query = supabase
    .from('products')
    .select(
      'id, slug, brand, model, storage, color, grade, price_cents, original_price_cents, co2_saved_kg, warranty_months, short_description, images, stock, category'
    )
    .eq('active', true);

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters.grade && filters.grade !== 'all') {
    query = query.eq('grade', filters.grade);
  }

  switch (filters.sort) {
    case 'price-asc':
      query = query.order('price_cents', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('price_cents', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    console.error('[boutique] failed to fetch products:', error);
    return [];
  }

  // Map snake_case → camelCase for the client component
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    model: row.model,
    storage: row.storage,
    color: row.color,
    grade: row.grade,
    priceCents: row.price_cents,
    originalPriceCents: row.original_price_cents,
    co2SavedKg: row.co2_saved_kg,
    warrantyMonths: row.warranty_months,
    shortDescription: row.short_description,
    images: row.images || [],
    stock: row.stock,
  }));
}

export default async function BoutiquePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const products = await getProducts(searchParams);

  return (
    <>
      <Hero />
      <ReassuranceStrip />

      <Section>
        <BoutiqueFilters />

        {products.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-ink/10 bg-bone p-12 text-center">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">
              Aucun produit
            </p>
            <p className="mt-3 text-[15px] text-ink-500">
              Aucun produit ne correspond aux filtres sélectionnés.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </Section>

      <FinalCTA />
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
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase"
        >
          <Link href="/" className="transition-colors hover:text-ink">
            Accueil
          </Link>
          <span className="mx-2 text-ink-300">/</span>
          <span className="text-ink">Boutique</span>
        </nav>

        <div className="grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow>Reconditionné · Garantie 12 mois</Eyebrow>
            <h1 className="mt-6 text-display text-ink">
              Achetez futé,
              <br />
              <span className="text-emerald">achetez durable.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[18px] leading-relaxed text-ink-500">
              iPhone, Samsung Galaxy, iPad reconditionnés dans notre atelier à Lorient.
              Origine traçable, batterie testée, données effacées de manière sécurisée.
              Économie immédiate, impact environnemental réduit.
            </p>
          </div>

          <div className="lg:col-span-5 lg:pl-12">
            <p className="font-mono text-[10px] tracking-[0.22em] text-emerald uppercase">
              Pourquoi reconditionné ?
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
              Chaque smartphone reconditionné évite l'extraction de 70 nouveaux matériaux
              et économise en moyenne <strong className="text-ink">60 kg de CO₂</strong> par
              rapport à un appareil neuf. Acheter du reconditionné, c'est concrètement
              participer à l'économie circulaire.
            </p>
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
      title: 'Garantie 12 mois',
      description: 'Pièces et main-d\'œuvre, retour à Lorient.',
    },
    {
      icon: RefreshCw,
      title: 'Rétractation 14 jours',
      description: 'Conformément au Code de la consommation.',
    },
    {
      icon: Truck,
      title: 'Livraison France',
      description: "Envoi en France ou retrait à l'atelier de Lorient.",
    },
    {
      icon: Leaf,
      title: 'Impact mesuré',
      description: 'CO₂ économisé indiqué sur chaque produit.',
    },
  ];
  return (
    <section className="border-b border-ink/8 bg-mist/30">
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-5 py-12 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-bone text-emerald shadow-soft">
              <item.icon className="h-4 w-4" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium tracking-tight text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────  CTA  ───────────────────────────────── */
function FinalCTA() {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-bone p-10 md:p-16">
        <div className="absolute inset-0 gradient-mesh opacity-60" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <Eyebrow>Vous ne trouvez pas le modèle ?</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Dites-nous ce que vous cherchez.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-500">
            Nous reconditionnons en continu de nouveaux appareils. Si votre modèle n'est pas en
            stock, contactez-nous — il y a de bonnes chances qu'on l'ait sous peu, ou qu'on
            puisse le sourcer pour vous.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/diagnostic"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-bone shadow-soft transition-all hover:bg-ink-700 hover:shadow-lift"
            >
              Faire une demande
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
