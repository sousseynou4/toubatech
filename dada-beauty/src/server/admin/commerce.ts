'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertPermission } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from './common';

const denied: FormState = { error: dbErrorMessage('PERMISSION_DENIED') };

async function guard(permission: string) {
  try { return await assertPermission(permission); } catch { return null; }
}

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const optAmount = z.string().optional().transform((v) => (v === undefined || v.trim() === '' ? null : Number(v.replace(/[\s  ]/g, '')))).pipe(z.number().int().min(0).max(1_000_000_000).nullable());

const productSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis').max(160),
  slug: z.string().trim().max(80).optional(),
  category_id: z.uuid('Catégorie requise'),
  supplier_id: z.uuid().optional().or(z.literal('')).transform((v) => v || null),
  brand: optText(80),
  short_description: optText(300),
  description: optText(5000),
  status: z.enum(['to_configure', 'active', 'inactive']),
  is_online: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

function readProduct(form: FormData) {
  return productSchema.safeParse({
    name: form.get('name'), slug: form.get('slug') || undefined, category_id: form.get('category_id'), supplier_id: form.get('supplier_id') ?? '',
    brand: form.get('brand') || undefined, short_description: form.get('short_description') || undefined, description: form.get('description') || undefined,
    status: form.get('status'), is_online: form.get('is_online') === 'on', is_featured: form.get('is_featured') === 'on', sort_order: form.get('sort_order') || 0,
  });
}

