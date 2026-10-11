import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TOUBA TECH — Réparation & Reconditionné à Lorient, Morbihan',
    template: '%s · TOUBA TECH',
  },
  description:
    'TOUBA TECH (Toubatech), atelier de réparation de smartphones et tablettes à Lorient : écran, batterie, micro-soudure. Diagnostic gratuit en ligne, garantie 12 mois.',
  keywords: [
    'Toubatech',
    'réparation smartphone Lorient',
    'réparation écran téléphone Lorient',
    'iPhone reconditionné Morbihan',
    'micro-soudure Lorient',
    'pièces détachées smartphone',
    'tablette reconditionnée',
  ],
  applicationName: 'TOUBA TECH',
  authors: [{ name: 'TOUBA TECH' }],
  creator: 'TOUBA TECH',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: 'TOUBA TECH',
    title: 'TOUBA TECH — Réparation & Reconditionné à Lorient',
    description:
      "Réparation experte, économie circulaire, impact local à Lorient et Morbihan.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TOUBA TECH',
    description: 'Réparation experte & reconditionné à Lorient.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bone font-sans text-ink-700 antialiased">
        {children}
      </body>
    </html>
  );
}
