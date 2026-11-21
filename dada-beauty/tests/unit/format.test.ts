import { describe, expect, it } from 'vitest';
import { addDays, dakarLocalToISO, formatDuration, formatPrice, formatXOF, isoWeekday, todayInDakar } from '@/lib/format';

describe('format', () => {
  it('formate les FCFA sans décimales', () => {
    expect(formatXOF(15000)).toBe('15 000 FCFA');
    expect(formatXOF(0)).toBe('0 FCFA');
    expect(formatXOF(null)).toBe('—');
  });
  it('affiche « Tarif sur demande » pour un prix non configuré (jamais inventé)', () => {
    expect(formatPrice(null)).toBe('Tarif sur demande');
    expect(formatPrice(25000, true)).toBe('À partir de 25 000 FCFA');
  });
  it('formate les durées', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(95)).toBe('1 h 35');
    expect(formatDuration(null)).toBe('Durée à confirmer');
  });
  it('calcule les dates calendaires et le jour ISO', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(isoWeekday('2026-11-23')).toBe(1); // lundi
    expect(isoWeekday('2026-11-22')).toBe(7); // dimanche
  });
  it('Africa/Dakar = UTC+0 toute l\'année', () => {
    expect(dakarLocalToISO('2026-07-01', '10:30')).toBe('2026-07-01T10:30:00.000Z');
    expect(todayInDakar(new Date('2026-11-21T23:59:00Z'))).toBe('2026-11-21');
  });
});
