import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppointmentBadge, EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import { DeleteTimeOffButton, EmployeeForm, EmployeeServicesForm, ScheduleEditor, TimeOffForm } from '@/components/admin/salon/team-forms';
import { formatDateTime } from '@/lib/format';
import type { AppointmentStatus } from '@/lib/types';

export const metadata = { title: 'Employée' };

/** Parse un tstzrange PostgreSQL : ["2026-11-24 09:00:00+00","2026-11-24 12:00:00+00") */
function parseRange(r: string): [string, string] {
  const m = r.match(/^[[(]"?([^",]+)"?,"?([^",]+)"?[\])]$/);
  if (!m) return [r, r];
  const fix = (s: string) => new Date(s.replace(' ', 'T').replace(/\+00$/, 'Z')).toISOString();
  return [fix(m[1]!), fix(m[2]!)];
}

const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

export default async function EmployeePage({ params }: PageProps<'/admin/equipe/[id]'>) {
  await requireStaff('team.manage');
  const { id } = await params;
  const sb = (await createClient())!;
  const { data: e } = await sb.from('employees').select('*').eq('id', id).maybeSingle();
  if (!e) notFound();
  const [services, links, schedules, timeOff, appts] = await Promise.all([
    sb.from('services').select('id, name, status, category:service_categories(name, sort_order)').neq('status', 'inactive').order('sort_order'),
    sb.from('employee_services').select('service_id').eq('employee_id', id),
    sb.from('employee_schedules').select('weekday, start_time, end_time').eq('employee_id', id).order('weekday').order('start_time'),
    sb.from('employee_time_off').select('id, period, reason').eq('employee_id', id).order('created_at', { ascending: false }).limit(30),
    sb.from('appointments').select('id, reference, start_at, status, customer:customers(full_name), services:appointment_services(service_name)').eq('employee_id', id).gte('start_at', new Date().toISOString()).neq('status', 'cancelled').order('start_at').limit(15),
  ]);
  const svc = ((services.data ?? []) as unknown as { id: string; name: string; category: { name: string } | null }[]).map((s) => ({ id: s.id, name: s.name, category: s.category?.name ?? '' }));
  const offs = ((timeOff.data ?? []) as { id: string; period: string; reason: string | null }[]).map((t) => ({ ...t, range: parseRange(t.period) }));

  return (
    <>
      <PageHeader back={{ href: '/admin/equipe', label: 'Équipe' }} title={e.display_name} description={e.full_name ?? undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid h-fit gap-6">
          <Panel title="Profil"><EmployeeForm employee={e} /></Panel>
          <Panel title="Prestations autorisées">
            {svc.length === 0 ? <EmptyState title="Aucune prestation" /> : <EmployeeServicesForm id={e.id} services={svc} selected={(links.data ?? []).map((l) => l.service_id)} />}
          </Panel>
        </div>
        <div className="grid h-fit gap-6">
          <Panel title="Planning hebdomadaire">
            <ScheduleEditor id={e.id} initial={(schedules.data ?? []).map((s) => ({ weekday: s.weekday, start: String(s.start_time).slice(0, 5), end: String(s.end_time).slice(0, 5) }))} />
          </Panel>
          <Panel title="Congés & absences">
            <TimeOffForm id={e.id} />
            {offs.length > 0 && (
              <ul className="mt-4 divide-y divide-line/70 text-sm">
                {offs.map((t) => (
                  <li key={t.id} className={`flex items-center justify-between gap-3 py-2 ${isPast(t.range[1]) ? 'opacity-50' : ''}`}>
                    <span>{formatDateTime(t.range[0])} → {formatDateTime(t.range[1])}{t.reason && <span className="block text-xs text-muted">{t.reason}</span>}</span>
                    <DeleteTimeOffButton id={t.id} employeeId={e.id} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Prochains rendez-vous" padded={false}>
            {(appts.data ?? []).length === 0 ? <p className="p-5 text-sm text-muted">Aucun rendez-vous à venir.</p> : (
              <ul className="divide-y divide-line/70 text-sm">
                {(appts.data as unknown as { id: string; reference: string; start_at: string; status: AppointmentStatus; customer: { full_name: string } | null; services: { service_name: string }[] }[]).map((a) => (
                  <li key={a.id}><Link href={`/admin/rendez-vous/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-powder-50/50">
                    <span>{formatDateTime(a.start_at)} · {a.customer?.full_name}<span className="block text-xs text-muted">{a.services.map((s) => s.service_name).join(', ')}</span></span>
                    <AppointmentBadge status={a.status} />
                  </Link></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
