import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OrderBadge, PageHeader, Panel } from '@/components/admin/ui';
import { PaymentForm, WhatsAppTemplates } from '@/components/admin/appointment-actions';
import { OrderStatusActions } from '@/components/admin/commerce/order-actions';
import { formatDateTime, formatXOF } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { templates } from '@/lib/notifications/messages';
import { isWhatsAppConfigured } from '@/lib/notifications/whatsapp';
import { ORDER_STATUS_LABEL, PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL, type OrderStatus, type PaymentKind, type PaymentMethod } from '@/lib/types';

export const metadata = { title: 'Commande' };

export default async function OrderDetail({ params }: PageProps<'/admin/commandes/[id]'>) {
  const ctx = await requireStaff('orders.view');
  const { id } = await params;
  const sb = (await createClient())!;
  const { data: o } = await sb.from('orders').select('*, items:order_items(id, item_type, label, quantity, unit_price, line_total)').eq('id', id).maybeSingle();
  if (!o) notFound();
  const [{ data: events }, { data: payments }, { data: cashId }] = await Promise.all([
    sb.from('order_events').select('id, from_status, to_status, note, created_at').eq('order_id', id).order('created_at'),
    ctx.can('payments.view') ? sb.from('payments').select('id, reference, kind, method, status, amount, provider_reference, paid_at, created_at').eq('order_id', id).order('created_at') : Promise.resolve({ data: [] }),
    sb.rpc('open_cash_session_id'),
  ]);
  const status = o.status as OrderStatus;
  const name = String(o.customer_name).split(' ')[0] ?? '';
  const isPhone = /^\+\d{8,15}$/.test(o.customer_phone);
  const messages = [
    { key: 'order_received', label: 'Commande bien reçue', body: templates.orderReceived({ name, reference: o.reference, total: o.total_amount }) },
    { key: 'order_ready', label: 'Commande prête au retrait', body: templates.orderReady({ name, reference: o.reference }) },
  ];

  return (
    <>
      <PageHeader back={{ href: '/admin/commandes', label: 'Commandes' }} title={`Commande ${o.reference}`}
        description={`${o.channel === 'pos' ? 'Vente en caisse' : 'Commande en ligne'} · ${formatDateTime(o.created_at)}`} actions={<OrderBadge status={status} />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Panel title="Articles" padded={false}>
            <ul className="divide-y divide-line/70 text-sm">
              {(o.items as { id: string; item_type: string; label: string; quantity: number; unit_price: number; line_total: number }[]).map((i) => (
                <li key={i.id} className="flex justify-between gap-3 px-5 py-3"><span>{i.quantity} × {i.label}<span className="block text-xs text-muted">{i.item_type === 'service' ? 'Prestation' : 'Produit'} · {formatXOF(i.unit_price)} / u.</span></span><span className="tabular-nums">{formatXOF(i.line_total)}</span></li>
              ))}
            </ul>
            <dl className="grid gap-1 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatXOF(o.subtotal)}</dd></div>
              {o.discount_amount > 0 && <div className="flex justify-between"><dt className="text-muted">Remise</dt><dd>−{formatXOF(o.discount_amount)}</dd></div>}
              {o.delivery_fee > 0 && <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd>{formatXOF(o.delivery_fee)}</dd></div>}
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatXOF(o.total_amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Encaissé</dt><dd>{formatXOF(o.paid_amount)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Cliente et remise">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Cliente</dt><dd className="font-medium">{o.customer_id && ctx.can('customers.view') ? <Link href={`/admin/clientes/${o.customer_id}`} className="text-rosewood">{o.customer_name}</Link> : o.customer_name}</dd>{isPhone && <dd><a href={`tel:${o.customer_phone}`}>{formatPhone(o.customer_phone)}</a></dd>}{o.customer_email && <dd>{o.customer_email}</dd>}</div>
              <div><dt className="text-muted">Mode</dt><dd>{o.fulfillment === 'delivery' ? 'Livraison' : o.fulfillment === 'pickup' ? 'Retrait au salon' : 'Sur place'}</dd>
                {o.preferred_payment_method && <dd className="text-muted">Paiement souhaité : {PAYMENT_METHOD_LABEL[o.preferred_payment_method as PaymentMethod]}</dd>}</div>
              {o.delivery_address && <div className="sm:col-span-2"><dt className="text-muted">Adresse</dt><dd className="whitespace-pre-line">{o.delivery_address}</dd>{o.delivery_notes && <dd className="text-muted">{o.delivery_notes}</dd>}</div>}
              {o.internal_notes && <div className="sm:col-span-2"><dt className="text-muted">Notes</dt><dd className="whitespace-pre-line">{String(o.internal_notes).replace(/\[idem:[^\]]+\]/g, '').trim() || '—'}</dd></div>}
            </dl>
          </Panel>
          {ctx.can('payments.view') && (
            <Panel title="Paiements" padded={false}>
              {(payments ?? []).length === 0 ? <p className="p-5 text-sm text-muted">Aucun paiement enregistré.</p> : (
                <ul className="divide-y divide-line/70 text-sm">{(payments as { id: string; reference: string; kind: PaymentKind; method: PaymentMethod; status: string; amount: number; provider_reference: string | null; paid_at: string | null; created_at: string }[]).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 px-5 py-3">
                    <span>{PAYMENT_KIND_LABEL[p.kind]} · {PAYMENT_METHOD_LABEL[p.method]}{p.provider_reference && <span className="text-muted"> · {p.provider_reference}</span>}<span className="block text-xs text-muted">{p.reference} · {formatDateTime(p.paid_at ?? p.created_at)} · {p.status === 'succeeded' ? 'réussi' : p.status === 'pending' ? 'en attente' : p.status}</span></span>
                    <span className={`font-semibold tabular-nums ${p.kind === 'refund' ? 'text-danger' : ''}`}>{p.kind === 'refund' ? '−' : ''}{formatXOF(p.amount)}</span>
                  </li>
                ))}</ul>
              )}
            </Panel>
          )}
          <Panel title="Historique">
            <ol className="grid gap-2 border-l border-powder-200 pl-4 text-sm">
              {(events ?? []).map((e: { id: number; from_status: OrderStatus | null; to_status: OrderStatus | null; note: string | null; created_at: string }) => (
                <li key={e.id}><span className="font-medium">{e.to_status ? ORDER_STATUS_LABEL[e.to_status] : '—'}</span> <span className="text-muted">— {formatDateTime(e.created_at)}</span>{e.note && <span className="block text-xs text-muted">{e.note}</span>}</li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="grid h-fit gap-6">
          {ctx.can('orders.manage') && <Panel title="Traitement"><OrderStatusActions id={o.id} status={status} fulfillment={o.fulfillment} canRefund={ctx.can('payments.refund')} /></Panel>}
          {ctx.can('payments.manage') && !['cancelled', 'refunded'].includes(status) && (
            <Panel title="Encaisser"><PaymentForm orderId={o.id} remaining={o.total_amount - o.paid_amount} depositDue={0} cashOpen={Boolean(cashId)} /></Panel>
          )}
          {isPhone && o.channel === 'online' && <Panel title="Messages WhatsApp"><WhatsAppTemplates phone={o.customer_phone} messages={messages} orderId={o.id} customerId={o.customer_id ?? undefined} apiConfigured={isWhatsAppConfigured()} /></Panel>}
        </div>
      </div>
    </>
  );
}
