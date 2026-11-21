'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';
import type { FormState } from './common';

const denied: FormState = { error: dbErrorMessage('PERMISSION_DENIED') };
async function guard(permission: string) {
  try { return await assertPermission(permission); } catch { return null; }
}
const amount = z.string().or(z.number()).transform((v) => Number(String(v).replace(/[\s  ]/g, ''))).pipe(z.number().int('Montant entier en FCFA').min(0).max(1_000_000_000));

export async function openCashSession(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('cash.manage');
  if (!g) return denied;
  const parsed = amount.safeParse(form.get('opening_float') || 0);
  if (!parsed.success) return { error: 'Fond de caisse invalide.' };
  const { error } = await g.supabase.rpc('open_cash_session', { p_opening_float: parsed.data, p_notes: String(form.get('notes') ?? '').slice(0, 500) || null });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/caisse', 'layout');
  return { ok: true, message: 'Caisse ouverte.' };
}

export async function closeCashSession(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('cash.manage');
  if (!g) return denied;
  const id = z.uuid().safeParse(form.get('session_id'));
  const counted = amount.safeParse(form.get('counted_cash'));
  if (!id.success || !counted.success) return { error: 'Montant compté invalide.' };
  const { data, error } = await g.supabase.rpc('close_cash_session', { p_session_id: id.data, p_counted_cash: counted.data, p_notes: String(form.get('notes') ?? '').slice(0, 500) || null });
  if (error) return { error: dbErrorMessage(error) };
  const r = data as { expected_cash: number; counted_cash: number; difference: number };
  revalidatePath('/admin/caisse', 'layout');
  const fmt = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
  return { ok: true, message: `Caisse clôturée. Attendu : ${fmt(r.expected_cash)} · compté : ${fmt(r.counted_cash)} · écart : ${fmt(r.difference)}.` };
}

export async function cashMovement(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('cash.manage');
  if (!g) return denied;
  const parsed = z.object({ category: z.enum(['withdrawal', 'top_up']), amount: amount.pipe(z.number().positive('Montant invalide')), note: z.string().trim().min(3, 'Motif requis').max(300) })
    .safeParse({ category: form.get('category'), amount: form.get('amount'), note: form.get('note') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const { error } = await g.supabase.rpc('cash_movement', { p_direction: d.category === 'withdrawal' ? 'out' : 'in', p_category: d.category, p_amount: d.amount, p_note: d.note });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/caisse', 'layout');
  return { ok: true, message: 'Mouvement de caisse enregistré.' };
}

const lineSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('product'), variant_id: z.uuid(), quantity: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal('service'), service_id: z.uuid(), quantity: z.number().int().min(1).max(100), unit_price: z.number().int().min(0).max(100_000_000).optional() }),
]);
const checkoutSchema = z.object({
  customerId: z.uuid().nullable(),
  lines: z.array(lineSchema).min(1, 'Ajoutez au moins un article').max(50),
  payments: z.array(z.object({ method: z.enum(['cash', 'wave', 'orange_money', 'card', 'bank_transfer', 'other']), amount: z.number().int().positive('Montant de paiement invalide'), reference: z.string().max(120).optional() })).min(1, 'Ajoutez un paiement').max(5),
  discount: z.number().int().min(0).default(0),
  note: z.string().max(500).optional(),
  idempotencyKey: z.uuid(),
});
export type PosCheckoutInput = z.input<typeof checkoutSchema>;

/** Vente en caisse : prix des produits/prestations recalculés en base. */
export async function posCheckout(input: PosCheckoutInput): Promise<{ ok?: boolean; error?: string; message?: string; reference?: string; total?: number }> {
  const g = await guard('pos.use');
  if (!g) return { error: dbErrorMessage('PERMISSION_DENIED') };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Vente invalide.' };
  const d = parsed.data;
  const { data, error } = await g.supabase.rpc('pos_checkout', {
    p_customer_id: d.customerId, p_lines: d.lines, p_payments: d.payments.map((p) => ({ method: p.method, amount: p.amount, reference: p.reference ?? '' })),
    p_discount: d.discount, p_note: d.note ?? null, p_idempotency_key: d.idempotencyKey,
  });
  if (error) return { error: dbErrorMessage(error) };
  const r = data as { reference: string; total_amount: number };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: `Vente ${r.reference} enregistrée.`, reference: r.reference, total: r.total_amount };
}

export async function refundPayment(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('payments.refund');
  if (!g) return denied;
  const parsed = z.object({ payment_id: z.uuid(), amount: amount.pipe(z.number().positive('Montant invalide')), reason: z.string().trim().min(3, 'Motif requis').max(500) })
    .safeParse({ payment_id: form.get('payment_id'), amount: form.get('amount'), reason: form.get('reason') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { error } = await g.supabase.rpc('refund_payment', { p_payment_id: parsed.data.payment_id, p_amount: parsed.data.amount, p_reason: parsed.data.reason });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Remboursement enregistré.' };
}


export async function recordExpense(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('expenses.manage');
  if (!g) return denied;
  const parsed = z.object({
    category: z.enum(['stock', 'rent', 'salaries', 'utilities', 'marketing', 'equipment', 'consumables', 'transport', 'taxes', 'other']),
    label: z.string().trim().min(2, 'Libellé requis').max(200),
    amount: amount.pipe(z.number().positive('Montant invalide')),
    method: z.enum(['cash', 'wave', 'orange_money', 'card', 'bank_transfer', 'other']),
    spent_on: z.iso.date().optional().or(z.literal('')).transform((v) => v || null),
    supplier_id: z.uuid().optional().or(z.literal('')).transform((v) => v || null),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse({
    category: form.get('category'), label: form.get('label'), amount: form.get('amount'), method: form.get('method'),
    spent_on: form.get('spent_on') ?? '', supplier_id: form.get('supplier_id') ?? '', notes: form.get('notes') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const { error } = await g.supabase.rpc('record_expense', {
    p_category: d.category, p_label: d.label, p_amount: d.amount, p_method: d.method, p_spent_on: d.spent_on, p_supplier_id: d.supplier_id, p_notes: d.notes ?? null,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/depenses');
  revalidatePath('/admin/caisse', 'layout');
  return { ok: true, message: 'Dépense enregistrée.' };
}
