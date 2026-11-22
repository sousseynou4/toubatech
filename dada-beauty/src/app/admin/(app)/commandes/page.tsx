import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, OrderBadge, PageHeader, Panel, Table } from '@/components/admin/ui';
import { formatDateTime, formatXOF } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/types';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Commandes' };

const TABS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: '', label: 'À traiter', statuses: ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'shipped'] },
  { key: 'terminees', label: 'Terminées', statuses: ['delivered', 'completed'] },
  { key: 'annulees', label: 'Annulées / remboursées', statuses: ['cancelled', 'refunded'] },
  { key: 'toutes', label: 'Toutes' },
];

export default async function OrdersPage({ searchParams }: PageProps<'/admin/commandes'>) {
  await requireStaff('orders.view');
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === (typeof sp.vue === 'string' ? sp.vue : '')) ?? TABS[0]!;
  const canal = typeof sp.canal === 'string' && ['online', 'pos'].includes(sp.canal) ? sp.canal : '';
  const statut = typeof sp.statut === 'string' && sp.statut in ORDER_STATUS_LABEL ? sp.statut : '';
  const q = typeof sp.q === 'string' ? sp.q.replace(/[%_,()]/g, '').slice(0, 60) : '';
  const sb = (await createClient())!;
  let query = sb.from('orders').select('id, reference, channel, customer_name, customer_phone, fulfillment, status, total_amount, paid_amount, created_at').order('created_at', { ascending: false }).limit(300);
  if (statut) query = query.eq('status', statut);
  else if (tab.statuses) query = query.in('status', tab.statuses);
  if (canal) query = query.eq('channel', canal);
  if (q) query = query.or(`reference.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q.replace(/\D/g, '') || q}%`);
  const { data } = await query;
  const rows = (data ?? []) as { id: string; reference: string; channel: string; customer_name: string; customer_phone: string; fulfillment: string; status: OrderStatus; total_amount: number; paid_amount: number; created_at: string }[];
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(tab.key && { vue: tab.key }), ...(canal && { canal }), ...(q && { q }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/commandes${p.size ? `?${p}` : ''}`;
  };

  return (
    <>
      <PageHeader title="Commandes" description="Boutique en ligne et ventes en caisse" />
      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer les commandes">
        {TABS.map((t) => <Link key={t.key} href={href({ vue: t.key, statut: '' })} aria-current={tab.key === t.key && !statut ? 'page' : undefined}
          className={cn('shrink-0 rounded-full px-4 py-2 text-sm', tab.key === t.key && !statut ? 'bg-ink text-ivory' : 'border border-line bg-white text-ink-soft')}>{t.label}</Link>)}
      </nav>
      <form className="mb-4 grid gap-2 sm:grid-cols-4" action="/admin/commandes">
        {tab.key && <input type="hidden" name="vue" value={tab.key} />}
        <input name="q" defaultValue={q} placeholder="Référence, nom, téléphone" className="field h-10 py-0" aria-label="Recherche" />
        <select name="statut" defaultValue={statut} className="field h-10 py-0" aria-label="Statut"><option value="">Statut (onglet)</option>{Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="canal" defaultValue={canal} className="field h-10 py-0" aria-label="Canal"><option value="">Tous canaux</option><option value="online">En ligne</option><option value="pos">Caisse</option></select>
        <button className="h-10 rounded-xl bg-ink text-sm text-ivory">Filtrer</button>
      </form>
      <Panel padded={false}>
        {rows.length === 0 ? <div className="p-5"><EmptyState title="Aucune commande" /></div> : (
          <Table>
            <thead><tr><th>Commande</th><th>Cliente</th><th>Remise</th><th>Total</th><th>Payé</th><th>Statut</th></tr></thead>
            <tbody>{rows.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/commandes/${o.id}`} className="font-mono font-medium hover:text-rosewood">{o.reference}</Link><span className="block text-xs text-muted">{formatDateTime(o.created_at)} · {o.channel === 'pos' ? 'Caisse' : 'En ligne'}</span></td>
                <td>{o.customer_name}<span className="block text-xs text-muted">{formatPhone(o.customer_phone)}</span></td>
                <td>{o.fulfillment === 'delivery' ? 'Livraison' : o.fulfillment === 'pickup' ? 'Retrait' : 'Sur place'}</td>
                <td className="tabular-nums">{formatXOF(o.total_amount)}</td>
                <td className={cn('tabular-nums', o.paid_amount < o.total_amount && !['cancelled', 'refunded'].includes(o.status) && 'text-warning')}>{formatXOF(o.paid_amount)}</td>
                <td><OrderBadge status={o.status} /></td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
