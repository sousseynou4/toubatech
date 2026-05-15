import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://toubatech.com'),
  title: {
    default: 'TOUBA TECH — Réparation & Reconditionné à Lorient, Morbihan',
    template: '%s · TOUBA TECH',
  },
  description:
    "TOUBA TECH : réparation experte de smartphones, tablettes et électronique grand public à Lorient et dans tout le Morbihan. Boutique de reconditionné, pièces détachées, micro-soudure. Économie circulaire et label QualiRépar.",
  keywords: [
    'réparation smartphone Lorient',
    'iPhone reconditionné Morbihan',
    'micro-soudure Lorient',
    'pièces détachées smartphone',
    'économie circulaire',
    'QualiRépar',
    'tablette reconditionnée',
  ],
  authors: [{ name: 'TOUBA TECH' }],
  creator: 'TOUBA TECH',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://toubatech.com',
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
