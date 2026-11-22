'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { FormState } from './common';
import { isShortTikTokLink, isTikTokHost, parseTikTokUrl } from '@/lib/tiktok';

async function guard(perm: string) {
  try { return await assertPermission(perm); } catch { return null; }
}
const DENIED: FormState = { error: dbErrorMessage('PERMISSION_DENIED') };
const IMG_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const CATEGORIES = ['makeup', 'onglerie', 'cils-sourcils', 'coiffure-perruques', 'boutique', 'salon'] as const;
const SLOTS = ['home_hero', 'about'] as const;

function revalidatePublic() {
  revalidatePath('/');
  revalidatePath('/galerie');
  revalidatePath('/a-propos');
  revalidatePath('/admin/galerie');
}

/** Une photo liée à une cliente ne peut être publiée que si son consentement photo est enregistré. */
async function consentOk(sb: ServerSupabase, customerId: string | null, publish: boolean): Promise<string | null> {
  if (!customerId || !publish) return null;
  const { data } = await sb.from('customers').select('photo_consent').eq('id', customerId).maybeSingle();
  if (!data) return 'Cliente introuvable.';
  if (!data.photo_consent) return 'Publication refusée : cette cliente n\'a pas donné son consentement photo (à enregistrer sur sa fiche).';
  return null;
}

