import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Check, Leaf, ShieldCheck, ArrowLeft, RefreshCw, Truck } from 'lucide-react';
import { GradeBadge, type Grade } from '@/components/boutique/GradeBadge';
import { AddToCartButton } from '@/components/boutique/AddToCartButton';
import { ProductCard, type Product } from '@/components/boutique/ProductCard';
import { Section } from '@/components/ui/Section';
import { getServerSupabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/cart';

interface ProductDetail extends Product {
  description: string | null;
  features: string[];
  category: string;
}

async function getProduct(slug: string): Promise<ProductDetail | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    slug: data.slug,
    brand: data.brand,
    model: data.model,
    storage: data.storage,
    color: data.color,
    grade: data.grade,
    priceCents: data.price_cents,
    originalPriceCents: data.original_price_cents,
    co2SavedKg: data.co2_saved_kg,
    warrantyMonths: data.warranty_months,
    shortDescription: data.short_description,
    images: data.images || [],
    stock: data.stock,
    description: data.description,
    features: data.features || [],
    category: data.category,
  };
}

async function getRelated(category: string, excludeId: string): Promise<Product[]> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('products')
    .select(
      'id, slug, brand, model, storage, color, grade, price_cents, original_price_cents, co2_saved_kg, warranty_months, short_description, images, stock'
    )
    .eq('active', true)
    .eq('category', category)
    .neq('id', excludeId)
    .limit(4);

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    model: row.model,
    storage: row.storage,
    color: row.color,
    grade: row.grade as Grade,
    priceCents: row.price_cents,
    originalPriceCents: row.original_price_cents,
    co2SavedKg: row.co2_saved_kg,
    warrantyMonths: row.warranty_months,
    shortDescription: row.short_description,
    images: row.images || [],
    stock: row.stock,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Produit introuvable' };

  const name = `${product.brand} ${product.model}${product.storage ? ' ' + product.storage : ''}`;
  return {
    title: `${name} reconditionné Grade ${product.grade}`,
    description:
      product.shortDescription ||
      `${name} reconditionné chez TOUBA TECH à Lorient. Garantie ${product.warrantyMonths} mois. Économie circulaire.`,
    openGraph: {
      title: `${name} reconditionné — TOUBA TECH`,
      description: product.shortDescription || undefined,
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const related = await getRelated(product.category, product.id);
  const fullName = `${product.brand} ${product.model}`;
  const subtitle = [product.storage, product.color].filter(Boolean).join(' · ');
  const savings =
    product.originalPriceCents && product.originalPriceCents > product.priceCents
      ? Math.round(
          ((product.originalPriceCents - product.priceCents) /
            product.originalPriceCents) *
            100
        )
      : null;

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-ink/8 bg-bone">
        <div className="mx-auto max-w-7xl px-5 py-4 md:px-8">
          <nav
            aria-label="Fil d'Ariane"
            className="font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase"
          >
            <Link href="/" className="transition-colors hover:text-ink">
              Accueil
            </Link>
            <span className="mx-2 text-ink-300">/</span>
            <Link href="/boutique" className="transition-colors hover:text-ink">
              Boutique
            </Link>
            <span className="mx-2 text-ink-300">/</span>
            <span className="text-ink">
              {fullName}
            </span>
          </nav>
        </div>
      </div>

      {/* Main product */}
      <Section>
        <Link
          href="/boutique"
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tous les produits
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-ink/10 bg-mist/40">
              <Image
                src={product.images[0] || '/placeholder-product.png'}
                alt={fullName}
                width={1200}
                height={1200}
                priority
                className="h-full w-full object-cover"
              />
              {savings !== null && savings >= 10 && (
                <div className="absolute right-5 top-5 rounded-full bg-ink px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] text-bone uppercase">
                  Économie -{savings}%
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {product.images.slice(1, 5).map((img, i) => (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden rounded-xl border border-ink/10 bg-mist/40"
                  >
                    <Image
                      src={img}
                      alt={`${fullName} vue ${i + 2}`}
                      width={300}
                      height={300}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-3">
              <GradeBadge grade={product.grade} showDescription />
            </div>
            <h1 className="mt-4 text-h1 text-ink">{fullName}</h1>
            {subtitle && <p className="mt-1 text-[15px] text-ink-500">{subtitle}</p>}

            {product.shortDescription && (
              <p className="mt-6 text-[15px] leading-relaxed text-ink-500">
                {product.shortDescription}
              </p>
            )}

            {/* Price + CTA */}
            <div className="mt-8 rounded-2xl border border-ink/10 bg-bone p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
                    Prix
                  </p>
                  <p className="mt-1 text-3xl font-medium tracking-tight text-ink">
                    {formatPrice(product.priceCents)}
                  </p>
                  {product.originalPriceCents && (
                    <p className="mt-0.5 text-sm text-ink-400 line-through">
                      Prix neuf {formatPrice(product.originalPriceCents)}
                    </p>
                  )}
                </div>
                {product.stock > 0 ? (
                  <p className="font-mono text-[10px] tracking-[0.18em] text-emerald uppercase">
                    En stock
                  </p>
                ) : (
                  <p className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
                    Rupture
                  </p>
                )}
              </div>
              {product.stock > 0 && (
                <div className="mt-5">
                  <AddToCartButton product={product} />
                </div>
              )}
              {product.stock > 0 && product.stock <= 2 && (
                <p className="mt-3 text-center text-xs text-amber-700">
                  Plus que {product.stock} en stock — ne tardez pas
                </p>
              )}
            </div>

            {/* Reassurance */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Reassurance icon={ShieldCheck} title={`${product.warrantyMonths} mois`} subtitle="Garantie totale" />
              <Reassurance icon={RefreshCw} title="14 jours" subtitle="Rétractation" />
              <Reassurance icon={Truck} title="48h" subtitle="Expédition" />
            </div>

            {/* CO2 highlight */}
            {product.co2SavedKg !== null && (
              <div className="mt-6 rounded-2xl border border-emerald/20 bg-emerald/5 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                    <Leaf className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {product.co2SavedKg} kg CO₂ évités
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">
                      En choisissant ce reconditionné plutôt qu'un appareil neuf, vous
                      contribuez concrètement à la réduction de l'empreinte carbone du
                      numérique.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            {product.features.length > 0 && (
              <div className="mt-8">
                <p className="font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">
                  Caractéristiques
                </p>
                <ul className="mt-4 space-y-2.5">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-600">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald"
                        strokeWidth={2.5}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Full description */}
        {product.description && (
          <div className="mt-20 max-w-3xl border-t border-ink/8 pt-12">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">
              Description complète
            </p>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
              {product.description}
            </p>
          </div>
        )}
      </Section>

      {/* Related */}
      {related.length > 0 && (
        <Section className="border-t border-ink/8 bg-mist/20">
          <p className="font-mono text-[11px] tracking-[0.22em] text-emerald uppercase">
            Vous aimerez aussi
          </p>
          <h2 className="mt-4 text-h1 text-ink">Dans la même catégorie</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}

      {/* Schema.org Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: fullName,
            description: product.shortDescription,
            image: product.images,
            brand: { '@type': 'Brand', name: product.brand },
            offers: {
              '@type': 'Offer',
              priceCurrency: 'EUR',
              price: (product.priceCents / 100).toFixed(2),
              availability:
                product.stock > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              itemCondition: 'https://schema.org/RefurbishedCondition',
              seller: { '@type': 'Organization', name: 'TOUBA TECH' },
            },
          }),
        }}
      />
    </>
  );
}

function Reassurance({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof ShieldCheck;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink/8 bg-bone p-3">
      <Icon className="h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.6} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink">{title}</p>
        <p className="text-[10px] text-ink-400">{subtitle}</p>
      </div>
    </div>
  );
}
