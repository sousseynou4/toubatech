import { NextResponse, type NextRequest } from 'next/server';
import { getProvider } from '@/lib/payments';
import { InvalidSignatureError, ProviderNotConfiguredError } from '@/lib/payments/types';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Webhook des fournisseurs de paiement.
 * 1. Signature vérifiée par l'adaptateur (sinon 401).
 * 2. Confirmation idempotente en base (confirm_provider_payment, service_role uniquement),
 *    avec contrôle du montant attendu.
 */
export async function POST(request: NextRequest, { params }: RouteContext<'/api/paiements/webhook/[provider]'>) {
  const { provider: id } = await params;
  const provider = getProvider(id);
  if (!provider) return NextResponse.json({ error: 'unknown provider' }, { status: 404 });
  if (!provider.isConfigured()) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 100_000) return NextResponse.json({ error: 'payload too large' }, { status: 413 });

  let event;
  try {
    event = await provider.parseWebhook(raw, request.headers);
  } catch (e) {
    if (e instanceof InvalidSignatureError) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    if (e instanceof ProviderNotConfiguredError) return NextResponse.json({ error: 'not configured' }, { status: 503 });
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  if (event.status === 'pending') return NextResponse.json({ ignored: true });

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: 'server not configured' }, { status: 503 });
  const { data, error } = await admin.rpc('confirm_provider_payment', {
    p_provider: provider.id, p_event_id: event.eventId, p_provider_reference: event.providerReference,
    p_status: event.status, p_amount: event.amount, p_payload: event.raw as object,
  });
  if (error) return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  return NextResponse.json({ received: true, result: data });
}
