import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dada Beauty',
    short_name: 'Dada Beauty',
    description: 'Institut de beauté à Guédiawaye — réservation et boutique',
    start_url: '/',
    display: 'standalone',
    background_color: '#fffdf9',
    theme_color: '#ebc4cf',
    lang: 'fr',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
