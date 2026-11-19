/**
 * Facturation — schéma de saisie, calcul des totaux et libellés.
 * Partagé par le formulaire (navigateur), l'API et l'affichage de la facture.
 */
import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => v || null);

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, 'Désignation requise').max(300),
  quantity: z.number().int().min(1).max(1000),
  // Négatif autorisé pour une ligne de remise.
  unit_price_cents: z.number().int().min(-10_000_000).max(10_000_000),
});

export const invoiceInputSchema = z
  .object({
    customer_type: z.enum(['individual', 'business']),
    customer_name: z.string().trim().min(1, 'Nom du client requis').max(120),
    customer_company: optionalText(160),
    customer_siren: optionalText(20),
    customer_vat: optionalText(20),
    customer_address: z.string().trim().min(5, 'Adresse du client requise').max(400),
    delivery_address: optionalText(400),
    customer_email: z.string().trim().email('Email invalide').max(200).optional().nullable().or(z.literal('')).transform((v) => v || null),
    customer_phone: optionalText(30),
    device: optionalText(200),
    diagnostic_reference: optionalText(40),
    service_date: z.string().date(),
    due_date: z.string().date(),
    operation_type: z.enum(['services', 'goods', 'mixed']),
    lines: z.array(invoiceLineSchema).min(1, 'Au moins une ligne').max(50),
    warranty: optionalText(500),
    notes: optionalText(1000),
    paid_at: z.string().date().optional().nullable(),
    payment_method: optionalText(40),
  })
  .refine((d) => invoiceTotal(d.lines) > 0, { message: 'Le total doit être positif', path: ['lines'] })
  .refine((d) => d.customer_type === 'individual' || !!d.customer_company, {
    message: 'Raison sociale requise pour un client professionnel',
    path: ['customer_company'],
  });

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

export const paymentSchema = z.object({
  paid_at: z.string().date(),
  payment_method: z.string().trim().min(1).max(40),
});

export function lineTotal(l: InvoiceLine): number {
  return l.quantity * l.unit_price_cents;
}

export function invoiceTotal(lines: InvoiceLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

/** "12,5" / "12.50" / "1 200" → 1250 / 1250 / 120000 centimes ; NaN si illisible. */
export function eurosToCents(input: string): number {
  const n = Number(input.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** Montant exact au centime (ex. 47950 → « 479,50 € »), pour les factures. */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** "2026-11-19" → « 19/11/2026 » sans décalage de fuseau. */
export function formatDateFr(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Date du jour à Lorient, au format AAAA-MM-JJ. */
export function todayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

export const OPERATION_LABELS: Record<InvoiceInput['operation_type'], string> = {
  services: 'Prestation de services',
  goods: 'Livraison de biens',
  mixed: 'Mixte (biens et services)',
};

export const PAYMENT_METHODS = ['Carte bancaire', 'Espèces', 'Virement', 'Chèque', 'Paiement en ligne (Stripe)'];

export const DEFAULT_WARRANTY =
  "Garantie commerciale TOUBA TECH de 12 mois, pièces et main-d'œuvre, à compter de la restitution (voir CGV), en plus des garanties légales.";

export interface InvoiceRow extends InvoiceInput {
  id: string;
  number: string;
  kind: 'invoice' | 'credit_note';
  credit_note_for: string | null;
  issue_date: string;
  total_cents: number;
  vat_mention: string;
  seller: {
    tradeName: string;
    legalName: string;
    status: string;
    address: string;
    siret: string;
    phone: string;
    email: string;
    website: string;
  };
  created_at: string;
}

export type InvoiceState = 'paid' | 'due' | 'overdue' | 'cancelled' | 'refunded' | 'credit_open';

export function invoiceState(
  inv: Pick<InvoiceRow, 'kind' | 'paid_at' | 'due_date'>,
  hasCreditNote: boolean,
  today = todayParis()
): InvoiceState {
  if (inv.kind === 'credit_note') return inv.paid_at ? 'refunded' : 'credit_open';
  if (hasCreditNote) return 'cancelled';
  if (inv.paid_at) return 'paid';
  return inv.due_date < today ? 'overdue' : 'due';
}

export const STATE_LABELS: Record<InvoiceState, { label: string; cls: string }> = {
  paid: { label: 'Payée', cls: 'bg-emerald/10 text-emerald-600' },
  due: { label: 'À encaisser', cls: 'bg-amber-50 text-amber-700' },
  overdue: { label: 'En retard', cls: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Annulée (avoir)', cls: 'bg-ink/8 text-ink-500' },
  refunded: { label: 'Avoir remboursé', cls: 'bg-ink/8 text-ink-500' },
  credit_open: { label: 'Avoir à rembourser', cls: 'bg-blue-50 text-blue-700' },
};
