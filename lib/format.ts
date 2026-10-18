/**
 * Formatage partagé, utilisable côté serveur ET côté navigateur.
 * (Ne pas le placer dans un fichier 'use client' : un composant serveur
 * ne peut pas appeler une fonction exportée par un module client.)
 */

/** Format cents as French euros (e.g. 47900 → "479 €") */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
