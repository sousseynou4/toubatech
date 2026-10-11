/**
 * Identité du site et de l'entreprise : source unique pour les URL canoniques,
 * le sitemap, robots.txt et les données structurées (JSON-LD).
 * Ne jamais écrire le domaine en dur ailleurs.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://toubatech.eu').replace(/\/$/, '');

export const BUSINESS = {
  name: 'TOUBA TECH',
  // Variantes tapées dans Google (en un mot, sans majuscules…)
  alternateNames: ['Toubatech', 'Touba Tech'],
  description:
    'Atelier de réparation de smartphones, tablettes et PC portables à Lorient : écran, batterie, connecteur de charge, désoxydation, micro-soudure. Reconditionné garanti 12 mois.',
  telephone: '+33782935666',
  telephoneDisplay: '07 82 93 56 66',
  email: 'contact@toubatech.eu',
  address: {
    streetAddress: '25 avenue du Général de Gaulle',
    postalCode: '56100',
    addressLocality: 'Lorient',
    addressRegion: 'Bretagne',
    addressCountry: 'FR',
  },
  areaServed: ['Lorient', 'Lanester', 'Ploemeur', 'Larmor-Plage', 'Quéven', 'Hennebont', 'Morbihan'],
  // Fiche Google Business Profile
  sameAs: ['https://g.page/r/CdNcgAeW1Rn7EBM'],
} as const;

export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
