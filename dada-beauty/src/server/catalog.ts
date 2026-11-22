import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import type { BusinessHour, BusinessSettings, MediaAsset, Product, Service, ServiceCategory } from '@/lib/types';
import { BRAND } from '@/lib/site';

/** Lecture publique (rôle anon + RLS). Renvoie des valeurs vides si la base n'est pas configurée. */

export const FALLBACK_SETTINGS: BusinessSettings = {
  business_name: BRAND.name, tagline: null, description: null, phone: BRAND.phone, whatsapp_phone: BRAND.whatsapp,
  email: null, address_line: BRAND.addressLine, city: BRAND.city, country: BRAND.country, map_embed_url: null,
  logo_url: null, instagram_url: null, facebook_url: null, tiktok_url: null, snapchat_url: null,
  online_booking_enabled: false, slot_interval_minutes: 30, booking_min_lead_minutes: 120, booking_max_days_ahead: 60,
  max_pending_bookings_per_phone: 3, deposit_policy: 'none', deposit_value: 0, cancellation_policy: null, booking_terms: null,
  shop_enabled: false, pickup_enabled: true, delivery_enabled: false, delivery_fee: null, delivery_zones_note: null,
  accepted_payment_methods: ['cash'], wave_merchant_display: null, orange_money_merchant_display: null,
  loyalty_enabled: false, loyalty_points_per_1000_xof: 0, onboarding_completed: false,
};

export const getSettings = cache(async (): Promise<{ settings: BusinessSettings; connected: boolean }> => {
  const sb = createPublicClient();
  if (!sb) return { settings: FALLBACK_SETTINGS, connected: false };
  const { data, error } = await sb.from('business_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return { settings: FALLBACK_SETTINGS, connected: false };
  return { settings: data as BusinessSettings, connected: true };
});

export const getBusinessHours = cache(async (): Promise<BusinessHour[]> => {
  const sb = createPublicClient();
  if (!sb) return [];
  const { data } = await sb.from('business_hours').select('weekday, is_closed, open_time, close_time').order('weekday');
  return (data ?? []) as BusinessHour[];
});

const SERVICE_FIELDS =
  'id, category_id, slug, name, short_description, description, price, price_is_from, duration_minutes, buffer_minutes, deposit_amount, is_bookable, is_featured, requires_quote, conditions, status, sort_order, image:media_assets!services_image_id_fkey(id, public_url, alt), category:service_categories(slug, name)';

export const getCategoriesWithServices = cache(async (): Promise<(ServiceCategory & { services: Service[] })[]> => {
  const sb = createPublicClient();
  if (!sb) return [];
  const [{ data: cats }, { data: services }] = await Promise.all([
    sb.from('service_categories').select('id, slug, name, tagline, description, sort_order, is_active, image:media_assets!service_categories_image_id_fkey(id, public_url, alt)').order('sort_order'),
    sb.from('services').select(SERVICE_FIELDS).order('sort_order'),
  ]);
  const list = (services ?? []) as unknown as Service[];
  return ((cats ?? []) as unknown as ServiceCategory[]).map((c) => ({ ...c, services: list.filter((s) => s.category_id === c.id) }));
});

export const getService = cache(async (slug: string): Promise<Service | null> => {
  const sb = createPublicClient();
  if (!sb) return null;
  const { data } = await sb.from('services').select(SERVICE_FIELDS).eq('slug', slug).maybeSingle();
  return (data as unknown as Service) ?? null;
});

export function isServiceBookable(s: Pick<Service, 'status' | 'is_bookable' | 'requires_quote' | 'price' | 'duration_minutes'>) {
  return s.status === 'active' && s.is_bookable && !s.requires_quote && s.price !== null && s.duration_minutes !== null;
}

const PRODUCT_FIELDS =
  'id, slug, name, brand, short_description, description, status, is_online, is_featured, category_id, category:product_categories(slug, name), image:media_assets!products_image_id_fkey(id, public_url, alt), variants:product_variants(id, product_id, name, sku, sale_price, stock_quantity, alert_threshold, is_default, is_active)';

export const getProducts = cache(async (opts: { category?: string; q?: string; featured?: boolean; limit?: number } = {}): Promise<Product[]> => {
  const sb = createPublicClient();
  if (!sb) return [];
  let query = sb.from('products').select(PRODUCT_FIELDS).order('sort_order').order('name');
  if (opts.featured) query = query.eq('is_featured', true);
  if (opts.q) query = query.ilike('name', `%${opts.q.replace(/[%_]/g, '')}%`);
  if (opts.limit) query = query.limit(opts.limit);
  const { data } = await query;
  let list = (data ?? []) as unknown as Product[];
  if (opts.category) list = list.filter((p) => p.category?.slug === opts.category);
  return list.map((p) => ({ ...p, variants: (p.variants ?? []).filter((v) => v.is_active && v.sale_price !== null) }))
    .filter((p) => (p.variants?.length ?? 0) > 0);
});

export const getProduct = cache(async (slug: string): Promise<(Product & { gallery: MediaAsset[] }) | null> => {
  const sb = createPublicClient();
  if (!sb) return null;
  const { data } = await sb.from('products').select(`${PRODUCT_FIELDS}, gallery:product_images(sort_order, media:media_assets(id, public_url, alt))`).eq('slug', slug).maybeSingle();
  if (!data) return null;
  const p = data as unknown as Product & { gallery: { sort_order: number; media: MediaAsset }[] };
  return {
    ...p,
    variants: (p.variants ?? []).filter((v) => v.is_active && v.sale_price !== null),
    gallery: (p.gallery ?? []).sort((a, b) => a.sort_order - b.sort_order).map((g) => g.media).filter(Boolean),
  };
});

export const getProductCategories = cache(async () => {
  const sb = createPublicClient();
  if (!sb) return [];
  const { data } = await sb.from('product_categories').select('id, slug, name').order('sort_order');
  return (data ?? []) as { id: string; slug: string; name: string }[];
});

export const getGallery = cache(async (category?: string, limit = 60): Promise<MediaAsset[]> => {
  const sb = createPublicClient();
  if (!sb) return [];
  let q = sb.from('media_assets').select('id, public_url, alt, caption, category').eq('is_gallery', true).order('sort_order').order('created_at', { ascending: false }).limit(limit);
  if (category) q = q.eq('category', category);
  const { data } = await q;
  return (data ?? []) as MediaAsset[];
});

/** Médias éditoriaux par emplacement (home_hero, about…). */
export const getSlots = cache(async (): Promise<Record<string, MediaAsset>> => {
  const sb = createPublicClient();
  if (!sb) return {};
  const { data } = await sb.from('media_assets').select('id, public_url, alt, slot').not('slot', 'is', null);
  return Object.fromEntries(((data ?? []) as MediaAsset[]).map((m) => [m.slot!, m]));
});

export const getApprovedReviews = cache(async (limit = 6) => {
  const sb = createPublicClient();
  if (!sb) return [];
  const { data } = await sb.from('reviews').select('id, display_name, rating, comment, is_verified, created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []) as { id: string; display_name: string; rating: number; comment: string | null; is_verified: boolean; created_at: string }[];
});
