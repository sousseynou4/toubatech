const TZ = 'Africa/Dakar';

const xof = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 15000 → « 15 000 FCFA » */
export function formatXOF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `${xof.format(Math.round(amount)).replace(/ | /g, ' ')} FCFA`;
}

export function formatPrice(price: number | null | undefined, isFrom = false): string {
  if (price === null || price === undefined) return 'Tarif sur demande';
  return `${isFrom ? 'À partir de ' : ''}${formatXOF(price)}`;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return 'Durée à confirmer';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatDate = (d: string | Date) => dateFmt.format(new Date(d));
export const formatShortDate = (d: string | Date) => shortDateFmt.format(new Date(d));
export const formatTime = (d: string | Date) => timeFmt.format(new Date(d));
export const formatDateTime = (d: string | Date) => dateTimeFmt.format(new Date(d));

/** Date du jour à Dakar au format AAAA-MM-JJ */
export function todayInDakar(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Ajoute n jours à une date AAAA-MM-JJ (calcul calendaire, sans fuseau). */
export function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Dakar est en UTC+0 toute l'année (pas d'heure d'été) : conversion explicite et testée. */
export function dakarLocalToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00Z`).toISOString();
}

export function isoWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export const WEEKDAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;
