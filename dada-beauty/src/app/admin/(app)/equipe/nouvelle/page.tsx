import { requireStaff } from '@/lib/auth';
import { PageHeader, Panel } from '@/components/admin/ui';
import { EmployeeForm } from '@/components/admin/salon/team-forms';

export const metadata = { title: 'Nouvelle employée' };

export default async function NewEmployeePage() {
  await requireStaff('team.manage');
  return (
    <>
      <PageHeader back={{ href: '/admin/equipe', label: 'Équipe' }} title="Nouvelle employée" description="Vous pourrez ensuite définir ses prestations et son planning." />
      <Panel className="max-w-3xl"><EmployeeForm /></Panel>
    </>
  );
}
