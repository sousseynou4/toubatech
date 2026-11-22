import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhone, whatsappLink } from '@/lib/phone';

describe('téléphone', () => {
  it('normalise les numéros sénégalais en E.164 (comme la base)', () => {
    expect(normalizePhone('77 808 88 93')).toBe('+221778088893');
    expect(normalizePhone('+221 77 808 88 93')).toBe('+221778088893');
    expect(normalizePhone('00221778088893')).toBe('+221778088893');
    expect(normalizePhone('338001122')).toBe('+221338001122');
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
  it('affiche joliment le numéro', () => {
    expect(formatPhone('+221778088893')).toBe('+221 77 808 88 93');
  });
  it('construit un lien WhatsApp encodé', () => {
    expect(whatsappLink('Bonjour & merci', '+221778088893')).toBe('https://wa.me/221778088893?text=Bonjour%20%26%20merci');
  });
});
