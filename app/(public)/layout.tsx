import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

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

      {/* JSON-LD: LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'TOUBA TECH',
            description:
              "Réparation et reconditionnement d'appareils électroniques à Lorient et dans le Morbihan.",
            areaServed: ['Lorient', 'Morbihan', 'Bretagne'],
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Lorient',
              postalCode: '56100',
              addressCountry: 'FR',
            },
            priceRange: '€€',
            telephone: '+33-XXX-XXX-XXX',
          }),
        }}
      />
    </>
  );
}
