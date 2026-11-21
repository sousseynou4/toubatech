'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertPermission } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';
import { normalizePhone } from '@/lib/phone';
import type { FormState } from './common';

async function guard(perm: string) {
  try {
    return await assertPermission(perm);
  } catch {
    return null;
  }
}
const DENIED: FormState = { error: dbErrorMessage('PERMISSION_DENIED') };

const customerSchema = z.object({
  fullName: z.string().trim().min(2, 'Nom requis').max(120),
  phone: z.string().trim().min(6, 'Téléphone requis'),
  email: z.string().trim().max(160).optional().transform((v) => v || null).pipe(z.email('Email invalide').nullable()),
  birthday: z.string().optional().transform((v) => v || null).pipe(z.iso.date().nullable()),
  preferences: z.string().max(2000).optional().transform((v) => v || null),
  internalNotes: z.string().max(4000).optional().transform((v) => v || null),
  marketingConsent: z.boolean(),
  photoConsent: z.boolean(),
});

function readCustomer(form: FormData) {
  return customerSchema.safeParse({
    fullName: form.get('fullName'), phone: form.get('phone'), email: form.get('email') ?? undefined,
    birthday: form.get('birthday') ?? undefined, preferences: form.get('preferences') ?? undefined,
    internalNotes: form.get('internalNotes') ?? undefined,
    marketingConsent: form.get('marketingConsent') === 'on', photoConsent: form.get('photoConsent') === 'on',
  });
}

export async function createCustomer(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('customers.manage');
  if (!g) return DENIED;
  const parsed = readCustomer(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  if (!phone) return { error: 'Numéro de téléphone invalide.' };
  const { data: existing } = await g.supabase.from('customers').select('id').eq('phone', phone).maybeSingle();
  if (existing) return { error: 'Une fiche existe déjà pour ce numéro.' };
  const { data, error } = await g.supabase.from('customers').insert({
    full_name: d.fullName, phone, email: d.email, birthday: d.birthday, preferences: d.preferences,
    internal_notes: d.internalNotes, marketing_consent: d.marketingConsent, photo_consent: d.photoConsent, source: 'admin',
  }).select('id').single();
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/clientes');
  redirect(`/admin/clientes/${data.id}`);
}

export async function updateCustomer(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('customers.manage');
  if (!g) return DENIED;
  const id = String(form.get('id'));
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const parsed = readCustomer(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  if (!phone) return { error: 'Numéro de téléphone invalide.' };
  const { error } = await g.supabase.from('customers').update({
    full_name: d.fullName, phone, email: d.email, birthday: d.birthday, preferences: d.preferences,
    internal_notes: d.internalNotes, marketing_consent: d.marketingConsent, photo_consent: d.photoConsent,
  }).eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true, message: 'Fiche cliente enregistrée.' };
}

export async function deleteCustomer(id: string): Promise<FormState> {
  const g = await guard('customers.delete');
  if (!g) return DENIED;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('customers').delete().eq('id', id);
  if (error) {
    if (String(error.message).includes('foreign key')) return { error: 'Cette cliente a des rendez-vous enregistrés : la fiche ne peut pas être supprimée (historique comptable).' };
    return { error: dbErrorMessage(error) };
  }
  revalidatePath('/admin/clientes');
  redirect('/admin/clientes');
}

export async function adjustLoyalty(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('loyalty.manage');
  if (!g) return DENIED;
  const parsed = z.object({
    customerId: z.uuid(), points: z.coerce.number().int().refine((n) => n !== 0 && Math.abs(n) <= 100000, 'Nombre de points invalide'),
    note: z.string().trim().min(3, 'Motif obligatoire').max(300),
  }).safeParse({ customerId: form.get('customerId'), points: form.get('points'), note: form.get('note') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { error } = await g.supabase.rpc('adjust_loyalty', { p_customer_id: parsed.data.customerId, p_points: parsed.data.points, p_note: parsed.data.note });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/clientes/${parsed.data.customerId}`);
  return { ok: true, message: 'Points mis à jour.' };
}
