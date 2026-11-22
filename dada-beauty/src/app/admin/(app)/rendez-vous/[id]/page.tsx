import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppointmentBadge, PageHeader, Panel } from '@/components/admin/ui';
import { NotesForm, PaymentForm, RescheduleForm, StatusActions, WhatsAppTemplates } from '@/components/admin/appointment-actions';
import { formatDate, formatDateTime, formatDuration, formatTime, formatXOF } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { templates } from '@/lib/notifications/messages';
import { isWhatsAppConfigured } from '@/lib/notifications/whatsapp';
import { env } from '@/lib/env';
import { APPOINTMENT_STATUS_LABEL, PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL, type AppointmentStatus, type PaymentKind, type PaymentMethod } from '@/lib/types';
import { listEmployees } from '@/server/admin/queries';

export const metadata = { title: 'Rendez-vous' };

export default async function AppointmentDetail({ params }: PageProps<'/admin/rendez-vous/[id]'>) {
  const ctx = await requireStaff('dashboard.view');
  const { id } = await params;
  const sb = (await createClient())!;
  const { data: a } = await sb.from('appointments')
    .select('*, customer:customers(id, full_name, phone, email, preferences), employee:employees(id, display_name, color), services:appointment_services(service_name, unit_price, duration_minutes, quantity)')
    .eq('id', id).maybeSingle();
  if (!a) notFound();
  const [{ data: events }, { data: payments }, employees, { data: cashId }] = await Promise.all([
    sb.from('appointment_events').select('id, event_type, from_status, to_status, details, created_at').eq('appointment_id', id).order('created_at'),
    ctx.can('payments.view') ? sb.from('payments').select('id, reference, kind, method, status, amount, provider_reference, paid_at, created_at').eq('appointment_id', id).order('created_at') : Promise.resolve({ data: [] }),
    ctx.can('appointments.manage') ? listEmployees(sb) : Promise.resolve([]),
    sb.rpc('open_cash_session_id'),
  ]);
  const status = a.status as AppointmentStatus;
  const remaining = a.total_amount - a.paid_amount;
  const depositDue = Math.max(0, a.deposit_required - a.paid_amount);
  const name = a.customer.full_name.split(' ')[0];
  const serviceNames = a.services.map((s: { service_name: string }) => s.service_name).join(', ');
  const msg = { name, service: serviceNames, start: a.start_at, reference: a.reference };
  const messages = [
    { key: 'booking_confirmed', label: 'Confirmation du rendez-vous', body: templates.bookingConfirmed(msg) },
    { key: 'booking_reminder', label: 'Rappel avant le rendez-vous', body: templates.bookingReminder(msg) },
    ...(a.deposit_required > 0 ? [{ key: 'deposit_received', label: 'Confirmation d\'acompte', body: templates.depositReceived({ name, amount: Math.min(a.paid_amount, a.deposit_required), reference: a.reference }) }] : []),
    { key: 'booking_rescheduled', label: 'Modification de date', body: templates.bookingRescheduled(msg) },
    { key: 'booking_cancelled', label: 'Annulation', body: templates.bookingCancelled(msg) },
    ...(status === 'completed' ? [{ key: 'review_request', label: 'Demande d\'avis', body: templates.reviewRequest({ name, url: `${env.siteUrl}/avis/${a.review_token}` }) }] : []),
  ];

  return (
    <>
      <PageHeader back={{ href: '/admin/rendez-vous', label: 'Planning' }} title={a.customer.full_name}
        description={<>{a.reference} · {formatDate(a.start_at)} · {formatTime(a.start_at)}–{formatTime(a.end_at)}</>}
        actions={<AppointmentBadge status={status} />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Panel title="Détails">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Cliente</dt><dd className="font-medium">{ctx.can('customers.view') ? <Link href={`/admin/clientes/${a.customer.id}`} className="text-rosewood">{a.customer.full_name}</Link> : a.customer.full_name}</dd><dd><a href={`tel:${a.customer.phone}`}>{formatPhone(a.customer.phone)}</a></dd></div>
              <div><dt className="text-muted">Employée</dt><dd className="flex items-center gap-2 font-medium"><span className="size-2.5 rounded-full" style={{ background: a.employee.color }} />{a.employee.display_name}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted">Prestations</dt>
                <dd><ul className="mt-1 divide-y divide-line/70 rounded-xl border border-line">{a.services.map((s: { service_name: string; unit_price: number; duration_minutes: number; quantity: number }, i: number) => (
                  <li key={i} className="flex justify-between px-3 py-2"><span>{s.service_name} <span className="text-muted">· {formatDuration(s.duration_minutes)}</span></span><span className="tabular-nums">{formatXOF(s.unit_price * s.quantity)}</span></li>
                ))}</ul></dd></div>
              <div><dt className="text-muted">Montant</dt><dd className="font-semibold">{formatXOF(a.total_amount)}</dd></div>
              <div><dt className="text-muted">Encaissé</dt><dd className="font-semibold">{formatXOF(a.paid_amount)} {a.deposit_required > 0 && <span className="font-normal text-muted">(acompte demandé : {formatXOF(a.deposit_required)})</span>}</dd></div>
              <div><dt className="text-muted">Origine</dt><dd>{({ online: 'Site internet', admin: 'Équipe', whatsapp: 'WhatsApp', phone: 'Téléphone', walk_in: 'Sur place' } as Record<string, string>)[a.source]}</dd></div>
              {a.preferred_payment_method && <div><dt className="text-muted">Paiement souhaité</dt><dd>{PAYMENT_METHOD_LABEL[a.preferred_payment_method as PaymentMethod]}</dd></div>}
              {a.customer_notes && <div className="sm:col-span-2"><dt className="text-muted">Message de la cliente</dt><dd className="whitespace-pre-line rounded-xl bg-powder-50 p-3">{a.customer_notes}</dd></div>}
              {a.customer.preferences && <div className="sm:col-span-2"><dt className="text-muted">Préférences</dt><dd className="whitespace-pre-line">{a.customer.preferences}</dd></div>}
              {a.cancel_reason && <div className="sm:col-span-2"><dt className="text-muted">Motif</dt><dd>{a.cancel_reason}</dd></div>}
            </dl>
          </Panel>
          {ctx.can('payments.view') && (
            <Panel title="Paiements" padded={false}>
              {(payments ?? []).length === 0 ? <p className="p-5 text-sm text-muted">Aucun paiement enregistré.</p> : (
                <ul className="divide-y divide-line/70 text-sm">{(payments as { id: string; reference: string; kind: PaymentKind; method: PaymentMethod; status: string; amount: number; provider_reference: string | null; paid_at: string | null; created_at: string }[]).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <span>{PAYMENT_KIND_LABEL[p.kind]} · {PAYMENT_METHOD_LABEL[p.method]}{p.provider_reference && <span className="text-muted"> · {p.provider_reference}</span>}<span className="block text-xs text-muted">{p.reference} · {formatDateTime(p.paid_at ?? p.created_at)} · {p.status === 'succeeded' ? 'réussi' : p.status}</span></span>
                    <span className={`font-semibold tabular-nums ${p.kind === 'refund' ? 'text-danger' : ''}`}>{p.kind === 'refund' ? '−' : ''}{formatXOF(p.amount)}</span>
                  </li>
                ))}</ul>
              )}
            </Panel>
          )}
          <Panel title="Historique">
            <ol className="grid gap-3 border-l border-powder-200 pl-4 text-sm">
              {(events ?? []).map((e: { id: number; event_type: string; from_status: AppointmentStatus | null; to_status: AppointmentStatus | null; details: Record<string, unknown>; created_at: string }) => (
                <li key={e.id}>
                  <span className="font-medium">{e.event_type === 'created' ? 'Création' : e.event_type === 'rescheduled' ? `Report au ${formatDateTime(String(e.details.to_start))}` : e.event_type === 'payment' ? `Paiement ${formatXOF(Number(e.details.amount))}` : `${e.from_status ? APPOINTMENT_STATUS_LABEL[e.from_status] : ''} → ${e.to_status ? APPOINTMENT_STATUS_LABEL[e.to_status] : ''}`}</span>
                  <span className="text-muted"> — {formatDateTime(e.created_at)}</span>
                  {typeof e.details.reason === 'string' && e.details.reason && <span className="block text-xs text-muted">Motif : {e.details.reason}</span>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="grid h-fit gap-6">
          <Panel title="Actions"><StatusActions id={a.id} status={status} canManage={ctx.can('appointments.manage')} canOwn={ctx.can('appointments.update_own')} /></Panel>
          {ctx.can('payments.manage') && !['cancelled', 'no_show'].includes(status) && (
            <Panel title="Encaisser"><PaymentForm appointmentId={a.id} remaining={remaining} depositDue={depositDue} cashOpen={Boolean(cashId)} /></Panel>
          )}
          <Panel title="Messages WhatsApp"><WhatsAppTemplates phone={a.customer.phone} messages={messages} appointmentId={a.id} customerId={a.customer.id} apiConfigured={isWhatsAppConfigured()} /></Panel>
          {ctx.can('appointments.manage') && ['pending', 'confirmed', 'deposit_paid'].includes(status) && (
            <Panel title="Reporter"><RescheduleForm id={a.id} employees={employees} defaultDate={a.start_at.slice(0, 10)} defaultTime={formatTime(a.start_at)} /></Panel>
          )}
          <Panel title="Notes internes"><NotesForm id={a.id} notes={a.internal_notes ?? ''} /></Panel>
        </div>
      </div>
    </>
  );
}