export async function createProduct(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('products.manage');
  if (!g) return denied;
  const parsed = readProduct(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { slug, ...rest } = parsed.data;
  const finalSlug = slugify(slug || rest.name);
  if (!finalSlug) return { error: 'Identifiant d\'URL invalide.' };
  const { data, error } = await g.supabase.from('products').insert({ ...rest, slug: finalSlug }).select('id').single();
  if (error) return { error: dbErrorMessage(error) };
  // Prix de la variante par défaut (facultatif à la création)
  const sale = optAmount.safeParse(form.get('sale_price') ?? undefined);
  const cost = optAmount.safeParse(form.get('cost_price') ?? undefined);
  if ((sale.success && sale.data !== null) || (cost.success && cost.data !== null)) {
    await g.supabase.from('product_variants').update({
      ...(sale.success && sale.data !== null ? { sale_price: sale.data } : {}),
      ...(cost.success && cost.data !== null ? { cost_price: cost.data } : {}),
    }).eq('product_id', data.id).eq('is_default', true);
  }
  revalidatePath('/admin/produits');
  redirect(`/admin/produits/${data.id}`);
}

export async function updateProduct(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('products.manage');
  if (!g) return denied;
  const id = z.uuid().safeParse(form.get('id'));
  const parsed = readProduct(form);
  if (!id.success) return { error: 'Requête invalide.' };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { slug, ...rest } = parsed.data;
  const finalSlug = slugify(slug || rest.name);
  if (rest.status === 'active') {
    const { data: priced } = await g.supabase.from('product_variants').select('id').eq('product_id', id.data).eq('is_active', true).not('sale_price', 'is', null).limit(1);
    if (!priced?.length) return { error: 'Un produit actif doit avoir au moins une variante active avec un prix de vente.' };
  }
  const { error } = await g.supabase.from('products').update({ ...rest, slug: finalSlug }).eq('id', id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/produits');
  revalidatePath(`/admin/produits/${id.data}`);
  revalidatePath('/boutique', 'layout');
  return { ok: true, message: 'Produit enregistré.' };
}

const variantSchema = z.object({
  product_id: z.uuid(),
  id: z.uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  name: z.string().trim().min(1, 'Nom de la variante requis').max(80),
  sku: optText(60),
  cost_price: optAmount,
  sale_price: optAmount,
  alert_threshold: z.coerce.number().int().min(0).max(100000),
  is_active: z.boolean(),
});

export async function saveVariant(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('products.manage');
  if (!g) return denied;
  const parsed = variantSchema.safeParse({
    product_id: form.get('product_id'), id: form.get('id') ?? '', name: form.get('name'), sku: form.get('sku') || undefined,
    cost_price: form.get('cost_price') ?? undefined, sale_price: form.get('sale_price') ?? undefined,
    alert_threshold: form.get('alert_threshold') || 0, is_active: form.get('is_active') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { id, ...v } = parsed.data;
  // stock_quantity n'est jamais envoyé : il ne change que par mouvement de stock.
  const { error } = id
    ? await g.supabase.from('product_variants').update(v).eq('id', id).eq('product_id', v.product_id)
    : await g.supabase.from('product_variants').insert(v);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/produits/${v.product_id}`);
  revalidatePath('/boutique', 'layout');
  return { ok: true, message: id ? 'Variante mise à jour.' : 'Variante ajoutée.' };
}

const ALLOWED_IMG = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function uploadProductImage(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('products.manage');
  if (!g) return denied;
  const productId = z.uuid().safeParse(form.get('product_id'));
  const file = form.get('file');
  const asMain = form.get('as_main') === 'on';
  if (!productId.success) return { error: 'Requête invalide.' };
  if (!(file instanceof File) || file.size === 0) return { error: 'Choisissez une image.' };
  if (!ALLOWED_IMG.has(file.type)) return { error: 'Formats acceptés : JPG, PNG, WEBP, AVIF.' };
  if (file.size > 8 * 1024 * 1024) return { error: 'Image trop lourde (8 Mo maximum).' };
  const ext = { 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[file.type] ?? 'jpg';
  const path = `produits/${productId.data}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await g.supabase.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: 'Échec de l\'envoi de l\'image.' };
  const { data: pub } = g.supabase.storage.from('media').getPublicUrl(path);
  const alt = String(form.get('alt') ?? '').trim().slice(0, 200);
  const { data: media, error } = await g.supabase.from('media_assets').insert({
    bucket: 'media', path, public_url: pub.publicUrl, alt, category: 'boutique', is_published: true, uploaded_by: g.ctx.userId,
  }).select('id').single();
  if (error) return { error: dbErrorMessage(error) };
  const { error: linkErr } = asMain
    ? await g.supabase.from('products').update({ image_id: media.id }).eq('id', productId.data)
    : await g.supabase.from('product_images').insert({ product_id: productId.data, media_id: media.id });
  if (linkErr) return { error: dbErrorMessage(linkErr) };
  revalidatePath(`/admin/produits/${productId.data}`);
  revalidatePath('/boutique', 'layout');
  return { ok: true, message: 'Image ajoutée.' };
}

export async function removeProductImage(productId: string, mediaId: string): Promise<FormState> {
  const g = await guard('products.manage');
  if (!g) return denied;
  if (!z.uuid().safeParse(productId).success || !z.uuid().safeParse(mediaId).success) return { error: 'Requête invalide.' };
  await g.supabase.from('products').update({ image_id: null }).eq('id', productId).eq('image_id', mediaId);
  await g.supabase.from('product_images').delete().eq('product_id', productId).eq('media_id', mediaId);
  revalidatePath(`/admin/produits/${productId}`);
  return { ok: true, message: 'Image retirée du produit.' };
}

// ─── Stocks ────────────────────────────────────────────────────────────────
const movementSchema = z.object({
  variant_id: z.uuid('Choisissez un produit'),
  reason: z.enum(['purchase', 'initial', 'return', 'adjustment', 'loss']),
  quantity: z.coerce.number().int().min(1, 'Quantité invalide').max(100000),
  direction: z.enum(['in', 'out']).optional(),
  note: z.string().trim().max(500).optional(),
  unit_cost: optAmount,
  supplier_id: z.uuid().optional().or(z.literal('')).transform((v) => v || null),
});

export async function recordStockMovement(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('inventory.manage');
  if (!g) return denied;
  const parsed = movementSchema.safeParse({
    variant_id: form.get('variant_id'), reason: form.get('reason'), quantity: form.get('quantity'), direction: form.get('direction') || undefined,
    note: form.get('note') || undefined, unit_cost: form.get('unit_cost') ?? undefined, supplier_id: form.get('supplier_id') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const negative = d.reason === 'loss' || (d.reason === 'adjustment' && d.direction === 'out');
  const { data, error } = await g.supabase.rpc('record_stock_movement', {
    p_variant_id: d.variant_id, p_delta: negative ? -d.quantity : d.quantity, p_reason: d.reason,
    p_note: d.note ?? null, p_unit_cost: d.unit_cost, p_supplier_id: d.supplier_id,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/stocks');
  revalidatePath('/admin/produits', 'layout');
  return { ok: true, message: `Mouvement enregistré. Nouveau stock : ${data}.` };
}

const supplierSchema = z.object({
  id: z.uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  name: z.string().trim().min(2, 'Nom requis').max(120),
  contact_name: optText(120), phone: optText(30), email: z.string().trim().max(160).optional().transform((v) => v || null).pipe(z.email('Email invalide').nullable()),
  address: optText(300), notes: optText(2000), is_active: z.boolean(),
});

export async function saveSupplier(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('products.manage');
  if (!g) return denied;
  const parsed = supplierSchema.safeParse({
    id: form.get('id') ?? '', name: form.get('name'), contact_name: form.get('contact_name') || undefined, phone: form.get('phone') || undefined,
    email: form.get('email') || undefined, address: form.get('address') || undefined, notes: form.get('notes') || undefined, is_active: form.get('is_active') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { id, ...s } = parsed.data;
  const { error } = id ? await g.supabase.from('suppliers').update(s).eq('id', id) : await g.supabase.from('suppliers').insert(s);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/stocks/fournisseurs');
  return { ok: true, message: id ? 'Fournisseur mis à jour.' : 'Fournisseur ajouté.' };
}

// ─── Commandes ─────────────────────────────────────────────────────────────
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'] as const;

export async function setOrderStatus(id: string, status: (typeof ORDER_STATUSES)[number], note?: string): Promise<FormState> {
  const g = await guard('orders.manage');
  if (!g) return denied;
  if (!z.uuid().safeParse(id).success || !ORDER_STATUSES.includes(status)) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.rpc('set_order_status', { p_order_id: id, p_status: status, p_note: note?.slice(0, 500) ?? null });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Statut de la commande mis à jour.' };
}

export async function saveOrderNotes(_p: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get('id') ?? '');
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const sb = await createClient();
  if (!sb) return { error: 'Service indisponible.' };
  const { error } = await sb.rpc('update_order_notes', { p_order_id: id, p_notes: String(form.get('notes') ?? '').slice(0, 4000) });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/commandes/${id}`);
  return { ok: true, message: 'Notes enregistrées.' };
}
