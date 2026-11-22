import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import { MediaCard, UploadForm, type MediaValues } from '@/components/admin/salon/content-forms';
import { MEDIA_CATEGORIES } from '@/lib/media';
import { AddVideoForm, VideoRow, type VideoValues } from '@/components/admin/salon/video-forms';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Galerie & médias' };

export default async function GalleryAdminPage({ searchParams }: PageProps<'/admin/galerie'>) {
  await requireStaff('gallery.manage');
  const { categorie } = await searchParams;
  const cat = typeof categorie === 'string' ? categorie : '';
  const sb = (await createClient())!;
  let q = sb.from('media_assets').select('id, public_url, alt, caption, category, slot, is_gallery, is_published, is_placeholder, sort_order, customer_consent_id, customer:customers(full_name, photo_consent)')
    .eq('bucket', 'media').order('created_at', { ascending: false }).limit(200);
  if (cat === 'emplacements') q = q.not('slot', 'is', null);
  else if (cat) q = q.eq('category', cat);
  const [{ data }, { data: cats }, { data: vids }] = await Promise.all([
    q, sb.from('service_categories').select('id, name').order('sort_order'),
    sb.from('social_videos').select('id, video_id, url, author_handle, title, category, sort_order, is_published').order('sort_order').order('created_at', { ascending: false }).limit(100),
  ]);
  const videos = (vids ?? []) as VideoValues[];
  const media = (data ?? []) as unknown as MediaValues[];
  const tabs: [string, string][] = [['', 'Tout'], ['emplacements', 'Emplacements du site'], ...MEDIA_CATEGORIES.map(([v, l]): [string, string] => [v, l])];

  return (
    <>
      <PageHeader title="Galerie & médias" description="Photos du site, réalisations et emplacements éditoriaux. Les visuels « Photo à venir » du site sont remplacés dès qu'une photo est assignée." />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Panel title="Ajouter des photos" className="h-fit"><UploadForm categories={cats ?? []} /></Panel>
        <div>
          <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Filtrer">
            {tabs.map(([v, l]) => <Link key={v} href={v ? `/admin/galerie?categorie=${v}` : '/admin/galerie'} className={cn('rounded-full px-3 py-1.5', cat === v ? 'bg-ink text-ivory' : 'border border-line bg-white')}>{l}</Link>)}
          </nav>
          {media.length === 0 ? <EmptyState title="Aucune photo">Ajoutez vos premières réalisations : elles apparaîtront sur la galerie publique.</EmptyState> : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
              {media.map((m) => <MediaCard key={m.id} m={m} categories={cats ?? []} />)}
            </div>
          )}
        </div>
      </div>
      <section aria-labelledby="videos-admin" className="mt-10">
        <h2 id="videos-admin" className="font-display text-2xl">Vidéos TikTok</h2>
        <p className="mt-1 text-sm text-muted">Affichées dans la galerie du site avec le lecteur officiel TikTok (rien n&apos;est copié ni hébergé).</p>
        <div className="mt-4 grid gap-6 xl:grid-cols-[22rem_1fr]">
          <Panel title="Ajouter une vidéo" className="h-fit"><AddVideoForm /></Panel>
          {videos.length === 0 ? <EmptyState title="Aucune vidéo">Collez le lien d&apos;une vidéo TikTok du salon pour l&apos;afficher dans la galerie.</EmptyState> : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{videos.map((v) => <VideoRow key={v.id} v={v} />)}</div>
          )}
        </div>
      </section>
    </>
  );
}
