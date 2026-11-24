import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { getProvider, onlineProviders } from '@/lib/payments';
import { verifyWaveSignature, waveProvider, waveSignatureHeader } from '@/lib/payments/wave';
import { orangeMoneyProvider } from '@/lib/payments/orange-money';
import { dbErrorMessage } from '@/lib/errors';

const env = { ...process.env };
afterEach(() => { process.env = { ...env }; });

describe('paiements', () => {
  it('aucun fournisseur actif sans clés : aucun paiement simulé', async () => {
    delete process.env.WAVE_API_KEY; delete process.env.WAVE_WEBHOOK_SECRET;
    expect(onlineProviders()).toHaveLength(0);
    await expect(waveProvider.createCheckout({ paymentId: 'x', reference: 'r', amount: 1, currency: 'XOF', successUrl: '', errorUrl: '', description: '' })).rejects.toThrow('PROVIDER_NOT_CONFIGURED');
  });
  it('Orange Money reste désactivé tant que le contrat marchand n\'est pas fourni', async () => {
    expect(orangeMoneyProvider.isConfigured()).toBe(false);
    await expect(orangeMoneyProvider.parseWebhook('{}', new Headers())).rejects.toThrow('PROVIDER_NOT_CONFIGURED');
  });
  it('rejette un fournisseur inconnu', () => {
    expect(getProvider('paypal')).toBeNull();
  });
  it('Wave : signature HMAC vérifiée, horodatage borné', async () => {
    process.env.WAVE_API_KEY = 'k'; process.env.WAVE_WEBHOOK_SECRET = 'secret';
    const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { id: 'cos-1', amount: '4500', payment_status: 'succeeded' } });
    const t = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', 'secret').update(t + body).digest('hex');
    const evt = await waveProvider.parseWebhook(body, new Headers({ 'wave-signature': `t=${t},v1=${sig}` }));
    expect(evt).toMatchObject({ eventId: 'evt_1', providerReference: 'cos-1', status: 'succeeded', amount: 4500 });
    await expect(waveProvider.parseWebhook(body, new Headers({ 'wave-signature': `t=${t},v1=${'0'.repeat(64)}` }))).rejects.toThrow('INVALID_SIGNATURE');
    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const oldSig = createHmac('sha256', 'secret').update(old + body).digest('hex');
    await expect(waveProvider.parseWebhook(body, new Headers({ 'wave-signature': `t=${old},v1=${oldSig}` }))).rejects.toThrow('INVALID_SIGNATURE');
  });
  // Exemple officiel de la documentation Wave (https://docs.wave.com/webhook, « Example Wave-Signature validation »).
  const DOC_SECRET = 'wave_sn_WHS_xz4m6g8rjs9bshxy05xj4khcvjv7j3hcp4fbpvv6met0zdrjvezg';
  const DOC_HEADER = 't=1667920421,v1=53c971695230e9c51b1030d673eee76e70bbcdf8a7c5b8c1d44e0b8b1329647b';
  const DOC_BODY = '{"id": "AE_ijzo7oGgrlM7", "type": "checkout.session.completed", "data": {"id": "cos-1b01sghpg100j", "amount": "100", "checkout_status": "complete", "client_reference": null, "currency": "XOF", "error_url": "https://example.com/error", "last_payment_error": null, "business_name": "Annas Apiaries", "payment_status": "succeeded", "success_url": "https://example.com/success", "wave_launch_url": "https://pay.wave.com/c/cos-1b01sghpg100j?a=100&c=XOF&m=Annas%20Apiaries", "when_completed": "2022-11-08T15:05:45Z", "when_created": "2022-11-08T15:05:32Z", "when_expires": "2022-11-09T15:05:32Z", "transaction_id": "TCN4Y4ZC3FM"}}';

  it('Wave : valide l\'exemple signé de la documentation officielle', () => {
    expect(verifyWaveSignature(DOC_HEADER, DOC_BODY, DOC_SECRET, 1667920421)).toBe(true);
    // Corps re-sérialisé (espaces retirés) : la signature porte sur le corps brut, elle doit échouer.
    expect(verifyWaveSignature(DOC_HEADER, JSON.stringify(JSON.parse(DOC_BODY)), DOC_SECRET, 1667920421)).toBe(false);
    // Rejouée plus de 5 minutes après : refusée.
    expect(verifyWaveSignature(DOC_HEADER, DOC_BODY, DOC_SECRET, 1667920421 + 301)).toBe(false);
  });

  it('Wave : accepte plusieurs signatures v1 (rotation du secret)', () => {
    const now = 1_800_000_000;
    const good = waveSignatureHeader('nouveau', DOC_BODY, now);
    const t = good.split(',')[0];
    const v1 = good.split(',')[1];
    expect(verifyWaveSignature(`${t},v1=${'a'.repeat(64)},${v1}`, DOC_BODY, 'nouveau', now)).toBe(true);
    expect(verifyWaveSignature(`${t},${v1},v1=${'a'.repeat(64)}`, DOC_BODY, 'nouveau', now)).toBe(true);
    expect(verifyWaveSignature(`${t},v1=${'a'.repeat(64)}`, DOC_BODY, 'nouveau', now)).toBe(false);
    expect(verifyWaveSignature('n\'importe quoi', DOC_BODY, 'nouveau', now)).toBe(false);
  });

  it('Wave : un échec de paiement n\'est pas définitif (la cliente peut réessayer)', async () => {
    process.env.WAVE_API_KEY = 'k'; process.env.WAVE_WEBHOOK_SECRET = 'secret';
    const body = JSON.stringify({ id: 'EV_8bO0d7TwW6Eq', type: 'checkout.session.payment_failed', data: { id: 'cos-18qq25rgr100a', payment_status: 'failed', checkout_status: 'failed', last_payment_error: { code: 'insufficient-funds', message: 'Insufficient balance' } } });
    const evt = await waveProvider.parseWebhook(body, new Headers({ 'wave-signature': waveSignatureHeader('secret', body, Date.now() / 1000) }));
    expect(evt).toMatchObject({ status: 'pending', amount: null, providerReference: 'cos-18qq25rgr100a' });
    const test = JSON.stringify({ id: 'EV_t', type: 'test.test_event', data: {} });
    expect((await waveProvider.parseWebhook(test, new Headers({ 'wave-signature': waveSignatureHeader('secret', test, Date.now() / 1000) }))).status).toBe('pending');
  });

  it('traduit les erreurs métier de la base', () => {
    expect(dbErrorMessage({ message: 'SLOT_UNAVAILABLE' })).toMatch(/créneau/);
    expect(dbErrorMessage({ message: 'PERMISSION_DENIED: pos.discount' })).toMatch(/autorisation/);
    expect(dbErrorMessage({ message: 'xyz' })).toMatch(/erreur/);
  });
});
