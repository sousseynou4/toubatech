import { describe, expect, it } from 'vitest';
import { bookingSchema, orderSchema, promoCodeSchema, quoteSchema } from '@/lib/validation';

const base = {
  serviceId: '3f0c1a5e-6f1b-4b47-9d7e-2b2f1c0a9a11', start: '2026-12-01T10:00:00.000Z', fullName: 'Fatou Diop', phone: '77 111 22 33',
  marketingConsent: false, acceptTerms: true as const,
};

describe('validation', () => {
  it('accepte une réservation valide et normalise le téléphone', () => {
    const r = bookingSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+221771112233');
  });
  it('refuse une réservation sans acceptation des conditions', () => {
    expect(bookingSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
  });
  it('refuse un téléphone invalide', () => {
    expect(bookingSchema.safeParse({ ...base, phone: '12' }).success).toBe(false);
  });
  it('n\'accepte aucun prix venant du navigateur (champ ignoré)', () => {
    const r = bookingSchema.safeParse({ ...base, price: 1 } as unknown);
    expect(r.success && 'price' in r.data).toBe(false);
  });
  it('exige une adresse pour la livraison', () => {
    const order = { items: [{ variantId: base.serviceId, quantity: 1 }], fullName: 'Awa', phone: '771112233', fulfillment: 'delivery' };
    expect(orderSchema.safeParse(order).success).toBe(false);
    expect(orderSchema.safeParse({ ...order, deliveryAddress: 'Cité Fadia, Guédiawaye' }).success).toBe(true);
  });
  it('borne les quantités du panier', () => {
    expect(orderSchema.safeParse({ items: [{ variantId: base.serviceId, quantity: 50 }], fullName: 'Awa', phone: '771112233', fulfillment: 'pickup' }).success).toBe(false);
  });
  it('valide une demande de devis', () => {
    expect(quoteSchema.safeParse({ fullName: 'Awa', phone: '771112233', eventType: 'mariage', eventDate: '2027-02-14', eventLocation: 'Dakar', peopleCount: '4' }).success).toBe(true);
    expect(quoteSchema.safeParse({ fullName: 'Awa', phone: '771112233', eventType: 'fête', eventDate: '2027-02-14', eventLocation: 'Dakar', peopleCount: '4' }).success).toBe(false);
  });
  it('normalise un code promo et refuse les caractères invalides', () => {
    expect(promoCodeSchema.parse('  tabaski2027 ')).toBe('TABASKI2027');
    expect(promoCodeSchema.safeParse('AB').success).toBe(false);
    expect(promoCodeSchema.safeParse("PROMO'; --").success).toBe(false);
    const order = { items: [{ variantId: '3f0c1a5e-6f1b-4b47-9d7e-2b2f1c0a9a11', quantity: 1 }], fullName: 'Awa', phone: '771112233', fulfillment: 'pickup' };
    const r = orderSchema.safeParse({ ...order, promotionCode: 'bienvenue10' });
    expect(r.success && r.data.promotionCode).toBe('BIENVENUE10');
    expect(orderSchema.safeParse(order).success).toBe(true);
  });
});
