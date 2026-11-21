import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle, Store } from 'lucide-react';
import { ArtImage } from '@/components/ui/art-image';
import { AddToCart } from '@/components/shop/add-to-cart';
import { getProduct, getSettings } from '@/server/catalog';
import { whatsappLink } from '@/lib/phone';
import { env } from '@/lib/env';

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<'/boutique/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Produit' };
  return { title: p.name, description: p.short_description ?? `${p.name} disponible chez Dada Beauty, Guédiawaye.`, alternates: { canonical: `/boutique/${p.slug}` } };
}

export default async function ProductPage({ params }: PageProps<'/boutique/[slug]'>) {
  const { slug } = await params;
  const [product, { settings }] = await Promise.all([getProduct(slug), getSettings()]);
  if (!product || !product.variants?.length) notFound();
  const images = [product.image, ...product.gallery].filter((m): m is NonNullable<typeof m> => Boolean(m?.public_url));
  const prices = product.variants.map((v) => v.sale_price!);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.short_description ?? undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined, image: images.map((i) => i.public_url),
    offers: { '@type': 'AggregateOffer', priceCurrency: 'XOF', lowPrice: Math.min(...prices), highPrice: Math.max(...prices),
      availability: product.variants.some((v) => v.stock_quantity > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${env.siteUrl}/boutique/${product.slug}` },
  };

  return (
    <div className="container-page py-10 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Link href="/boutique" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Boutique</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="grid gap-3">
          <ArtImage src={images[0]?.public_url} alt={images[0]?.alt || product.name} theme="boutique" label={product.category?.name} priority className="aspect-square rounded-[2rem]" />
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(1, 5).map((m) => <ArtImage key={m.id} src={m.public_url} alt={m.alt || product.name} className="aspect-square rounded-xl" sizes="25vw" />)}
            </div>
          )}
        </div>
        <div className="lg:py-4">
          <p className="eyebrow">{product.category?.name}{product.brand ? ` · ${product.brand}` : ''}</p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          {product.short_description && <p className="mt-4 text-ink-soft">{product.short_description}</p>}
          <div className="mt-8">
            <AddToCart product={{ slug: product.slug, name: product.name }} imageUrl={images[0]?.public_url}
              variants={product.variants.map((v) => ({ id: v.id, name: v.name, sale_price: v.sale_price!, stock_quantity: v.stock_quantity }))} shopEnabled={settings.shop_enabled} />
          </div>
          <div className="mt-8 grid gap-2 rounded-2xl bg-powder-50 p-4 text-sm text-ink-soft">
            <p className="flex items-center gap-2"><Store className="size-4 text-rosewood" /> Retrait au salon, Guédiawaye — Deux Boulangeries</p>
            <a href={whatsappLink(`Bonjour, j'ai une question sur le produit « ${product.name} ».`, settings.whatsapp_phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-rosewood"><MessageCircle className="size-4" /> Une question ? Écrivez-nous</a>
          </div>
          {product.description && <div className="mt-8 whitespace-pre-line leading-relaxed text-ink-soft">{product.description}</div>}
        </div>
      </div>
    </div>
  );
}
