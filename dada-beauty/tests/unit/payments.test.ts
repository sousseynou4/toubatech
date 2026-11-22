import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { getProvider, onlineProviders } from '@/lib/payments';
import { waveProvider } from '@/lib/payments/wave';
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
  it('traduit les erreurs métier de la base', () => {
    expect(dbErrorMessage({ message: 'SLOT_UNAVAILABLE' })).toMatch(/créneau/);
    expect(dbErrorMessage({ message: 'PERMISSION_DENIED: pos.discount' })).toMatch(/autorisation/);
    expect(dbErrorMessage({ message: 'xyz' })).toMatch(/erreur/);
  });
});
