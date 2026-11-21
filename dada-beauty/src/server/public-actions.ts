'use server';

import { createPublicClient } from '@/lib/supabase/public';
import { createServiceClient } from '@/lib/supabase/admin';
import { bookingSchema, fieldErrors, lookupSchema, orderSchema, quoteSchema, reviewSchema, slotsQuerySchema } from '@/lib/validation';
import { dbErrorMessage } from '@/lib/errors';
import { clientKey } from '@/lib/request';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };

const NOT_CONFIGURED: ActionResult<never> = { ok: false, error: 'Le service est en cours de configuration. Contactez-nous sur WhatsApp.' };

export interface Slot { start: string; end: string; employeeIds: string[] }

export async function fetchSlots(input: { serviceId: string; date: string; employeeId?: string }): Promise<ActionResult<Slot[]>> {
  const parsed = slotsQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Paramètres invalides' };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;
  const { data, error } = await sb.rpc('get_available_slots', {
    p_service_id: parsed.data.serviceId, p_date: parsed.data.date, p_employee_id: parsed.data.employeeId ?? null,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  const map = new Map<string, Slot>();
  for (const row of (data ?? []) as { slot_start: string; slot_end: string; employee_id: string }[]) {
    const key = new Date(row.slot_start).toISOString();
    const s = map.get(key) ?? { start: key, end: new Date(row.slot_end).toISOString(), employeeIds: [] };
    s.employeeIds.push(row.employee_id);
    map.set(key, s);
  }
  return { ok: true, data: [...map.values()].sort((a, b) => a.start.localeCompare(b.start)) };
}

export async function fetchServiceEmployees(serviceId: string): Promise<ActionResult<{ id: string; display_name: string; specialties: string[]; photo_url: string | null }[]>> {
  if (!/^[0-9a-f-]{36}$/i.test(serviceId)) return { ok: false, error: 'Paramètres invalides' };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;
  const { data, error } = await sb.rpc('public_service_employees', { p_service_id: serviceId });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: data ?? [] };
}

export interface BookingConfirmation {
  reference: string; status: string; start_at: string; end_at: string; service_name: string;
  employee_name: string; total_amount: number; deposit_required: number;
}

export async function submitBooking(input: unknown): Promise<ActionResult<BookingConfirmation>> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Merci de vérifier le formulaire.', fields: fieldErrors(parsed.error) };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;
  const d = parsed.data;
  const { data, error } = await sb.rpc('create_public_booking', {
    p_service_id: d.serviceId, p_start: d.start, p_employee_id: d.employeeId ?? null,
    p_full_name: d.fullName, p_phone: d.phone, p_email: d.email ?? null, p_notes: d.notes ?? null,
    p_marketing_consent: d.marketingConsent, p_payment_method: d.paymentMethod ?? null, p_client_key: await clientKey(),
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: data as BookingConfirmation };
}

export interface PublicBooking {
  reference: string; status: string; start_at: string; end_at: string; total_amount: number; deposit_required: number;
  paid_amount: number; employee_name: string; services: { name: string; price: number; duration: number }[];
}

export async function lookupBooking(input: { reference: string; phone: string }): Promise<ActionResult<PublicBooking>> {
  const parsed = lookupSchema.safeParse({ reference: input.reference, secret: input.phone });
  if (!parsed.success) return { ok: false, error: 'Référence ou téléphone invalide.' };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;
  const { data, error } = await sb.rpc('get_public_booking', { p_reference: parsed.data.reference, p_phone: parsed.data.secret });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data) return { ok: false, error: 'Aucun rendez-vous trouvé avec ces informations.' };
  return { ok: true, data: data as PublicBooking };
}

export async function cancelBooking(input: { reference: string; phone: string; reason?: string }): Promise<ActionResult<{ status: string }>> {
  const parsed = lookupSchema.safeParse({ reference: input.reference, secret: input.phone });
  if (!parsed.success) return { ok: false, error: 'Référence ou téléphone invalide.' };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;
  const { data, error } = await sb.rpc('cancel_public_booking', { p_reference: parsed.data.reference, p_phone: parsed.data.secret, p_reason: input.reason?.slice(0, 500) ?? null });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: data as { status: string } };
}

export interface OrderConfirmation { order_id: string; reference: string; tracking_code: string; total_amount: number; subtotal: number; delivery_fee: number; status: string }

