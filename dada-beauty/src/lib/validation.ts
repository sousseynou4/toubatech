import { z } from 'zod';
import { normalizePhone } from './phone';

const phone = z
  .string()
  .trim()
  .min(6, 'Numéro de téléphone requis')
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Numéro de téléphone invalide' });
      return z.NEVER;
    }
    return n;
  });

const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.email('Adresse email invalide').optional());

export const paymentMethodSchema = z.enum(['cash', 'wave', 'orange_money', 'card', 'bank_transfer', 'other']);

export const bookingSchema = z.object({
  serviceId: z.uuid(),
  employeeId: z.uuid().optional().or(z.literal('').transform(() => undefined)),
  start: z.iso.datetime({ offset: true }),
  fullName: z.string().trim().min(2, 'Nom requis').max(120),
  phone,
  email: optionalEmail,
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  marketingConsent: z.boolean().default(false),
  acceptTerms: z.literal(true, { error: 'Merci d\'accepter les conditions de réservation' }),
});
export type BookingInput = z.input<typeof bookingSchema>;

export const slotsQuerySchema = z.object({
  serviceId: z.uuid(),
  date: z.iso.date(),
  employeeId: z.uuid().optional(),
});

export const cartItemSchema = z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(20) });

export const orderSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, 'Panier vide').max(30),
    fullName: z.string().trim().min(2, 'Nom requis').max(120),
    phone,
    email: optionalEmail,
    fulfillment: z.enum(['pickup', 'delivery']),
    deliveryAddress: z.string().trim().max(300).optional(),
    deliveryNotes: z.string().trim().max(500).optional(),
    paymentMethod: paymentMethodSchema.optional(),
    marketingConsent: z.boolean().default(false),
  })
  .refine((o) => o.fulfillment !== 'delivery' || (o.deliveryAddress?.length ?? 0) >= 5, {
    message: 'Adresse de livraison requise',
    path: ['deliveryAddress'],
  });

export const quoteSchema = z.object({
  fullName: z.string().trim().min(2, 'Nom requis').max(120),
  phone,
  email: optionalEmail,
  eventType: z.enum(['mariage', 'bapteme', 'anniversaire', 'ceremonie', 'domicile', 'autre']),
  eventDate: z.iso.date('Date requise'),
  eventLocation: z.string().trim().min(2, 'Lieu requis').max(300),
  peopleCount: z.coerce.number().int().min(1).max(200),
  servicesWanted: z.array(z.string().max(80)).max(20).default([]),
  budgetHint: z.coerce.number().int().min(0).max(100_000_000).optional(),
  message: z.string().trim().max(2000).optional(),
});

export const reviewSchema = z.object({
  token: z.string().min(8).max(64),
  displayName: z.string().trim().min(2).max(60),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1500).optional(),
});

export const lookupSchema = z.object({
  reference: z.string().trim().min(6).max(40).transform((s) => s.toUpperCase()),
  secret: z.string().trim().min(4).max(40),
});

/** Montant FCFA saisi par l'équipe : « 15 000 » → 15000 */
export const amountSchema = z
  .string()
  .or(z.number())
  .transform((v) => (typeof v === 'number' ? v : Number(String(v).replace(/[\s  ]/g, ''))))
  .pipe(z.number().int('Montant entier en FCFA').min(0).max(1_000_000_000));

export const optionalAmountSchema = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? null : Number(v.replace(/[\s  ]/g, ''))))
  .pipe(z.number().int().min(0).max(1_000_000_000).nullable());

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
