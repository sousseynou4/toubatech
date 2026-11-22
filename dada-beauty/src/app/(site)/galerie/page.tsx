import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtImage } from '@/components/ui/art-image';
import { Section, SectionHeading } from '@/components/ui/section';
import { Alert } from '@/components/ui/field';
import { getGallery, getSettings, getSocialVideos } from '@/server/catalog';
import { TikTokEmbed } from '@/components/site/tiktok-embed';
import { cn } from '@/lib/cn';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Galerie — nos réalisations beauté',
  description: 'Maquillages soft glam et full glam, onglerie, extensions de cils et installations lace frontal réalisés chez Dada Beauty à Guédiawaye.',
  alternates: { canonical: '/galerie' },
};

const FILTERS = [
  { value: '', label: 'Tout' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'onglerie', label: 'Onglerie' },
  { value: 'cils-sourcils', label: 'Cils' },
  { value: 'coiffure-perruques', label: 'Coiffure & perruques' },
];

export default async function GalleryPage({ searchParams }: PageProps<'/galerie'>) {
  const { categorie } = await searchParams;
  const cat = typeof categorie === 'string' && FILTERS.some((f) => f.value === categorie) ? categorie : '';
  const [items, videos, { settings }] = await Promise.all([getGallery(cat || undefined, 120), getSocialVideos(cat || undefined, 24), getSettings()]);
  return (
    <Section>
      <SectionHeading as="h1" eyebrow="Galerie" title={<>Nos <em className="text-rosewood">réalisations</em></>} intro="Les photos de clientes sont publiées uniquement avec leur accord explicite." />
      <nav aria-label="Filtrer la galerie" className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <Link key={f.value} href={f.value ? `/galerie?categorie=${f.value}` : '/galerie'} aria-current={cat === f.value ? 'page' : undefined}
            className={cn('shrink-0 rounded-full px-4 py-2 text-sm', cat === f.value ? 'bg-ink text-ivory' : 'border border-line bg-white text-ink-soft hover:text-ink')}>
            {f.label}
          </Link>
        ))}
      </nav>
      {items.length === 0 && videos.length === 0 ? (
        <Alert className="mt-10">La galerie sera bientôt alimentée avec les réalisations du salon. Suivez-nous sur nos réseaux en attendant !</Alert>
      ) : items.length > 0 && (
        <div className="mt-10 columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          {items.map((m, i) => (
            <figure key={m.id} className="break-inside-avoid">
              <ArtImage src={m.public_url} alt={m.alt} className={cn('rounded-2xl', i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square')} sizes="(max-width: 640px) 50vw, 25vw" />
              {m.caption && <figcaption className="mt-1.5 px-1 text-xs text-muted">{m.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {videos.length > 0 && (
        <section aria-labelledby="videos-title" className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="videos-title" className="font-display text-3xl">En <em className="text-rosewood">vidéo</em></h2>
            {settings.tiktok_url && (
              <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-rosewood hover:underline">Suivre sur TikTok →</a>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">Les vidéos sont lues avec le lecteur TikTok, uniquement quand vous les lancez.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {videos.map((v) => <TikTokEmbed key={v.id} videoId={v.video_id} title={v.title} url={v.url} />)}
          </div>
        </section>
      )}
    </Section>
  );
}
