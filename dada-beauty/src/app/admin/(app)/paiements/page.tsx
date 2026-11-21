import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, KpiCard, PageHeader, Panel, Table } from '@/components/admin/ui';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/field';
import { RefundForm } from '@/components/admin/commerce/cash-forms';
import { addDays, formatDateTime, formatXOF, todayInDakar } from '@/lib/format';
import { onlineProviders } from '@/lib/payments';
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL, type PaymentKind, type PaymentMethod } from '@/lib/types';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

export const metadata = { title: 'Paiements' };

interface Row {
  id: string; reference: string; kind: PaymentKind; method: PaymentMethod; status: string; amount: number; provider: string | null; provider_reference: string | null;
  is_manual: boolean; note: string | null; refund_of: string | null; paid_at: string | null; created_at: string; appointment_id: string | null; order_id: string | null;
  appointment: { reference: string } | null; order: { reference: string } | null; customer: { full_name: string } | null;
}

export default async function PaymentsPage({ searchParams }: PageProps<'/admin/paiements'>) {
  const ctx = await requireStaff('payments.view');
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const from = /^\d{4}-\d{2}-\d{2}$/.test(s('du')) ? s('du') : addDays(todayInDakar(), -30);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(s('au')) ? s('au') : todayInDakar();
  const method = s('moyen') in PAYMENT_METHOD_LABEL ? s('moyen') : '';
  const kind = s('type') in PAYMENT_KIND_LABEL ? s('type') : '';
  const status = ['pending', 'succeeded', 'failed', 'cancelled'].includes(s('statut')) ? s('statut') : '';
  const refundId = s('rembourser');
  const sb = (await createClient())!;
  let q = sb.from('payments')
    .select('id, reference, kind, method, status, amount, provider, provider_reference, is_manual, note, refund_of, paid_at, created_at, appointment_id, order_id, appointment:appointments(reference), order:orders(reference), customer:customers(full_name)')
    .gte('created_at', `${from}T00:00:00Z`).lt('created_at', `${addDays(to, 1)}T00:00:00Z`).order('created_at', { ascending: false }).limit(500);
  if (method) q = q.eq('method', method);
  if (kind) q = q.eq('kind', kind);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];
  const ok = rows.filter((r) => r.status === 'succeeded');
  const cashIn = ok.filter((r) => r.kind !== 'refund').reduce((t, r) => t + r.amount, 0);
  const refunds = ok.filter((r) => r.kind === 'refund').reduce((t, r) => t + r.amount, 0);
  const refundedBy = (id: string) => ok.filter((r) => r.refund_of === id).reduce((t, r) => t + r.amount, 0);
  const providers = onlineProviders();
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ du: from, au: to, ...(method && { moyen: method }), ...(kind && { type: kind }), ...(status && { statut: status }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/paiements?${p}`;
  };

  return (
    <>
      <PageHeader title="Paiements" description="Encaissements, acomptes et remboursements" />
      {providers.length === 0 && (
        <Alert className="mb-5">Aucun paiement en ligne n&apos;est connecté (Wave / Orange Money) : tous les paiements sont saisis par l&apos;équipe après vérification (espèces, transferts reçus).</Alert>
      )}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Encaissé sur la période" value={formatXOF(cashIn)} icon={<ArrowDownLeft className="size-5" />} />
        <KpiCard label="Remboursements" value={formatXOF(refunds)} tone="nude" icon={<ArrowUpRight className="size-5" />} />
        <KpiCard label="Net" value={formatXOF(cashIn - refunds)} tone="gold" icon={<Wallet className="size-5" />} hint={`${ok.length} opération${ok.length > 1 ? 's' : ''} réussie${ok.length > 1 ? 's' : ''}`} />
      </div>
      <form className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6" action="/admin/paiements">
        <input type="date" name="du" defaultValue={from} className="field h-10 py-0" aria-label="Du" />
        <input type="date" name="au" defaultValue={to} className="field h-10 py-0" aria-label="Au" />
        <select name="moyen" defaultValue={method} className="field h-10 py-0" aria-label="Moyen"><option value="">Tous moyens</option>{Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="type" defaultValue={kind} className="field h-10 py-0" aria-label="Type"><option value="">Tous types</option>{Object.entries(PAYMENT_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="statut" defaultValue={status} className="field h-10 py-0" aria-label="Statut"><option value="">Tous statuts</option><option value="succeeded">Réussi</option><option value="pending">En attente</option><option value="failed">Échoué</option><option value="cancelled">Annulé</option></select>
        <button className="h-10 rounded-xl bg-ink text-sm text-ivory">Filtrer</button>
      </form>
      <Panel padded={false}>
        {rows.length === 0 ? <div className="p-5"><EmptyState title="Aucun paiement sur la période" /></div> : (
          <Table>
            <thead><tr><th>Date</th><th>Objet</th><th>Type / moyen</th><th>Montant</th><th>Statut</th><th /></tr></thead>
            <tbody>{rows.map((p) => {
              const refundable = p.kind !== 'refund' && p.status === 'succeeded' ? p.amount - refundedBy(p.id) : 0;
              return (
                <tr key={p.id}>
                  <td className="whitespace-nowrap">{formatDateTime(p.paid_at ?? p.created_at)}<span className="block font-mono text-xs text-muted">{p.reference}</span></td>
                  <td>{p.appointment_id ? <Link href={`/admin/rendez-vous/${p.appointment_id}`} className="text-rosewood">RDV {p.appointment?.reference}</Link> : p.order_id ? <Link href={`/admin/commandes/${p.order_id}`} className="text-rosewood">{p.order?.reference}</Link> : '—'}<span className="block text-xs text-muted">{p.customer?.full_name}</span></td>
                  <td>{PAYMENT_KIND_LABEL[p.kind]} · {PAYMENT_METHOD_LABEL[p.method]}<span className="block text-xs text-muted">{p.is_manual ? 'Saisie équipe' : `En ligne (${p.provider})`}{p.provider_reference ? ` · ${p.provider_reference}` : ''}</span></td>
                  <td className={`tabular-nums font-semibold ${p.kind === 'refund' ? 'text-danger' : ''}`}>{p.kind === 'refund' ? '−' : ''}{formatXOF(p.amount)}</td>
                  <td>{p.status === 'succeeded' ? <Badge tone="success">Réussi</Badge> : p.status === 'pending' ? <Badge tone="warning">En attente</Badge> : <Badge tone="danger">{p.status === 'failed' ? 'Échoué' : 'Annulé'}</Badge>}</td>
                  <td className="min-w-48">
                    {ctx.can('payments.refund') && refundable > 0 && (refundId === p.id
                      ? <RefundForm paymentId={p.id} max={refundable} />
                      : <Link href={qs({ rembourser: p.id })} className="text-sm text-rosewood">Rembourser</Link>)}
                  </td>
                </tr>
              );
            })}</tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
