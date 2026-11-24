import { createHmac, timingSafeEqual } from 'node:crypto';
import { InvalidSignatureError, ProviderNotConfiguredError, type PaymentProvider } from './types';

/**
 * Wave Business — Checkout API.
 * Vérifié le 24/11/2026 contre la documentation officielle (https://docs.wave.com/checkout et
 * https://docs.wave.com/webhook). Reste à tester avec un compte marchand Wave Business avant d'ouvrir
 * le paiement en ligne aux clientes.
 *
 * - Création : POST https://api.wave.com/v1/checkout/sessions, montant en chaîne sans décimales pour le
 *   XOF ; la page de paiement (wave_launch_url) doit s'ouvrir dans le navigateur de la cliente.
 *   Une session expire 30 minutes après sa création.
 * - Signature facultative des requêtes (recommandée par Wave contre le vol de clé) : si la clé API a été
 *   créée avec « request signing », renseigner WAVE_API_SIGNING_SECRET (wave_sn_AKS_…).
 * - Webhooks : à déclarer chez Wave avec la stratégie « Signing Secret ». En-tête
 *   Wave-Signature: t=<horodatage>,v1=<hmac-sha256 hex>[,v1=…] (plusieurs v1 pendant une rotation),
 *   HMAC-SHA256(secret, horodatage + corps brut), refus au-delà de 5 minutes.
 * - checkout.session.payment_failed n'est PAS définitif : « vous pouvez recevoir plusieurs échecs avant
 *   un succès » (solde insuffisant puis rechargement). On l'ignore et le paiement reste en attente ;
 *   seul checkout.session.completed avec payment_status = succeeded confirme un paiement.
 */
const API = 'https://api.wave.com/v1';
const MAX_SKEW_SECONDS = 300;

/** En-tête Wave-Signature « t=…,v1=… » pour un corps donné (requêtes signées, tests). */
export function waveSignatureHeader(secret: string, body: string, timestamp: number): string {
  const t = String(Math.floor(timestamp));
  return `t=${t},v1=${createHmac('sha256', secret).update(t + body).digest('hex')}`;
}

/**
 * Vérifie un en-tête Wave-Signature : horodatage récent et au moins une signature v1 valide
 * (Wave peut en envoyer plusieurs pendant la rotation d'un secret).
 */
export function verifyWaveSignature(header: string, rawBody: string, secret: string, nowSeconds = Date.now() / 1000): boolean {
  const parts = header.split(',').map((p) => p.trim());
  const ts = parts.find((p) => p.startsWith('t='))?.slice(2) ?? '';
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!/^\d{1,12}$/.test(ts) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(ts)) > MAX_SKEW_SECONDS) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(ts + rawBody).digest('hex'));
  return signatures.some((sig) => {
    const got = Buffer.from(sig);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export const waveProvider: PaymentProvider = {
  id: 'wave',
  label: 'Wave',
  isConfigured: () => Boolean(process.env.WAVE_API_KEY && process.env.WAVE_WEBHOOK_SECRET),

  async createCheckout(req) {
    const key = process.env.WAVE_API_KEY;
    if (!key) throw new ProviderNotConfiguredError('wave');
    const body = JSON.stringify({
      amount: String(req.amount),
      currency: req.currency,
      client_reference: req.reference,
      success_url: req.successUrl,
      error_url: req.errorUrl,
    });
    const headers: Record<string, string> = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': req.paymentId };
    const signingSecret = process.env.WAVE_API_SIGNING_SECRET;
    if (signingSecret) headers['Wave-Signature'] = waveSignatureHeader(signingSecret, body, Date.now() / 1000);
    const res = await fetch(`${API}/checkout/sessions`, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`WAVE_API_ERROR ${res.status}`);
    const json = (await res.json()) as { id: string; wave_launch_url: string };
    return { providerReference: json.id, checkoutUrl: json.wave_launch_url };
  },

  async parseWebhook(rawBody, headers) {
    const secret = process.env.WAVE_WEBHOOK_SECRET;
    if (!secret) throw new ProviderNotConfiguredError('wave');
    if (!verifyWaveSignature(headers.get('wave-signature') ?? '', rawBody, secret)) throw new InvalidSignatureError();

    const evt = JSON.parse(rawBody) as {
      id: string; type: string;
      data?: { id?: string; amount?: string; payment_status?: string; checkout_status?: string };
    };
    const succeeded = evt.type === 'checkout.session.completed' && evt.data?.payment_status === 'succeeded';
    // Montant XOF : chaîne d'entiers. Un montant absent ou mal formé est transmis tel quel (null) : la base
    // le compare au montant attendu et refuse la confirmation en cas d'écart.
    const amount = succeeded && /^\d+$/.test(evt.data?.amount ?? '') ? Number(evt.data!.amount) : null;
    return { eventId: evt.id, providerReference: evt.data?.id ?? '', status: succeeded ? 'succeeded' : 'pending', amount, raw: evt };
  },
};
