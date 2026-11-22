import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import { env } from '@/lib/env';
import { BRAND } from '@/lib/site';
import './globals.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: 'Dada Beauty — Institut de beauté à Guédiawaye, Dakar', template: '%s · Dada Beauty' },
  description:
    'Dada Beauty, institut de beauté à Guédiawaye (Deux Boulangeries, Dakar) : maquillage soft glam et full glam, onglerie, extensions de cils, pose lace frontal, perruques et produits de beauté. Réservation en ligne.',
  keywords: ['Dada Beauty', 'institut de beauté Guédiawaye', 'maquillage Dakar', 'onglerie Guédiawaye', 'coiffure Dakar', 'pose lace frontal Dakar', 'extensions de cils Dakar', 'perruques Dakar'],
  applicationName: BRAND.name,
  openGraph: { type: 'website', locale: 'fr_SN', siteName: BRAND.name, url: env.siteUrl },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: '#ebc4cf',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
