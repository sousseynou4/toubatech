/**
 * Catégories et emplacements des médias, statuts de devis. Module neutre (ni client ni serveur) :
 * une constante exportée depuis un fichier « use client » n'est pas lisible
 * côté serveur (elle y devient une référence client), d'où ce fichier.
 */
export const MEDIA_CATEGORIES = [
  ['makeup', 'Makeup'], ['onglerie', 'Onglerie'], ['cils-sourcils', 'Cils & sourcils'], ['coiffure-perruques', 'Coiffure & perruques'], ['boutique', 'Boutique'], ['salon', 'Salon'],
] as const;
export const SLOT_LABEL: Record<string, string> = { home_hero: 'Grande photo de l\'accueil', about: 'Photo « Notre univers / À propos »' };

/** Statuts des demandes de devis événementiels. */
export const QUOTE_STATUS_LABEL: Record<string, string> = {
  new: 'Nouvelle', contacted: 'Contactée', quoted: 'Devis envoyé', accepted: 'Accepté', declined: 'Refusé', cancelled: 'Annulé',
};
