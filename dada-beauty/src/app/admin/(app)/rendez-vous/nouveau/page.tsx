import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { NewAppointmentForm } from '@/components/admin/new-appointment-form';
import { listEmployees, listServicesLite } from '@/server/admin/queries';

export const metadata = { title: 'Nouveau rendez-vous' };

export default async function NewAppointmentPage() {
  await requireStaff('appointments.manage');
  const sb = (await createClient())!;
  const [services, employees] = await Promise.all([listServicesLite(sb), listEmployees(sb)]);
  return (
    <>
      <PageHeader back={{ href: '/admin/rendez-vous', label: 'Planning' }} title="Nouveau rendez-vous" description="Réservation prise par téléphone, WhatsApp ou au salon. Les chevauchements sont refusés par la base." />
      <Panel className="max-w-3xl"><NewAppointmentForm services={services} employees={employees.filter((e) => e.is_active)} /></Panel>
    </>
  );
}
