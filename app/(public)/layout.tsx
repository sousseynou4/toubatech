import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BUSINESS, SITE_URL } from '@/lib/site';

// Données structurées : le nom du site (avec ses variantes) et la fiche « entreprise locale »
// aident Google à relier la recherche « toubatech » à ce site et à la fiche Google.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: BUSINESS.name,
      alternateName: BUSINESS.alternateNames,
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'LocalBusiness',
      '@id': `${SITE_URL}/#business`,
      name: BUSINESS.name,
      alternateName: BUSINESS.alternateNames,
      description: BUSINESS.description,
      url: `${SITE_URL}/`,
      telephone: BUSINESS.telephone,
      email: BUSINESS.email,
      address: { '@type': 'PostalAddress', ...BUSINESS.address },
      areaServed: BUSINESS.areaServed,
      priceRange: '€€',
      sameAs: BUSINESS.sameAs,
    },
  ],
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Skip to content — accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-bone"
      >
        Aller au contenu principal
      </a>

      <Header />
      <main id="main">{children}</main>
      <Footer />

      {/* JSON-LD : site + entreprise locale */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