export async function submitOrder(input: unknown): Promise<ActionResult<OrderConfirmation>> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Merci de vérifier le formulaire.', fields: fieldErrors(parsed.error) };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;
  const d = parsed.data;
  const { data, error } = await sb.rpc('create_public_order', {
    p_items: d.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_full_name: d.fullName, p_phone: d.phone, p_email: d.email ?? null, p_fulfillment: d.fulfillment,
    p_delivery_address: d.deliveryAddress ?? null, p_delivery_notes: d.deliveryNotes ?? null,
    p_payment_method: d.paymentMethod ?? null, p_marketing_consent: d.marketingConsent, p_client_key: await clientKey(),
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: data as OrderConfirmation };
}

export interface TrackedOrder {
  reference: string; status: string; fulfillment: string; total_amount: number; paid_amount: number; created_at: string;
  items: { label: string; quantity: number; line_total: number }[]; history: { status: string; at: string }[] | null;
}

export async function trackOrder(input: { reference: string; secret: string }): Promise<ActionResult<TrackedOrder>> {
  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Référence ou code invalide.' };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;
  const { data, error } = await sb.rpc('track_order', { p_reference: parsed.data.reference, p_secret: parsed.data.secret });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data) return { ok: false, error: 'Aucune commande trouvée avec ces informations.' };
  return { ok: true, data: data as TrackedOrder };
}

const MAX_FILE = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Demande de devis événementiel (FormData, photos d'inspiration facultatives). */
export async function submitQuote(_prev: unknown, form: FormData): Promise<ActionResult<{ reference: string }>> {
  const parsed = quoteSchema.safeParse({
    fullName: form.get('fullName'), phone: form.get('phone'), email: form.get('email') || undefined,
    eventType: form.get('eventType'), eventDate: form.get('eventDate'), eventLocation: form.get('eventLocation'),
    peopleCount: form.get('peopleCount'), servicesWanted: form.getAll('servicesWanted').map(String),
    budgetHint: form.get('budgetHint') || undefined, message: form.get('message') || undefined,
  });
  if (!parsed.success) return { ok: false, error: 'Merci de vérifier le formulaire.', fields: fieldErrors(parsed.error) };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;

  const files = form.getAll('inspiration').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return { ok: false, error: 'Formats acceptés : JPG, PNG, WEBP.', fields: { inspiration: 'Format non accepté' } };
    if (f.size > MAX_FILE) return { ok: false, error: 'Chaque photo doit faire moins de 5 Mo.', fields: { inspiration: 'Fichier trop lourd' } };
  }
  const paths: string[] = [];
  if (files.length) {
    const admin = createServiceClient();
    if (!admin) return { ok: false, error: 'L\'envoi de photos n\'est pas encore activé. Envoyez-les-nous sur WhatsApp.' };
    for (const f of files) {
      const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const { error } = await admin.storage.from('quote-inspirations').upload(path, f, { contentType: f.type, upsert: false });
      if (error) return { ok: false, error: 'Échec de l\'envoi d\'une photo. Réessayez ou envoyez-la sur WhatsApp.' };
      paths.push(path);
    }
  }
  const d = parsed.data;
  const { data, error } = await sb.rpc('create_event_quote', {
    p_full_name: d.fullName, p_phone: d.phone, p_email: d.email ?? null, p_event_type: d.eventType, p_event_date: d.eventDate,
    p_event_location: d.eventLocation, p_people_count: d.peopleCount, p_services_wanted: d.servicesWanted,
    p_budget_hint: d.budgetHint ?? null, p_message: d.message ?? null, p_inspiration_paths: paths, p_client_key: await clientKey(),
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: data as { reference: string } };
}

export async function submitReview(_prev: unknown, form: FormData): Promise<ActionResult<null>> {
  const parsed = reviewSchema.safeParse({ token: form.get('token'), displayName: form.get('displayName'), rating: form.get('rating'), comment: form.get('comment') || undefined });
  if (!parsed.success) return { ok: false, error: 'Merci de vérifier le formulaire.', fields: fieldErrors(parsed.error) };
  const sb = createPublicClient();
  if (!sb) return NOT_CONFIGURED;
  const { error } = await sb.rpc('submit_review', { p_token: parsed.data.token, p_display_name: parsed.data.displayName, p_rating: parsed.data.rating, p_comment: parsed.data.comment ?? null });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: null };
}
