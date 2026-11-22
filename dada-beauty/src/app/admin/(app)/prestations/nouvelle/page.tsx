import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { ServiceForm } from '@/components/admin/salon/catalog-forms';

export const metadata = { title: 'Nouvelle prestation' };

export default async function NewServicePage() {
  const ctx = await requireStaff('services.manage');
  const sb = (await createClient())!;
  const [{ data: cats }, { data: emps }] = await Promise.all([
    sb.from('service_categories').select('id, name').order('sort_order'),
    sb.from('employees').select('id, display_name').eq('is_active', true).order('sort_order'),
  ]);
  return (
    <>
      <PageHeader back={{ href: '/admin/prestations', label: 'Prestations' }} title="Nouvelle prestation" />
      <Panel className="max-w-4xl"><ServiceForm categories={cats ?? []} employees={emps ?? []} authorized={[]} canTeam={ctx.can('team.manage')} /></Panel>
    </>
  );
}
