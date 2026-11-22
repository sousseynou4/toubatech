import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ConfigBadge, PageHeader, Panel } from '@/components/admin/ui';
import { ServiceForm, type ServiceValues } from '@/components/admin/salon/catalog-forms';

export const metadata = { title: 'Prestation' };

export default async function ServiceAdminPage({ params }: PageProps<'/admin/prestations/[id]'>) {
  const ctx = await requireStaff('services.manage');
  const { id } = await params;
  const sb = (await createClient())!;
  const [{ data: s }, { data: cats }, { data: emps }, { data: links }] = await Promise.all([
    sb.from('services').select('*, image:media_assets!services_image_id_fkey(public_url, alt)').eq('id', id).maybeSingle(),
    sb.from('service_categories').select('id, name').order('sort_order'),
    sb.from('employees').select('id, display_name').eq('is_active', true).order('sort_order'),
    sb.from('employee_services').select('employee_id').eq('service_id', id),
  ]);
  if (!s) notFound();
  const service = s as unknown as ServiceValues & { id: string; slug: string };
  return (
    <>
      <PageHeader back={{ href: '/admin/prestations', label: 'Prestations' }} title={service.name}
        description={<Link href={`/prestations/${service.slug}`} className="text-rosewood" target="_blank">Voir sur le site →</Link>}
        actions={<ConfigBadge status={service.status} />} />
      <Panel className="max-w-4xl">
        <ServiceForm service={service} categories={cats ?? []} employees={emps ?? []} authorized={(links ?? []).map((l) => l.employee_id)} canTeam={ctx.can('team.manage')} />
      </Panel>
    </>
  );
}
