import { createHmac, timingSafeEqual } from 'node:crypto';
import { InvalidSignatureError, ProviderNotConfiguredError, type PaymentProvider } from './types';

/**
 * Wave Business — Checkout API.
 * Référence : https://docs.wave.com/checkout  (POST /v1/checkout/sessions,
 * webhook signé « Wave-Signature: t=<timestamp>,v1=<hmac-sha256> »).
 * ⚠ Non testé contre l'API réelle : nécessite un compte marchand Wave Business
 * et une clé API. À valider en environnement de test Wave avant production.
 */
const API = 'https://api.wave.com/v1';

export const waveProvider: PaymentProvider = {
  id: 'wave',
  label: 'Wave',
  isConfigured: () => Boolean(process.env.WAVE_API_KEY && process.env.WAVE_WEBHOOK_SECRET),

  async createCheckout(req) {
    const key = process.env.WAVE_API_KEY;
    if (!key) throw new ProviderNotConfiguredError('wave');
    const res = await fetch(`${API}/checkout/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': req.paymentId },
      body: JSON.stringify({
        amount: String(req.amount),
        currency: req.currency,
        client_reference: req.reference,
        success_url: req.successUrl,
        error_url: req.errorUrl,
      }),
    });
    if (!res.ok) throw new Error(`WAVE_API_ERROR ${res.status}`);
    const json = (await res.json()) as { id: string; wave_launch_url: string };
    return { providerReference: json.id, checkoutUrl: json.wave_launch_url };
  },

  async parseWebhook(rawBody, headers) {
    const secret = process.env.WAVE_WEBHOOK_SECRET;
    if (!secret) throw new ProviderNotConfiguredError('wave');
    const header = headers.get('wave-signature') ?? '';
    const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
    const ts = parts.t;
    const sig = parts.v1;
    if (!ts || !sig) throw new InvalidSignatureError();
    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) throw new InvalidSignatureError();
    const expected = createHmac('sha256', secret).update(ts + rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new InvalidSignatureError();

    const evt = JSON.parse(rawBody) as {
      id: string; type: string;
      data: { id: string; amount: string; payment_status?: string; checkout_status?: string };
    };
    const status = evt.type === 'checkout.session.completed' && evt.data.payment_status === 'succeeded'
      ? 'succeeded'
      : evt.type === 'checkout.session.payment_failed' ? 'failed' : 'pending';
    return { eventId: evt.id, providerReference: evt.data.id, status, amount: Number(evt.data.amount), raw: evt };
  },
};
