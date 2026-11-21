import { requireStaff } from '@/lib/auth';
import { PageHeader, Panel } from '@/components/admin/ui';
import { CustomerForm } from '@/components/admin/salon/customer-forms';

export const metadata = { title: 'Nouvelle cliente' };

export default async function NewCustomerPage() {
  await requireStaff('customers.manage');
  return (
    <>
      <PageHeader back={{ href: '/admin/clientes', label: 'Clientes' }} title="Nouvelle cliente" />
      <Panel className="max-w-3xl"><CustomerForm /></Panel>
    </>
  );
}
