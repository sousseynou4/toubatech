'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertPermission } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { FormState } from './common';

async function guard(perm: string) {
  try { return await assertPermission(perm); } catch { return null; }
}
const DENIED: FormState = { error: dbErrorMessage('PERMISSION_DENIED') };
const IMG_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

/** Upload d'une image dans le bucket public « media » + ligne media_assets (RLS : gallery.manage). */
async function uploadImage(sb: ServerSupabase, file: File, meta: { alt: string; category: string; folder: string; userId: string }): Promise<{ id: string } | { error: string }> {
  const ext = IMG_TYPES[file.type];
  if (!ext) return { error: 'Formats acceptés : JPG, PNG, WEBP, AVIF.' };
  if (file.size > 8 * 1024 * 1024) return { error: 'Image trop lourde (8 Mo maximum).' };
  const path = `${meta.folder}/${crypto.randomUUID()}.${ext}`;
  const up = await sb.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { error: 'Échec de l\'envoi de l\'image (droits « galerie » requis).' };
  const publicUrl = sb.storage.from('media').getPublicUrl(path).data.publicUrl;
  const { data, error } = await sb.from('media_assets').insert({
    bucket: 'media', path, public_url: publicUrl, alt: meta.alt.slice(0, 200), category: meta.category, is_published: true, uploaded_by: meta.userId,
  }).select('id').single();
  if (error) {
    await sb.storage.from('media').remove([path]);
    return { error: dbErrorMessage(error) };
  }
  return { id: data.id };
}

const optInt = z.string().optional().transform((v) => (v === undefined || v.trim() === '' ? null : Number(v.replace(/[\s  ]/g, ''))));

const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis').max(120),
  slug: z.string().trim().max(80).optional(),
  categoryId: z.uuid('Catégorie requise'),
  shortDescription: z.string().trim().max(300).optional().transform((v) => v || null),
  description: z.string().trim().max(5000).optional().transform((v) => v || null),
  price: optInt.pipe(z.number().int('Prix entier en FCFA').min(0).max(100_000_000).nullable()),
  duration: optInt.pipe(z.number().int().min(5, 'Durée minimale 5 min').max(720).nullable()),
  buffer: optInt.pipe(z.number().int().min(0).max(240).nullable()),
  deposit: optInt.pipe(z.number().int().min(0).max(100_000_000).nullable()),
  conditions: z.string().trim().max(2000).optional().transform((v) => v || null),
  status: z.enum(['to_configure', 'active', 'inactive']),
  sortOrder: optInt.pipe(z.number().int().min(0).max(999).nullable()),
  priceIsFrom: z.boolean(), isBookable: z.boolean(), isFeatured: z.boolean(), requiresQuote: z.boolean(),
});

function readService(form: FormData) {
  const s = (k: string) => (form.get(k) === null ? undefined : String(form.get(k)));
  return serviceSchema.safeParse({
    name: s('name'), slug: s('slug'), categoryId: s('categoryId'), shortDescription: s('shortDescription'), description: s('description'),
    price: s('price'), duration: s('duration'), buffer: s('buffer'), deposit: s('deposit'), conditions: s('conditions'),
    status: s('status'), sortOrder: s('sortOrder'),
    priceIsFrom: form.get('priceIsFrom') === 'on', isBookable: form.get('isBookable') === 'on', isFeatured: form.get('isFeatured') === 'on', requiresQuote: form.get('requiresQuote') === 'on',
  });
}

