'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission, getStaffContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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

/** Émission d'une carte cadeau : vendue (caisse, permission pos.use) ou offerte (loyalty.manage, motif obligatoire). */
export async function createGiftCard(_p: FormState, form: FormData): Promise<FormState> {
  const ctx = await getStaffContext();
  if (!ctx || !(ctx.can('loyalty.manage') || ctx.can('pos.use'))) return denied;
  const parsed = z.object({
    amount: z.coerce.number().int().min(1000, 'Montant minimum : 1 000 FCFA').max(10_000_000),
    recipient_name: z.string().max(120).nullable(), expires_on: z.iso.date().nullable(),
    sale_method: z.enum(['cash', 'wave', 'orange_money', 'card', 'bank_transfer', 'other', 'offered']),
    sale_reference: z.string().max(120).nullable(), note: z.string().max(500).nullable(),
    purchaser_customer_id: z.uuid().nullable(),
  }).refine((d) => d.sale_method !== 'offered' || (d.note?.trim().length ?? 0) >= 3, { message: 'Indiquez le motif de la carte offerte.' })
    .safeParse({
      amount: form.get('amount'), recipient_name: opt(form.get('recipient_name')), expires_on: opt(form.get('expires_on')),
      sale_method: form.get('sale_method') ?? 'cash', sale_reference: opt(form.get('sale_reference')), note: opt(form.get('note')),
      purchaser_customer_id: opt(form.get('customerId')),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc('issue_gift_card', {
    p_amount: d.amount, p_recipient_name: d.recipient_name, p_expires_on: d.expires_on, p_purchaser_customer_id: d.purchaser_customer_id,
    p_sale_method: d.sale_method === 'offered' ? null : d.sale_method, p_sale_reference: d.sale_reference, p_note: d.note,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/fidelite');
  revalidatePath('/admin/caisse', 'layout');
  return { ok: true, message: `Carte cadeau créée : ${(data as { code: string }).code}` };
}

export async function setGiftCardActive(id: string, active: boolean): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('gift_cards').update({ is_active: active }).eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/fidelite');
  return { ok: true };
}
