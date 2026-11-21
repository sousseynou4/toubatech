import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import { MEDIA_CATEGORIES, MediaCard, UploadForm, type MediaValues } from '@/components/admin/salon/content-forms';
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
  const [{ data }, { data: cats }] = await Promise.all([q, sb.from('service_categories').select('id, name').order('sort_order')]);
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
    </>
  );
}
