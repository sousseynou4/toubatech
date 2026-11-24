/**
 * Préparation des photos dans le navigateur avant leur envoi au serveur.
 *
 * Pourquoi : une action serveur Next.js refuse tout envoi de plus de 1 Mo par défaut (limite portée à 4 Mo
 * dans next.config.ts), et Vercel coupe toute requête au-delà de 4,5 Mo. Une photo prise au téléphone pèse
 * 2 à 8 Mo : envoyée telle quelle, elle faisait échouer la galerie, les photos de produits et les devis.
 *
 * Chaque photo est donc redimensionnée (bord le plus long ≤ 2048 px) et réencodée en WebP, ou en JPEG si le
 * navigateur ne sait pas produire de WebP. Le réencodage retire aussi les métadonnées EXIF, dont la position
 * GPS enregistrée par le téléphone. Si le navigateur ne sait pas lire l'image, le fichier part tel quel et le
 * serveur applique ses propres contrôles (format, taille).
 *
 * Module neutre (sans « use client ») : les fonctions de calcul sont testées côté Node, les fonctions
 * d'image n'utilisent les API du navigateur qu'au moment de l'appel.
 */

/** Octets d'images envoyés au plus par requête : marge sous la limite serveur (4 Mo) et Vercel (4,5 Mo). */
export const REQUEST_IMAGE_BUDGET = 3_500_000;
/** Plafond par image, même seule : une photo web n'a pas besoin de plus. */
export const MAX_IMAGE_BYTES = 1_500_000;
export const MAX_EDGE = 2048;

/** Taille cible d'une image quand `count` images partent dans la même requête. */
export function perImageBudget(count: number, budget = REQUEST_IMAGE_BUDGET): number {
  return Math.min(MAX_IMAGE_BYTES, Math.floor(budget / Math.max(1, count)));
}

/** Regroupe des fichiers en lots dont le poids total ne dépasse pas `budget` (un fichier trop lourd forme son propre lot). */
export function batchBySize<T extends { size: number }>(items: T[], budget = REQUEST_IMAGE_BUDGET): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let total = 0;
  for (const item of items) {
    if (current.length && total + item.size > budget) {
      batches.push(current);
      current = [];
      total = 0;
    }
    current.push(item);
    total += item.size;
  }
  if (current.length) batches.push(current);
  return batches;
}

/** Dimensions après réduction, en gardant les proportions. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const ATTEMPTS: { edge: number; quality: number }[] = [
  { edge: MAX_EDGE, quality: 0.85 },
  { edge: MAX_EDGE, quality: 0.75 },
  { edge: 1600, quality: 0.75 },
  { edge: 1280, quality: 0.7 },
  { edge: 1024, quality: 0.65 },
];

async function encode(bitmap: ImageBitmap, edge: number, type: string, quality: number): Promise<Blob | null> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, edge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#fff'; // le JPEG n'a pas de transparence
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamed(name: string, type: string): string {
  const ext = type === 'image/webp' ? 'webp' : 'jpg';
  return `${name.replace(/\.[^./\\]+$/, '') || 'photo'}.${ext}`;
}

/** Réduit une photo sous `maxBytes`. Renvoie le fichier d'origine si le navigateur ne sait pas la traiter. */
export async function shrinkImage(file: File, maxBytes: number): Promise<File> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function' || !file.type.startsWith('image/')) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    // Petite image déjà légère, hors JPEG (pas d'EXIF à retirer, transparence d'un PNG à garder) : on n'y touche pas.
    if (file.type !== 'image/jpeg' && file.size <= Math.min(maxBytes, 400_000) && Math.max(bitmap.width, bitmap.height) <= MAX_EDGE) return file;
    let type = 'image/webp';
    for (const { edge, quality } of ATTEMPTS) {
      let blob = await encode(bitmap, edge, type, quality);
      if (blob && blob.type !== type) {
        // Navigateur sans encodeur WebP (anciens Safari) : on passe au JPEG.
        type = 'image/jpeg';
        blob = await encode(bitmap, edge, type, quality);
      }
      if (blob && blob.size <= maxBytes) return new File([blob], renamed(file.name, type), { type, lastModified: Date.now() });
    }
    return file;
  } finally {
    bitmap.close();
  }
}

/** Copie d'un FormData où les fichiers du champ `field` sont réduits pour tenir à `count` dans une même requête. */
export async function shrinkFormImages(form: FormData, field: string): Promise<FormData> {
  const files = form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return form;
  const budget = perImageBudget(files.length);
  const shrunk = await Promise.all(files.map((f) => shrinkImage(f, budget)));
  const out = new FormData();
  for (const [key, value] of form.entries()) if (key !== field) out.append(key, value);
  for (const f of shrunk) out.append(field, f);
  return out;
}

/** Message affiché quand l'envoi n'a pas pu aboutir (requête refusée ou connexion coupée). */
export const UPLOAD_FAILED = 'L\'envoi n\'a pas abouti (photo trop lourde ou connexion coupée). Réessayez, avec moins de photos à la fois si besoin.';
