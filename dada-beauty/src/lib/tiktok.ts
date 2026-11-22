/**
 * Liens TikTok : extraction de l'identifiant de vidéo et URL du lecteur officiel.
 *
 * Formats acceptés :
 *  - https://www.tiktok.com/@compte/video/7312345678901234567
 *  - https://www.tiktok.com/@compte/photo/7312345678901234567 (carrousel photo)
 *  - https://www.tiktok.com/embed/v2/7312345678901234567, …/player/v1/…
 *  - liens courts de l'application (vm.tiktok.com/…, vt.tiktok.com/…, tiktok.com/t/…) :
 *    ils doivent d'abord être résolus côté serveur (redirection), voir isShortTikTokLink.
 */

export interface ParsedTikTok { videoId: string; handle: string | null; url: string }

const HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']);
const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);

function toUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

/** Lien court partagé depuis l'application : il faut suivre la redirection pour connaître la vidéo. */
export function isShortTikTokLink(input: string): boolean {
  const u = toUrl(input);
  if (!u) return false;
  const host = u.hostname.toLowerCase();
  return SHORT_HOSTS.has(host) || (HOSTS.has(host) && /^\/t\/[A-Za-z0-9]+\/?$/.test(u.pathname));
}

/** Hôte autorisé pour suivre une redirection de lien court (anti-SSRF). */
export function isTikTokHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return HOSTS.has(h) || SHORT_HOSTS.has(h);
}

export function parseTikTokUrl(input: string): ParsedTikTok | null {
  const u = toUrl(input);
  if (!u || !HOSTS.has(u.hostname.toLowerCase())) return null;
  const m = u.pathname.match(/^\/@([A-Za-z0-9._]{2,24})\/(?:video|photo)\/(\d{15,25})\/?$/)
    ?? u.pathname.match(/^\/(?:embed(?:\/v2)?|player\/v1)\/(\d{15,25})\/?$/);
  if (!m) return null;
  const [handle, videoId] = m.length === 3 ? [m[1]!, m[2]!] : [null, m[1]!];
  return {
    videoId,
    handle,
    url: handle ? `https://www.tiktok.com/@${handle}/video/${videoId}` : `https://www.tiktok.com/embed/v2/${videoId}`,
  };
}

/** Lecteur officiel TikTok (iframe), sans suggestions d'autres comptes en fin de lecture. */
export function tiktokPlayerUrl(videoId: string): string {
  if (!/^\d{15,25}$/.test(videoId)) throw new Error('INVALID_TIKTOK_ID');
  return `https://www.tiktok.com/player/v1/${videoId}?rel=0&music_info=1&description=1`;
}