export async function saveService(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('services.manage');
  if (!g) return DENIED;
  const id = form.get('id') ? String(form.get('id')) : null;
  if (id && !z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const parsed = readService(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  if (d.status === 'active' && (d.price === null || d.duration === null)) {
    return { error: 'Une prestation active doit avoir un prix et une durée. Laissez-la « À configurer » en attendant.' };
  }
  const slug = slugify(d.slug || d.name);
  if (!slug) return { error: 'Identifiant d\'URL invalide.' };
  const row: Record<string, unknown> = {
    name: d.name, slug, category_id: d.categoryId, short_description: d.shortDescription, description: d.description,
    price: d.price, price_is_from: d.priceIsFrom, duration_minutes: d.duration, buffer_minutes: d.buffer ?? 0, deposit_amount: d.deposit,
    conditions: d.conditions, status: d.status, sort_order: d.sortOrder ?? 0, is_bookable: d.isBookable, is_featured: d.isFeatured, requires_quote: d.requiresQuote,
  };
  const file = form.get('image');
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(g.supabase, file, { alt: d.name, category: 'prestation', folder: 'services', userId: g.ctx.userId });
    if ('error' in up) return { error: up.error };
    row.image_id = up.id;
  }
  const res = id
    ? await g.supabase.from('services').update(row).eq('id', id).select('id').single()
    : await g.supabase.from('services').insert(row).select('id').single();
  if (res.error) return { error: dbErrorMessage(res.error) };
  const serviceId = res.data.id as string;

  if (form.get('employeesSubmitted') === '1') {
    const emps = form.getAll('employeeIds').map(String).filter((e) => z.uuid().safeParse(e).success);
    const del = await g.supabase.from('employee_services').delete().eq('service_id', serviceId);
    if (del.error) return { error: 'Prestation enregistrée, mais les employées n\'ont pas pu être mises à jour (droit « équipe » requis).' };
    if (emps.length) {
      const ins = await g.supabase.from('employee_services').insert(emps.map((e) => ({ employee_id: e, service_id: serviceId })));
      if (ins.error) return { error: dbErrorMessage(ins.error) };
    }
  }
  revalidatePath('/admin/prestations');
  revalidatePath('/prestations');
  revalidatePath('/');
  if (!id) redirect(`/admin/prestations/${serviceId}`);
  return { ok: true, message: d.status === 'active' ? 'Prestation enregistrée et réservable.' : 'Prestation enregistrée.' };
}

export async function removeServiceImage(serviceId: string): Promise<FormState> {
  const g = await guard('services.manage');
  if (!g) return DENIED;
  if (!z.uuid().safeParse(serviceId).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('services').update({ image_id: null }).eq('id', serviceId);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/prestations/${serviceId}`);
  return { ok: true, message: 'Image retirée (le fichier reste dans la galerie).' };
}

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Nom requis').max(80),
  slug: z.string().trim().max(60).optional(),
  tagline: z.string().trim().max(160).optional().transform((v) => v || null),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export async function saveCategory(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('services.manage');
  if (!g) return DENIED;
  const id = form.get('id') ? String(form.get('id')) : null;
  if (id && !z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const parsed = categorySchema.safeParse({
    name: form.get('name'), slug: form.get('slug') || undefined, tagline: form.get('tagline') || undefined,
    description: form.get('description') || undefined, sortOrder: form.get('sortOrder') || 0, isActive: form.get('isActive') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const row: Record<string, unknown> = { name: d.name, slug: slugify(d.slug || d.name), tagline: d.tagline, description: d.description, sort_order: d.sortOrder, is_active: d.isActive };
  const file = form.get('image');
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(g.supabase, file, { alt: d.name, category: String(row.slug), folder: 'categories', userId: g.ctx.userId });
    if ('error' in up) return { error: up.error };
    row.image_id = up.id;
  }
  const { error } = id ? await g.supabase.from('service_categories').update(row).eq('id', id) : await g.supabase.from('service_categories').insert(row);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/prestations');
  revalidatePath('/prestations');
  revalidatePath('/');
  return { ok: true, message: id ? 'Catégorie enregistrée.' : 'Catégorie créée.' };
}

export async function moveCategory(id: string, direction: 'up' | 'down'): Promise<FormState> {
  const g = await guard('services.manage');
  if (!g) return DENIED;
  const { data } = await g.supabase.from('service_categories').select('id, sort_order').order('sort_order').order('name');
  const list = data ?? [];
  const i = list.findIndex((c) => c.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return null;
  [list[i], list[j]] = [list[j]!, list[i]!];
  for (const [idx, c] of list.entries()) {
    if (c.sort_order !== idx + 1) {
      const { error } = await g.supabase.from('service_categories').update({ sort_order: idx + 1 }).eq('id', c.id);
      if (error) return { error: dbErrorMessage(error) };
    }
  }
  revalidatePath('/admin/prestations');
  revalidatePath('/prestations');
  return { ok: true };
}
