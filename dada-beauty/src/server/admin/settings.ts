'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';
import { normalizePhone } from '@/lib/phone';
import type { FormState } from './common';

async function guard() {
  try { return await assertPermission('settings.manage'); } catch { return null; }
}
const denied: FormState = { error: dbErrorMessage('PERMISSION_DENIED') };
const opt = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s === '' ? null : s; };
const bool = (v: FormDataEntryValue | null) => v === 'on' || v === 'true';
const optUrl = z.string().url().startsWith('https://').max(500).nullable();

function done() {
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Paramètres enregistrés.' } as FormState;
}

export async function saveIdentity(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const phone = normalizePhone(opt(form.get('phone')));
  const whatsapp = normalizePhone(opt(form.get('whatsapp_phone')));
  if (!phone || !whatsapp) return { error: 'Numéro de téléphone ou WhatsApp invalide.' };
  const parsed = z.object({
    business_name: z.string().trim().min(2).max(80),
    tagline: z.string().max(200).nullable(), description: z.string().max(3000).nullable(),
    email: z.email().nullable(), address_line: z.string().min(2).max(200), city: z.string().min(2).max(120),
    map_embed_url: z.string().max(1000).regex(/^https:\/\/www\.google\.com\/maps\/embed\?/, 'La carte doit être un lien « Intégrer une carte » Google Maps (https://www.google.com/maps/embed?…).').nullable(),
    logo_url: optUrl, instagram_url: optUrl, facebook_url: optUrl, tiktok_url: optUrl, snapchat_url: optUrl,
  }).safeParse({
    business_name: opt(form.get('business_name')), tagline: opt(form.get('tagline')), description: opt(form.get('description')),
    email: opt(form.get('email')), address_line: opt(form.get('address_line')), city: opt(form.get('city')),
    map_embed_url: opt(form.get('map_embed_url')), logo_url: opt(form.get('logo_url')),
    instagram_url: opt(form.get('instagram_url')), facebook_url: opt(form.get('facebook_url')),
    tiktok_url: opt(form.get('tiktok_url')), snapchat_url: opt(form.get('snapchat_url')),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { error } = await g.supabase.from('business_settings').update({ ...parsed.data, phone, whatsapp_phone: whatsapp }).eq('id', 1);
  return error ? { error: dbErrorMessage(error) } : done();
}

export async function saveBooking(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const parsed = z.object({
    online_booking_enabled: z.boolean(),
    slot_interval_minutes: z.coerce.number().int().min(5).max(120),
    booking_min_lead_minutes: z.coerce.number().int().min(0).max(10080),
    booking_max_days_ahead: z.coerce.number().int().min(1).max(365),
    max_pending_bookings_per_phone: z.coerce.number().int().min(1).max(20),
    deposit_policy: z.enum(['none', 'percent', 'fixed']),
    deposit_value: z.coerce.number().int().min(0).max(10_000_000),
    cancellation_policy: z.string().max(3000).nullable(), booking_terms: z.string().max(3000).nullable(),
  }).refine((d) => d.deposit_policy !== 'percent' || d.deposit_value <= 100, { message: 'Un pourcentage d\'acompte ne peut pas dépasser 100.' })
    .safeParse({
      online_booking_enabled: bool(form.get('online_booking_enabled')),
      slot_interval_minutes: form.get('slot_interval_minutes'), booking_min_lead_minutes: form.get('booking_min_lead_minutes'),
      booking_max_days_ahead: form.get('booking_max_days_ahead'), max_pending_bookings_per_phone: form.get('max_pending_bookings_per_phone'),
      deposit_policy: form.get('deposit_policy'), deposit_value: form.get('deposit_value') || 0,
      cancellation_policy: opt(form.get('cancellation_policy')), booking_terms: opt(form.get('booking_terms')),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { error } = await g.supabase.from('business_settings').update(parsed.data).eq('id', 1);
  return error ? { error: dbErrorMessage(error) } : done();
}

export async function saveShop(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const fee = opt(form.get('delivery_fee'));
  const parsed = z.object({
    shop_enabled: z.boolean(), pickup_enabled: z.boolean(), delivery_enabled: z.boolean(),
    delivery_fee: z.coerce.number().int().min(0).max(1_000_000).nullable(), delivery_zones_note: z.string().max(1000).nullable(),
  }).safeParse({
    shop_enabled: bool(form.get('shop_enabled')), pickup_enabled: bool(form.get('pickup_enabled')), delivery_enabled: bool(form.get('delivery_enabled')),
    delivery_fee: fee === null ? null : fee, delivery_zones_note: opt(form.get('delivery_zones_note')),
  });
  if (!parsed.success) return { error: 'Formulaire invalide.' };
  if (!parsed.data.pickup_enabled && !parsed.data.delivery_enabled && parsed.data.shop_enabled) return { error: 'Activez au moins le retrait au salon ou la livraison.' };
  const { error } = await g.supabase.from('business_settings').update(parsed.data).eq('id', 1);
  return error ? { error: dbErrorMessage(error) } : done();
}

const METHODS = ['cash', 'wave', 'orange_money', 'card', 'bank_transfer', 'other'] as const;

export async function savePayments(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const methods = form.getAll('accepted_payment_methods').map(String).filter((m): m is (typeof METHODS)[number] => (METHODS as readonly string[]).includes(m));
  if (!methods.length) return { error: 'Sélectionnez au moins un moyen de paiement.' };
  const wave = opt(form.get('wave_merchant_display'));
  const om = opt(form.get('orange_money_merchant_display'));
  if ((wave && wave.length > 60) || (om && om.length > 60)) return { error: 'Coordonnées de paiement trop longues.' };
  const { error } = await g.supabase.from('business_settings').update({
    accepted_payment_methods: methods, wave_merchant_display: wave, orange_money_merchant_display: om,
  }).eq('id', 1);
  return error ? { error: dbErrorMessage(error) } : done();
}

export async function saveLoyalty(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const pts = z.coerce.number().int().min(0).max(1000).safeParse(form.get('loyalty_points_per_1000_xof') || 0);
  if (!pts.success) return { error: 'Nombre de points invalide.' };
  const { error } = await g.supabase.from('business_settings').update({
    loyalty_enabled: bool(form.get('loyalty_enabled')), loyalty_points_per_1000_xof: pts.data,
  }).eq('id', 1);
  return error ? { error: dbErrorMessage(error) } : done();
}

export async function saveHours(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const time = /^\d{2}:\d{2}$/;
  const rows = [];
  for (let d = 1; d <= 7; d++) {
    const closed = !bool(form.get(`open_${d}`));
    const open = String(form.get(`from_${d}`) ?? '');
    const close = String(form.get(`to_${d}`) ?? '');
    if (!closed) {
      if (!time.test(open) || !time.test(close) || open >= close) return { error: `Horaires invalides pour le jour ${d} (ouverture avant fermeture).` };
    }
    rows.push({ weekday: d, is_closed: closed, open_time: closed ? null : open, close_time: closed ? null : close });
  }
  const { error } = await g.supabase.from('business_hours').upsert(rows, { onConflict: 'weekday' });
  return error ? { error: dbErrorMessage(error) } : done();
}

export async function addClosure(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const parsed = z.object({ start_date: z.iso.date(), end_date: z.iso.date(), reason: z.string().max(200).nullable() })
    .refine((d) => d.start_date <= d.end_date, { message: 'La date de fin doit suivre la date de début.' })
    .safeParse({ start_date: form.get('start_date'), end_date: form.get('end_date') || form.get('start_date'), reason: opt(form.get('reason')) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dates invalides.' };
  const { error } = await g.supabase.from('business_closures').insert(parsed.data);
  return error ? { error: dbErrorMessage(error) } : { ...done(), message: 'Fermeture ajoutée.' };
}

export async function deleteClosure(id: string): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  if (!z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('business_closures').delete().eq('id', id);
  return error ? { error: dbErrorMessage(error) } : { ...done(), message: 'Fermeture supprimée.' };
}

export async function completeOnboarding(): Promise<FormState> {
  const g = await guard(); if (!g) return denied;
  const { error } = await g.supabase.from('business_settings').update({ onboarding_completed: true }).eq('id', 1);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Configuration initiale terminée.' };
}
