import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getProvider } from '@/lib/payments';
import { createServiceClient } from '@/lib/supabase/admin';
import { createPublicClient } from '@/lib/supabase/public';
import { env } from '@/lib/env';

/**
 * Initiation d'un paiement en ligne (acompte de rendez-vous ou commande).
 * Le montant est calculé EN BASE ; l'appelant prouve la propriété de la
 * réservation/commande avec la référence + le téléphone (ou code de suivi).
 * Répond 503 tant qu'aucun fournisseur n'est configuré : aucun paiement simulé.
 */
const schema = z.object({
  provider: z.enum(['wave', 'orange_money']),
  type: z.enum(['appointment', 'order']),
  reference: z.string().min(6).max(40),
  secret: z.string().min(4).max(40),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  const { provider: pid, type, reference, secret } = parsed.data;
  const provider = getProvider(pid);
  if (!provider?.isConfigured()) return NextResponse.json({ error: 'Paiement en ligne indisponible' }, { status: 503 });
  const admin = createServiceClient();
  const pub = createPublicClient();
  if (!admin || !pub) return NextResponse.json({ error: 'server not configured' }, { status: 503 });

  // Vérification de propriété via les RPC publiques (référence + téléphone / code).
  const lookup = type === 'appointment'
    ? await pub.rpc('get_public_booking', { p_reference: reference, p_phone: secret })
    : await pub.rpc('track_order', { p_reference: reference, p_secret: secret });
  if (!lookup.data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const table = type === 'appointment' ? 'appointments' : 'orders';
  const { data: target } = await admin.from(table).select('id').eq('reference', reference.toUpperCase()).single();
  if (!target) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: pay, error } = await admin.rpc('create_provider_payment', {
    p_appointment_id: type === 'appointment' ? target.id : null, p_order_id: type === 'order' ? target.id : null,
    p_kind: type === 'appointment' ? 'deposit' : 'full', p_provider: pid, p_idempotency_key: `${type}:${target.id}:${randomUUID()}`,
  });
  if (error || !pay) return NextResponse.json({ error: 'Rien à payer' }, { status: 409 });
  const p = pay as { payment_id: string; reference: string; amount: number };
  try {
    const session = await provider.createCheckout({
      paymentId: p.payment_id, reference: p.reference, amount: p.amount, currency: 'XOF', description: `Dada Beauty ${reference}`,
      successUrl: `${env.siteUrl}/suivi?paiement=ok`, errorUrl: `${env.siteUrl}/suivi?paiement=erreur`,
    });
    await admin.rpc('attach_provider_checkout', { p_payment_id: p.payment_id, p_provider_reference: session.providerReference, p_checkout_url: session.checkoutUrl });
    return NextResponse.json({ checkoutUrl: session.checkoutUrl });
  } catch {
    return NextResponse.json({ error: 'Le prestataire de paiement est indisponible' }, { status: 502 });
  }
}
