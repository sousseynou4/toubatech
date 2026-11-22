import { BRAND } from './site';

/** Miroir de public.normalize_phone() : E.164, préfixe +221 par défaut. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && (d.startsWith('7') || d.startsWith('3'))) d = `221${d}`;
  if (d.length < 8 || d.length > 15) return null;
  return `+${d}`;
}

/** +221778088893 → « +221 77 808 88 93 » */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = e164.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}

/** Lien click-to-chat WhatsApp (wa.me) — fonctionne sans aucune intégration. */
export function whatsappLink(message?: string, phone: string = BRAND.whatsapp): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function telLink(phone: string = BRAND.phone): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}
