import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { getCategoriesWithServices, getProducts } from '@/server/catalog';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const statics = ['', '/prestations', '/reserver', '/galerie', '/boutique', '/evenements', '/a-propos', '/contact', '/mentions-legales', '/confidentialite', '/conditions'];
  const [cats, products] = await Promise.all([getCategoriesWithServices(), getProducts()]);
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...cats.flatMap((c) => c.services).map((s) => ({ url: `${base}/prestations/${s.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/boutique/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
