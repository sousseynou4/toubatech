'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';
import type { FormState } from './common';

async function guard() {
  try { return await assertPermission('loyalty.manage'); } catch { return null; }
}
const denied: FormState = { error: dbErrorMessage('PERMISSION_DENIED') };
const opt = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s === '' ? null : s; };

const promoSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Code : 3 à 30 caractères (lettres, chiffres, - ou _).'),
  description: z.string().max(300).nullable(),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.coerce.number().int().positive('Valeur de remise invalide.'),
  min_amount: z.coerce.number().int().min(0),
  applies_to: z.enum(['all', 'services', 'products']),
  starts_at: z.iso.date().nullable(), ends_at: z.iso.date().nullable(),
  max_uses: z.coerce.number().int().positive().nullable(),
  is_active: z.boolean(),
}).refine((d) => d.discount_type !== 'percent' || d.discount_value <= 100, { message: 'Un pourcentage ne peut pas dépasser 100.' })
  .refine((d) => !d.starts_at || !d.ends_at || d.starts_at <= d.ends_at, { message: 'La date de fin doit suivre la date de début.' });

export async function savePromotion(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const id = opt(form.get('id'));
  const parsed = promoSchema.safeParse({
    code: form.get('code'), description: opt(form.get('description')), discount_type: form.get('discount_type'),
    discount_value: form.get('discount_value'), min_amount: form.get('min_amount') || 0, applies_to: form.get('applies_to') ?? 'all',
    starts_at: opt(form.get('starts_at')), ends_at: opt(form.get('ends_at')), max_uses: opt(form.get('max_uses')),
    is_active: form.get('is_active') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const row = {
    ...d,
    starts_at: d.starts_at ? `${d.starts_at}T00:00:00Z` : null,
    ends_at: d.ends_at ? `${d.ends_at}T23:59:59Z` : null,
  };
  const q = id && z.uuid().safeParse(id).success
    ? g.supabase.from('promotions').update(row).eq('id', id)
    : g.supabase.from('promotions').insert(row);
  const { error } = await q;
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/fidelite');
  return { ok: true, message: 'Promotion enregistrée.' };
}

export async function togglePromotion(id: string, active: boolean): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('promotions').update({ is_active: active }).eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/fidelite');
  return { ok: true };
}

export async function deletePromotion(id: string): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('promotions').delete().eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/fidelite');
  return { ok: true };
}

export async function createGiftCard(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const parsed = z.object({
    amount: z.coerce.number().int().min(1000, 'Montant minimum : 1 000 FCFA').max(10_000_000),
    recipient_name: z.string().max(120).nullable(), expires_on: z.iso.date().nullable(),
  }).safeParse({ amount: form.get('amount'), recipient_name: opt(form.get('recipient_name')), expires_on: opt(form.get('expires_on')) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { data, error } = await g.supabase.from('gift_cards').insert({
    initial_amount: parsed.data.amount, balance: parsed.data.amount, recipient_name: parsed.data.recipient_name,
    expires_on: parsed.data.expires_on, created_by: g.ctx.userId,
  }).select('code').single();
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/fidelite');
  return { ok: true, message: `Carte cadeau créée : ${data.code}` };
}

export async function setGiftCardActive(id: string, active: boolean): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('gift_cards').update({ is_active: active }).eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/fidelite');
  return { ok: true };
}
