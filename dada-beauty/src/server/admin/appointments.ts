'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertPermission, getStaffContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { dbErrorMessage } from '@/lib/errors';
import { dakarLocalToISO } from '@/lib/format';
import { normalizePhone } from '@/lib/phone';
import type { FormState } from './common';

const STATUSES = ['pending', 'confirmed', 'deposit_paid', 'in_progress', 'completed', 'cancelled', 'no_show'] as const;

export async function setAppointmentStatus(id: string, status: (typeof STATUSES)[number], reason?: string): Promise<FormState> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: 'Session expirée.' };
  if (!z.uuid().safeParse(id).success || !STATUSES.includes(status)) return { error: 'Requête invalide.' };
  const sb = (await createClient())!;
  const { error } = await sb.rpc('set_appointment_status', { p_appointment_id: id, p_status: status, p_reason: reason?.slice(0, 500) ?? null });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Statut mis à jour.' };
}

export async function rescheduleAppointment(_p: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({
    id: z.uuid(), date: z.iso.date(), time: z.string().regex(/^\d{2}:\d{2}$/), employeeId: z.uuid().optional().or(z.literal('')), reason: z.string().max(500).optional(),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Date ou heure invalide.' };
  try { await assertPermission('appointments.manage'); } catch { return { error: dbErrorMessage('PERMISSION_DENIED') }; }
  const sb = (await createClient())!;
  const { error } = await sb.rpc('reschedule_appointment', {
    p_appointment_id: parsed.data.id, p_new_start: dakarLocalToISO(parsed.data.date, parsed.data.time),
    p_new_employee_id: parsed.data.employeeId || null, p_reason: parsed.data.reason || null,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Rendez-vous reporté.' };
}

export async function saveAppointmentNotes(_p: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get('id'));
  const sb = await createClient();
  if (!sb || !z.uuid().safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await sb.rpc('update_appointment_notes', { p_appointment_id: id, p_notes: String(form.get('notes') ?? '').slice(0, 4000) });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/rendez-vous/${id}`);
  return { ok: true, message: 'Notes enregistrées.' };
}

const paymentSchema = z.object({
  appointmentId: z.uuid().optional(), orderId: z.uuid().optional(),
  amount: z.coerce.number().int().positive('Montant invalide'),
  method: z.enum(['cash', 'wave', 'orange_money', 'card', 'bank_transfer', 'gift_card', 'other']),
  kind: z.enum(['deposit', 'balance', 'full']),
  providerReference: z.string().trim().max(120).optional(), note: z.string().max(500).optional(), idempotencyKey: z.uuid(),
}).refine((d) => d.method !== 'gift_card' || Boolean(d.providerReference), { message: 'Indiquez le code de la carte cadeau.' });

/** Paiement enregistré par l'équipe (espèces ou transfert reçu et vérifié). */
export async function recordPayment(_p: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => v !== ''));
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  try { await assertPermission('payments.manage'); } catch { return { error: dbErrorMessage('PERMISSION_DENIED') }; }
  const d = parsed.data;
  const sb = (await createClient())!;
  const { error } = await sb.rpc('record_payment', {
    p_appointment_id: d.appointmentId ?? null, p_order_id: d.orderId ?? null, p_amount: d.amount, p_method: d.method, p_kind: d.kind,
    p_provider_reference: d.providerReference ?? null, p_note: d.note ?? null, p_idempotency_key: d.idempotencyKey,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Paiement enregistré.' };
}

/** Trace l'envoi manuel d'un message WhatsApp (lien wa.me ouvert par l'équipe). */
export async function logManualMessage(input: { appointmentId?: string; orderId?: string; customerId?: string; recipient: string; template: string; body: string }) {
  const ctx = await getStaffContext();
  if (!ctx) return;
  const sb = (await createClient())!;
  await sb.from('message_log').insert({
    channel: 'whatsapp', template: input.template.slice(0, 60), recipient: input.recipient.slice(0, 20), body: input.body.slice(0, 2000),
    appointment_id: input.appointmentId ?? null, order_id: input.orderId ?? null, customer_id: input.customerId ?? null, status: 'manual', created_by: ctx.userId,
  });
}

const createSchema = z.object({
  customerId: z.uuid().optional(), newName: z.string().trim().max(120).optional(), newPhone: z.string().trim().max(30).optional(),
  serviceIds: z.array(z.uuid()).min(1, 'Choisissez au moins une prestation'), employeeId: z.uuid('Choisissez une employée'),
  date: z.iso.date('Date requise'), time: z.string().regex(/^\d{2}:\d{2}$/, 'Heure requise'),
  source: z.enum(['admin', 'whatsapp', 'phone', 'walk_in']), status: z.enum(['pending', 'confirmed']),
  notes: z.string().max(2000).optional(), ignoreHours: z.boolean(),
});

export async function createAppointment(_p: FormState, form: FormData): Promise<FormState> {
  const parsed = createSchema.safeParse({
    customerId: form.get('customerId') || undefined, newName: form.get('newName') || undefined, newPhone: form.get('newPhone') || undefined,
    serviceIds: form.getAll('serviceIds').map(String), employeeId: form.get('employeeId'), date: form.get('date'), time: form.get('time'),
    source: form.get('source'), status: form.get('status'), notes: form.get('notes') || undefined, ignoreHours: form.get('ignoreHours') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  try { await assertPermission('appointments.manage'); } catch { return { error: dbErrorMessage('PERMISSION_DENIED') }; }
  const d = parsed.data;
  const sb = (await createClient())!;
  let customerId = d.customerId;
  if (!customerId) {
    const phone = normalizePhone(d.newPhone);
    if (!d.newName || d.newName.length < 2 || !phone) return { error: 'Sélectionnez une cliente ou saisissez nom et téléphone.' };
    const { data: existing } = await sb.from('customers').select('id').eq('phone', phone).maybeSingle();
    if (existing) customerId = existing.id;
    else {
      const { data: created, error } = await sb.from('customers').insert({ full_name: d.newName, phone, source: 'admin' }).select('id').single();
      if (error) return { error: dbErrorMessage(error) };
      customerId = created.id;
    }
  }
  const { data, error } = await sb.rpc('staff_create_appointment', {
    p_customer_id: customerId, p_service_ids: d.serviceIds, p_employee_id: d.employeeId, p_start: dakarLocalToISO(d.date, d.time),
    p_source: d.source, p_status: d.status, p_internal_notes: d.notes ?? null, p_ignore_hours: d.ignoreHours,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin', 'layout');
  redirect(`/admin/rendez-vous/${data}`);
}
