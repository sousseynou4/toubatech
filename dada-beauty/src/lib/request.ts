import { headers } from 'next/headers';
import { createHash } from 'node:crypto';

/** Empreinte anonymisée du client (IP + sel) pour la limitation anti-abus en base. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  const salt = process.env.RATE_LIMIT_SALT ?? 'dada-beauty';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}
