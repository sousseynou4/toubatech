import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Phone } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppointmentBadge, EmptyState, OrderBadge, PageHeader, Panel } from '@/components/admin/ui';
import { CustomerForm, DeleteCustomerButton, LoyaltyAdjustForm } from '@/components/admin/salon/customer-forms';
import { buttonClass } from '@/components/ui/button';
import { formatDateTime, formatShortDate, formatXOF } from '@/lib/format';
import { formatPhone, telLink, whatsappLink } from '@/lib/phone';
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL, type AppointmentStatus, type OrderStatus, type PaymentKind, type PaymentMethod } from '@/lib/types';

export const metadata = { title: 'Fiche cliente' };

const LOYALTY_REASON: Record<string, string> = {
  appointment_completed: 'Prestation terminée', order_completed: 'Achat', reward_redeemed: 'Récompense utilisée', manual_adjustment: 'Ajustement manuel', expired: 'Expiration',
};

export default async function CustomerPage({ params }: PageProps<'/admin/clientes/[id]'>) {
  const ctx = await requireStaff('customers.view');
  const { id } = await params;
  const sb = (await createClient())!;
  const { data: c } = await sb.from('customers').select('*').eq('id', id).maybeSingle();
  if (!c) notFound();
  const [appts, orders, payments, loyalty, ltx] = await Promise.all([
    sb.from('appointments').select('id, reference, start_at, status, total_amount, paid_amount, employee:employees(display_name), services:appointment_services(service_name)').eq('customer_id', id).order('start_at', { ascending: false }).limit(50),
    ctx.can('orders.view') ? sb.from('orders').select('id, reference, channel, status, total_amount, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: null }),
    ctx.can('payments.view') ? sb.from('payments').select('id, reference, kind, method, amount, status, paid_at, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: null }),
    sb.from('loyalty_accounts').select('points_balance, lifetime_points').eq('customer_id', id).maybeSingle(),
    sb.from('loyalty_transactions').select('id, points, reason, note, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
  ]);
  type Appt = { id: string; reference: string; start_at: string; status: AppointmentStatus; total_amount: number; paid_amount: number; employee: { display_name: string } | null; services: { service_name: string }[] };
  const apptRows = (appts.data ?? []) as unknown as Appt[];
  const completed = apptRows.filter((a) => a.status === 'completed');
  const spent = completed.reduce((s, a) => s + a.total_amount, 0) + ((orders.data ?? []) as { status: string; total_amount: number }[]).filter((o) => ['delivered', 'completed'].includes(o.status)).reduce((s, o) => s + o.total_amount, 0);
  const firstName = c.full_name.split(' ')[0];

  return (
    <>
      <PageHeader back={{ href: '/admin/clientes', label: 'Clientes' }} title={c.full_name}
        description={<>{formatPhone(c.phone)} · cliente depuis le {formatShortDate(c.created_at)}</>}
        actions={<>
          <a href={whatsappLink(`Bonjour ${firstName}, `, c.phone)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm')}><MessageCircle className="size-4" /> WhatsApp</a>
          <a href={telLink(c.phone)} className={buttonClass('outline', 'sm')}><Phone className="size-4" /> Appeler</a>
          {ctx.can('appointments.manage') && <Link href="/admin/rendez-vous/nouveau" className={buttonClass('primary', 'sm')}>Nouveau rendez-vous</Link>}
        </>} />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Rendez-vous', apptRows.length], ['Prestations réalisées', completed.length], ['Total dépensé', formatXOF(spent)], ['Points fidélité', loyalty.data?.points_balance ?? 0]].map(([l, v]) => (
          <div key={String(l)} className="rounded-2xl border border-line bg-white p-4 shadow-soft"><p className="text-xs text-muted">{l}</p><p className="mt-1 font-display text-2xl font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Panel title="Historique des rendez-vous" padded={false}>
            {apptRows.length === 0 ? <div className="p-5"><EmptyState title="Aucun rendez-vous" /></div> : (
              <ul className="divide-y divide-line/70">
                {apptRows.map((a) => (
                  <li key={a.id}><Link href={`/admin/rendez-vous/${a.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-powder-50/50">
                    <span className="w-32 tabular-nums text-muted">{formatDateTime(a.start_at)}</span>
                    <span className="min-w-40 flex-1">{a.services.map((s) => s.service_name).join(', ')}<span className="block text-xs text-muted">{a.reference} · {a.employee?.display_name}</span></span>
                    <span className="tabular-nums">{formatXOF(a.total_amount)}</span><AppointmentBadge status={a.status} />
                  </Link></li>
                ))}
              </ul>
            )}
          </Panel>
          {orders.data && (
            <Panel title="Achats" padded={false}>
              {orders.data.length === 0 ? <p className="p-5 text-sm text-muted">Aucun achat.</p> : (
                <ul className="divide-y divide-line/70 text-sm">
                  {(orders.data as { id: string; reference: string; channel: string; status: OrderStatus; total_amount: number; created_at: string }[]).map((o) => (
                    <li key={o.id}><Link href={`/admin/commandes/${o.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-powder-50/50">
                      <span className="w-32 text-muted">{formatShortDate(o.created_at)}</span>
                      <span className="flex-1">{o.reference} <span className="text-xs text-muted">· {o.channel === 'pos' ? 'Caisse' : 'En ligne'}</span></span>
                      <span className="tabular-nums">{formatXOF(o.total_amount)}</span><OrderBadge status={o.status} />
                    </Link></li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {payments.data && (
            <Panel title="Paiements" padded={false}>
              {payments.data.length === 0 ? <p className="p-5 text-sm text-muted">Aucun paiement.</p> : (
                <ul className="divide-y divide-line/70 text-sm">
                  {(payments.data as { id: string; reference: string; kind: PaymentKind; method: PaymentMethod; amount: number; status: string; paid_at: string | null; created_at: string }[]).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <span>{PAYMENT_KIND_LABEL[p.kind]} · {PAYMENT_METHOD_LABEL[p.method]}<span className="block text-xs text-muted">{p.reference} · {formatDateTime(p.paid_at ?? p.created_at)}{p.status !== 'succeeded' && ` · ${p.status}`}</span></span>
                      <span className={`tabular-nums font-semibold ${p.kind === 'refund' ? 'text-danger' : ''}`}>{p.kind === 'refund' ? '−' : ''}{formatXOF(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>
        <div className="grid h-fit gap-6">
          <Panel title="Informations"><CustomerForm customer={c} readOnly={!ctx.can('customers.manage')} /></Panel>
          <Panel title="Fidélité">
            <p className="text-sm">Solde : <strong>{loyalty.data?.points_balance ?? 0} points</strong> <span className="text-muted">(cumul : {loyalty.data?.lifetime_points ?? 0})</span></p>
            {(ltx.data ?? []).length > 0 && (
              <ul className="mt-3 grid gap-1.5 text-xs">
                {(ltx.data as { id: number; points: number; reason: string; note: string | null; created_at: string }[]).map((t) => (
                  <li key={t.id} className="flex justify-between gap-2"><span>{LOYALTY_REASON[t.reason] ?? t.reason}{t.note && <span className="text-muted"> — {t.note}</span>}<span className="block text-muted">{formatShortDate(t.created_at)}</span></span><span className={t.points < 0 ? 'text-danger' : 'text-success'}>{t.points > 0 ? '+' : ''}{t.points}</span></li>
                ))}
              </ul>
            )}
            {ctx.can('loyalty.manage') && <div className="mt-4"><LoyaltyAdjustForm customerId={c.id} /></div>}
          </Panel>
          {ctx.can('customers.delete') && <Panel title="Zone sensible"><p className="mb-3 text-xs text-muted">Suppression possible uniquement si la cliente n&apos;a aucun rendez-vous (historique conservé).</p><DeleteCustomerButton id={c.id} /></Panel>}
        </div>
      </div>
    </>
  );
}
