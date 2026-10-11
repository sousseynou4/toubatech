import type { MetadataRoute } from 'next';
import { getServerSupabase } from '@/lib/supabase';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, priority: 1.0 },
    { url: `${base}/diagnostic`, lastModified: now, priority: 0.9 },
    { url: `${base}/reparation`, lastModified: now, priority: 0.9 },
    { url: `${base}/boutique`, lastModified: now, priority: 0.9 },
    { url: `${base}/pieces-detachees`, lastModified: now, priority: 0.8 },
    { url: `${base}/ecologie`, lastModified: now, priority: 0.6 },
  ];

  try {
    const supabase = getServerSupabase();

    // Reconditioned products
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('active', true);

    const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
      url: `${base}/boutique/${p.slug}`,
      lastModified: new Date(p.updated_at),
      priority: 0.8,
    }));

    return [...staticPages, ...productPages];
  } catch {
    return staticPages;
  }
}
