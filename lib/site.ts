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

/** Informations légales (mentions légales, CGV, politique de confidentialité). */
export interface Mediator {
  name: string;
  address: string;
  website: string;
}

export const LEGAL: {
  owner: string;
  ownerWithStatus: string;
  status: string;
  siren: string;
  siret: string;
  registry: string;
  vat: string;
  host: { name: string; address: string; website: string };
  /** Médiateur de la consommation (obligatoire pour la vente aux particuliers, art. L.612-1 C. conso).
   *  À renseigner dès l'adhésion : { name, address, website }. */
  mediator: Mediator | null;
  lastUpdated: string;
} = {
  owner: 'Ousseynou SAMB',
  // Un entrepreneur individuel doit faire suivre son nom de la mention « EI » (art. R.123-237 C. com.).
  ownerWithStatus: 'Ousseynou SAMB EI',
  status: 'Entrepreneur individuel (EI), régime de la micro-entreprise',
  siren: '995 125 507',
  siret: '995 125 507 00013',
  registry: 'Registre national des entreprises (RNE)',
  vat: 'TVA non applicable, article 293 B du Code général des impôts',
  host: { name: 'Vercel Inc.', address: '340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis', website: 'https://vercel.com' },
  mediator: null,
  lastUpdated: '18 octobre 2026',
};

export const FULL_ADDRESS = `${BUSINESS.address.streetAddress}, ${BUSINESS.address.postalCode} ${BUSINESS.address.addressLocality}`;

export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
