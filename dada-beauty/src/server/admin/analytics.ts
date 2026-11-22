'use server';

import { addDays, todayInDakar } from '@/lib/format';

export type Preset = '7j' | '30j' | 'mois' | 'mois-dernier' | '12m' | 'perso';

/** Résout une période (dates AAAA-MM-JJ, heure de Dakar) à partir d'un préréglage. */
export async function resolveRange(preset: string | undefined, from?: string, to?: string): Promise<{ preset: Preset; from: string; to: string }> {
  const today = todayInDakar();
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  switch (preset) {
    case '7j': return { preset: '7j', from: addDays(today, -6), to: today };
    case 'mois': return { preset: 'mois', from: `${today.slice(0, 8)}01`, to: today };
    case 'mois-dernier': {
      const firstThis = `${today.slice(0, 8)}01`;
      const lastPrev = addDays(firstThis, -1);
      return { preset: 'mois-dernier', from: `${lastPrev.slice(0, 8)}01`, to: lastPrev };
    }
    case '12m': return { preset: '12m', from: addDays(today, -364), to: today };
    case 'perso':
      if (isDate(from) && isDate(to) && from! <= to!) return { preset: 'perso', from: from!, to: to! };
      return { preset: '30j', from: addDays(today, -29), to: today };
    default: return { preset: '30j', from: addDays(today, -29), to: today };
  }
}
