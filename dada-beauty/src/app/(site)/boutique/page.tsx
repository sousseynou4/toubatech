import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { ProductCard } from '@/components/site/cards';
import { Section, SectionHeading } from '@/components/ui/section';
import { Alert } from '@/components/ui/field';
import { getProductCategories, getProducts, getSettings } from '@/server/catalog';
import { cn } from '@/lib/cn';

export const revalidate = 120;
export const metadata: Metadata = {
  title: 'Boutique — perruques, maquillage, soins et accessoires',
  description: 'Achetez vos perruques, produits de maquillage, soins et accessoires de beauté chez Dada Beauty à Guédiawaye. Retrait au salon.',
  alternates: { canonical: '/boutique' },
};

export default async function ShopPage({ searchParams }: PageProps<'/boutique'>) {
  const sp = await searchParams;
  const category = typeof sp.categorie === 'string' ? sp.categorie : '';
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 60) : '';
  const tri = typeof sp.tri === 'string' ? sp.tri : '';
  const [{ settings }, categories, raw] = await Promise.all([getSettings(), getProductCategories(), getProducts({ category: category || undefined, q: q || undefined })]);
  const minPrice = (p: (typeof raw)[number]) => Math.min(...(p.variants ?? []).map((v) => v.sale_price ?? Infinity));
  const products = tri === 'prix-asc' ? [...raw].sort((a, b) => minPrice(a) - minPrice(b)) : tri === 'prix-desc' ? [...raw].sort((a, b) => minPrice(b) - minPrice(a)) : raw;
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(category && { categorie: category }), ...(q && { q }), ...(tri && { tri }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const s = p.toString();
    return s ? `/boutique?${s}` : '/boutique';
  };

  return (
    <Section>
      <SectionHeading as="h1" eyebrow="Boutique" title={<>La <em className="text-rosewood">boutique</em> Dada Beauty</>} intro={`Retrait au salon${settings.delivery_enabled ? ' ou livraison' : ''}. Commande sans création de compte.`} />
      {!settings.shop_enabled && <Alert tone="warning" className="mt-6">La boutique en ligne est momentanément fermée. Nos produits restent disponibles au salon.</Alert>}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Catégories" className="flex gap-2 overflow-x-auto pb-1">
          <Link href={href({ categorie: '' })} className={cn('shrink-0 rounded-full px-4 py-2 text-sm', !category ? 'bg-ink text-ivory' : 'border border-line bg-white text-ink-soft')}>Tout</Link>
          {categories.map((c) => (
            <Link key={c.slug} href={href({ categorie: c.slug })} aria-current={category === c.slug ? 'page' : undefined} className={cn('shrink-0 rounded-full px-4 py-2 text-sm', category === c.slug ? 'bg-ink text-ivory' : 'border border-line bg-white text-ink-soft')}>{c.name}</Link>
          ))}
        </nav>
        <form className="flex gap-2" action="/boutique">
          {category && <input type="hidden" name="categorie" value={category} />}
          <label className="relative flex-1">
            <span className="sr-only">Rechercher un produit</span>
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q} placeholder="Rechercher…" className="field h-11 pl-10" />
          </label>
          <select name="tri" defaultValue={tri} className="field h-11 w-auto" aria-label="Trier">
            <option value="">Pertinence</option><option value="prix-asc">Prix croissant</option><option value="prix-desc">Prix décroissant</option>
          </select>
          <button className="sr-only">Filtrer</button>
        </form>
      </div>
      {products.length === 0 ? (
        <Alert className="mt-10">{q || category ? 'Aucun produit ne correspond à votre recherche.' : 'Les produits seront bientôt disponibles en ligne.'}</Alert>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </Section>
  );
}
