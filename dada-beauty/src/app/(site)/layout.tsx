import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { WhatsAppFab } from '@/components/site/whatsapp-fab';
import { getBusinessHours, getSettings } from '@/server/catalog';
import { env } from '@/lib/env';
import { WEEKDAYS_EN } from '@/lib/seo';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ settings }, hours] = await Promise.all([getSettings(), getBusinessHours()]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: settings.business_name,
    url: env.siteUrl,
    telephone: settings.phone,
    image: settings.logo_url ?? `${env.siteUrl}/icon.svg`,
    priceRange: 'FCFA',
    currenciesAccepted: 'XOF',
    address: { '@type': 'PostalAddress', streetAddress: settings.address_line, addressLocality: 'Guédiawaye', addressRegion: 'Dakar', addressCountry: 'SN' },
    areaServed: ['Guédiawaye', 'Pikine', 'Dakar'],
    sameAs: [settings.instagram_url, settings.facebook_url, settings.tiktok_url].filter(Boolean),
    openingHoursSpecification: hours.filter((h) => !h.is_closed).map((h) => ({
      '@type': 'OpeningHoursSpecification', dayOfWeek: WEEKDAYS_EN[h.weekday - 1], opens: h.open_time?.slice(0, 5), closes: h.close_time?.slice(0, 5),
    })),
  };
  return (
    <div className="flex min-h-dvh flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">Aller au contenu</a>
      {env.demoMode && (
        <div className="bg-gold/90 px-4 py-1.5 text-center text-xs font-medium text-ink">Environnement de démonstration — les données affichées sont fictives.</div>
      )}
      <Header whatsapp={settings.whatsapp_phone} />
      <main id="contenu" className="flex-1">{children}</main>
      <Footer settings={settings} hours={hours} />
      <WhatsAppFab phone={settings.whatsapp_phone} />
    </div>
  );
}