const metaSchema = z.object({
  alt: z.string().trim().min(3, 'Texte alternatif obligatoire (description de la photo)').max(200),
  caption: z.string().trim().max(300).optional().transform((v) => v || null),
  category: z.enum(CATEGORIES).optional().or(z.literal('')).transform((v) => v || null),
  slot: z.enum(SLOTS).optional().or(z.literal('')).transform((v) => v || null),
  customerId: z.uuid().optional().or(z.literal('')).transform((v) => v || null),
  categoryImageFor: z.uuid().optional().or(z.literal('')).transform((v) => v || null),
  isGallery: z.boolean(), isPublished: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

function readMeta(form: FormData) {
  return metaSchema.safeParse({
    alt: form.get('alt'), caption: form.get('caption') ?? undefined, category: form.get('category') ?? '', slot: form.get('slot') ?? '',
    customerId: form.get('customerId') ?? '', categoryImageFor: form.get('categoryImageFor') ?? '',
    isGallery: form.get('isGallery') === 'on', isPublished: form.get('isPublished') === 'on', sortOrder: form.get('sortOrder') || 0,
  });
}

async function applySlotAndCategory(sb: ServerSupabase, mediaId: string, slot: string | null, categoryId: string | null, canServices: boolean): Promise<string | null> {
  if (slot) {
    const clear = await sb.from('media_assets').update({ slot: null }).eq('slot', slot).neq('id', mediaId);
    if (clear.error) return dbErrorMessage(clear.error);
  }
  if (categoryId) {
    if (!canServices) return 'Le droit « prestations » est requis pour changer l\'image d\'une catégorie.';
    const { error } = await sb.from('service_categories').update({ image_id: mediaId }).eq('id', categoryId);
    if (error) return dbErrorMessage(error);
  }
  return null;
}

export async function uploadMedia(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('gallery.manage');
  if (!g) return DENIED;
  const parsed = readMeta(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  if (!files.length) return { error: 'Sélectionnez au moins une image.' };
  for (const f of files) {
    if (!IMG_TYPES[f.type]) return { error: 'Formats acceptés : JPG, PNG, WEBP, AVIF.' };
    if (f.size > 8 * 1024 * 1024) return { error: `« ${f.name} » dépasse 8 Mo.` };
  }
  const consent = await consentOk(g.supabase, d.customerId, d.isPublished);
  if (consent) return { error: consent };
  let firstId: string | null = null;
  for (const f of files) {
    const path = `galerie/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${IMG_TYPES[f.type]}`;
    const up = await g.supabase.storage.from('media').upload(path, f, { contentType: f.type, upsert: false });
    if (up.error) return { error: 'Échec de l\'envoi d\'une image.' };
    const { data, error } = await g.supabase.from('media_assets').insert({
      bucket: 'media', path, public_url: g.supabase.storage.from('media').getPublicUrl(path).data.publicUrl,
      alt: d.alt, caption: d.caption, category: d.category, is_gallery: d.isGallery, is_published: d.isPublished,
      customer_consent_id: d.customerId, sort_order: d.sortOrder, uploaded_by: g.ctx.userId,
    }).select('id').single();
    if (error) { await g.supabase.storage.from('media').remove([path]); return { error: dbErrorMessage(error) }; }
    firstId ??= data.id;
  }
  if (firstId && (d.slot || d.categoryImageFor)) {
    if (d.slot) await g.supabase.from('media_assets').update({ slot: d.slot }).eq('id', firstId);
    const err = await applySlotAndCategory(g.supabase, firstId, d.slot, d.categoryImageFor, g.ctx.can('services.manage'));
    if (err) return { error: err };
  }
  revalidatePublic();
  return { ok: true, message: `${files.length} image${files.length > 1 ? 's' : ''} ajoutée${files.length > 1 ? 's' : ''}.` };
}

export async function updateMedia(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('gallery.manage');
  if (!g) return DENIED;
  const id = String(form.get('id'));
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const parsed = readMeta(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const consent = await consentOk(g.supabase, d.customerId, d.isPublished);
  if (consent) return { error: consent };
  const err = await applySlotAndCategory(g.supabase, id, d.slot, d.categoryImageFor, g.ctx.can('services.manage'));
  if (err) return { error: err };
  const { error } = await g.supabase.from('media_assets').update({
    alt: d.alt, caption: d.caption, category: d.category, slot: d.slot, is_gallery: d.isGallery, is_published: d.isPublished,
    customer_consent_id: d.customerId, sort_order: d.sortOrder, is_placeholder: false,
  }).eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePublic();
  return { ok: true, message: 'Média mis à jour.' };
}

export async function deleteMedia(id: string): Promise<FormState> {
  const g = await guard('gallery.manage');
  if (!g) return DENIED;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { data: m } = await g.supabase.from('media_assets').select('bucket, path').eq('id', id).maybeSingle();
  if (!m) return { error: 'Média introuvable.' };
  const { error } = await g.supabase.from('media_assets').delete().eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  await g.supabase.storage.from(m.bucket).remove([m.path]);
  revalidatePublic();
  return { ok: true, message: 'Média supprimé.' };
}

const QUOTE_STATUSES = ['new', 'contacted', 'quoted', 'accepted', 'declined', 'cancelled'] as const;

export async function updateQuote(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('quotes.manage');
  if (!g) return DENIED;
  const parsed = z.object({
    id: z.uuid(), status: z.enum(QUOTE_STATUSES),
    quotedAmount: z.string().optional().transform((v) => (v && v.trim() ? Number(v.replace(/\s/g, '')) : null)).pipe(z.number().int().min(0).max(1_000_000_000).nullable()),
    quoteDetails: z.string().max(5000).optional().transform((v) => v || null),
  }).safeParse({ id: form.get('id'), status: form.get('status'), quotedAmount: form.get('quotedAmount') ?? undefined, quoteDetails: form.get('quoteDetails') ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  if (d.status === 'quoted' && d.quotedAmount === null) return { error: 'Indiquez le montant du devis.' };
  const { data: current } = await g.supabase.from('event_quotes').select('quoted_amount, quoted_at').eq('id', d.id).maybeSingle();
  if (!current) return { error: 'Devis introuvable.' };
  const amountChanged = d.quotedAmount !== null && d.quotedAmount !== current.quoted_amount;
  const { error } = await g.supabase.from('event_quotes').update({
    status: d.status, quoted_amount: d.quotedAmount, quote_details: d.quoteDetails, handled_by: g.ctx.userId,
    quoted_at: amountChanged ? new Date().toISOString() : current.quoted_at,
  }).eq('id', d.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/devis');
  revalidatePath(`/admin/devis/${d.id}`);
  return { ok: true, message: 'Devis mis à jour.' };
}

export async function moderateReview(id: string, status: 'approved' | 'rejected' | 'pending'): Promise<FormState> {
  const g = await guard('reviews.manage');
  if (!g) return DENIED;
  if (!z.uuid().safeParse(id).success || !['approved', 'rejected', 'pending'].includes(status)) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('reviews').update({ status, moderated_by: g.ctx.userId }).eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/avis');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteReview(id: string): Promise<FormState> {
  const g = await guard('reviews.manage');
  if (!g) return DENIED;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('reviews').delete().eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/avis');
  revalidatePath('/');
  return { ok: true };
}

// ─── Vidéos TikTok (lecteur officiel intégré, aucune copie hébergée) ──────────

/** Suit la redirection d'un lien court TikTok (vm.tiktok.com…) sans jamais quitter les domaines TikTok. */
async function resolveTikTokShortLink(link: string): Promise<string | null> {
  let current = /^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`;
  for (let hop = 0; hop < 4; hop++) {
    if (parseTikTokUrl(current)) return current;
    let res: Response;
    try {
      res = await fetch(current, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(5000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; DadaBeautySite/1.0)' } });
    } catch { return null; }
    const location = res.headers.get('location');
    if (!location) return null;
    const next = new URL(location, current);
    if (next.protocol !== 'https:' || !isTikTokHost(next.hostname)) return null;
    current = next.toString();
  }
  return parseTikTokUrl(current) ? current : null;
}

const videoMetaSchema = z.object({
  title: z.string().trim().max(150).nullable(),
  category: z.enum(CATEGORIES).nullable(),
  sort_order: z.coerce.number().int().min(-1000).max(1000).default(0),
  is_published: z.boolean(),
});
const optText = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s === '' ? null : s; };

export async function addTikTokVideo(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('gallery.manage'); if (!g) return DENIED;
  const link = String(form.get('url') ?? '').trim();
  if (!link) return { error: 'Collez le lien de la vidéo TikTok.' };
  let parsed = parseTikTokUrl(link);
  if (!parsed && isShortTikTokLink(link)) {
    const resolved = await resolveTikTokShortLink(link);
    parsed = resolved ? parseTikTokUrl(resolved) : null;
    if (!parsed) return { error: 'Lien court TikTok impossible à ouvrir. Sur TikTok, ouvrez la vidéo dans un navigateur et copiez l\'adresse complète (…tiktok.com/@compte/video/…).' };
  }
  if (!parsed) return { error: 'Ce lien ne correspond pas à une vidéo TikTok (format attendu : https://www.tiktok.com/@compte/video/…).' };
  const meta = videoMetaSchema.safeParse({
    title: optText(form.get('title')), category: optText(form.get('category')), sort_order: form.get('sort_order') || 0,
    is_published: form.get('is_published') === 'on',
  });
  if (!meta.success) return { error: meta.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { error } = await g.supabase.from('social_videos').insert({
    platform: 'tiktok', video_id: parsed.videoId, url: parsed.url, author_handle: parsed.handle, ...meta.data, created_by: g.ctx.userId,
  });
  if (error) return { error: error.message.includes('duplicate key') ? 'Cette vidéo est déjà dans la galerie.' : dbErrorMessage(error) };
  revalidatePublic();
  return { ok: true, message: 'Vidéo ajoutée à la galerie.' };
}

export async function updateTikTokVideo(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('gallery.manage'); if (!g) return DENIED;
  const id = z.uuid().safeParse(form.get('id'));
  const meta = videoMetaSchema.safeParse({
    title: optText(form.get('title')), category: optText(form.get('category')), sort_order: form.get('sort_order') || 0,
    is_published: form.get('is_published') === 'on',
  });
  if (!id.success || !meta.success) return { error: 'Formulaire invalide.' };
  const { error } = await g.supabase.from('social_videos').update(meta.data).eq('id', id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePublic();
  return { ok: true, message: 'Vidéo mise à jour.' };
}

export async function deleteTikTokVideo(id: string): Promise<FormState> {
  const g = await guard('gallery.manage'); if (!g) return DENIED;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('social_videos').delete().eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePublic();
  return { ok: true };
}
