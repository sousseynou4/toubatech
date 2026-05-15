import { z } from 'zod';

/**
 * Server-side validation schema. Mirrors the client-side form types
 * but is the source of truth — never trust the client.
 */
export const diagnosticSchema = z.object({
  device: z.enum(['smartphone', 'tablette', 'pc-portable', 'console', 'autre']),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  problems: z
    .array(z.enum(['ecran', 'batterie', 'charge', 'oxydation', 'micro-soudure', 'logiciel', 'autre']))
    .min(1, 'Au moins un problème doit être sélectionné')
    .max(7),
  problemDetails: z.string().max(2000).optional().default(''),
  incident: z.enum(['chute', 'eau', 'reparation-anterieure', 'aucun']),
  incidentDetails: z.string().max(2000).optional().default(''),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email('Email invalide').max(160),
  phone: z.string().trim().min(8).max(30),
  pickup: z.enum(['siege', 'point-relais', 'domicile']),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date au format YYYY-MM-DD attendu')
    .optional()
    .or(z.literal('')),
  preferredTime: z.string().max(40).optional().default(''),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement RGPD est requis' }),
  }),
});

export type DiagnosticPayload = z.infer<typeof diagnosticSchema>;

/** Generate a human-readable reference: TT-YYMMDD-XXXX */
export function generateReference(): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  // 4 alphanumeric chars, ambiguous chars (0/O, 1/I/L) avoided
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TT-${yy}${mm}${dd}-${suffix}`;
}
