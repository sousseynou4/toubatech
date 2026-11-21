/**
 * Informations de marque de référence. Les valeurs administrables vivent dans
 * la table business_settings ; celles-ci servent de repli si la base est
 * indisponible et pour le référencement statique.
 */
export const BRAND = {
  name: 'Dada Beauty',
  tagline: 'Institut de beauté à Guédiawaye',
  phone: '+221778088893',
  phoneDisplay: '+221 77 808 88 93',
  whatsapp: '+221778088893',
  addressLine: 'Secteur Deux Boulangeries',
  city: 'Guédiawaye, Dakar',
  country: 'Sénégal',
  timezone: 'Africa/Dakar',
  currency: 'XOF',
} as const;

export const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/prestations', label: 'Nos prestations' },
  { href: '/galerie', label: 'Galerie' },
  { href: '/boutique', label: 'Boutique' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
] as const;

/** Teintes des visuels provisoires par univers (remplacées par les photos de l'admin). */
export const CATEGORY_ART: Record<string, { a: string; b: string; label: string }> = {
  makeup: { a: '#f1d6de', b: '#e7d5b5', label: 'Makeup' },
  onglerie: { a: '#f8e9ed', b: '#dfaab9', label: 'Onglerie' },
  'cils-sourcils': { a: '#e8d6cb', b: '#f1d6de', label: 'Cils & sourcils' },
  'coiffure-perruques': { a: '#e7d5b5', b: '#ebc4cf', label: 'Coiffure & perruques' },
  boutique: { a: '#f6eee8', b: '#e7d5b5', label: 'Boutique' },
  salon: { a: '#fcf5f7', b: '#e8d6cb', label: 'Le salon' },
};
