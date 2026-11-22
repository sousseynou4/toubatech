import Image from 'next/image';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { CategoryForm, MoveButtons } from '@/components/admin/salon/catalog-forms';

export const metadata = { title: 'Catégories de prestations' };

export default async function CategoriesPage() {
  await requireStaff('services.manage');
  const sb = (await createClient())!;
  const { data } = await sb.from('service_categories').select('id, name, slug, tagline, description, sort_order, is_active, image:media_assets!service_categories_image_id_fkey(public_url, alt)').order('sort_order').order('name');
  type Cat = { id: string; name: string; slug: string; tagline: string | null; description: string | null; sort_order: number; is_active: boolean; image: { public_url: string | null; alt: string } | null };
  return (
    <>
      <PageHeader back={{ href: '/admin/prestations', label: 'Prestations' }} title="Catégories" description="L'ordre et l'image s'appliquent au site public." />
      <div className="grid gap-4">
        {((data ?? []) as unknown as Cat[]).map((c) => (
          <Panel key={c.id} title={<span className="flex items-center gap-3">{c.image?.public_url && <Image src={c.image.public_url} alt={c.image.alt} width={40} height={40} className="size-10 rounded-lg object-cover" />}{c.name}</span>} action={<MoveButtons id={c.id} />}>
            <CategoryForm category={c} />
          </Panel>
        ))}
        <Panel title="Nouvelle catégorie"><CategoryForm /></Panel>
      </div>
    </>
  );
}
