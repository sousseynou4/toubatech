import Link from 'next/link';
import { Truck } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { StockMovementForm } from '@/components/admin/commerce/stock-forms';
import { STOCK_REASON_LABEL } from '@/components/admin/commerce/labels';
import { formatDateTime, formatXOF } from '@/lib/format';

export const metadata = { title: 'Stocks' };

interface VRow { id: string; name: string; stock_quantity: number; alert_threshold: number; cost_price: number | null; sale_price: number | null; is_active: boolean; product: { id: string; name: string; status: string } | null }

export default async function StocksPage({ searchParams }: PageProps<'/admin/stocks'>) {
  const ctx = await requireStaff('products.view');
  const sp = await searchParams;
  const variante = typeof sp.variante === 'string' ? sp.variante : undefined;
  const raison = typeof sp.raison === 'string' ? sp.raison : '';
  const sb = (await createClient())!;
  let movesQ = sb.from('stock_movements').select('id, quantity_delta, reason, note, unit_cost, resulting_quantity, created_at, variant:product_variants(name, product:products(id, name))').order('created_at', { ascending: false }).limit(60);
  if (raison) movesQ = movesQ.eq('reason', raison);
  const [{ data: vdata }, { data: suppliers }, { data: moves }] = await Promise.all([
    sb.from('product_variants').select('id, name, stock_quantity, alert_threshold, cost_price, sale_price, is_active, product:products(id, name, status)').order('stock_quantity').limit(1000),
    sb.from('suppliers').select('id, name').eq('is_active', true).order('name'),
    movesQ,
  ]);
  const variants = ((vdata ?? []) as unknown as VRow[]).filter((v) => v.product && v.product.status !== 'inactive' && v.is_active);
  const label = (v: VRow) => `${v.product?.name}${v.name !== 'Standard' ? ` — ${v.name}` : ''}`;
  const alerts = variants.filter((v) => v.stock_quantity <= v.alert_threshold);
  const stockValue = variants.reduce((s, v) => s + v.stock_quantity * (v.cost_price ?? 0), 0);
  const units = variants.reduce((s, v) => s + v.stock_quantity, 0);
  type Move = { id: number; quantity_delta: number; reason: string; note: string | null; unit_cost: number | null; resulting_quantity: number | null; created_at: string; variant: { name: string; product: { id: string; name: string } | null } | null };

  return (
    <>
      <PageHeader title="Stocks" description={`${units} unités en stock · valeur au prix d'achat : ${formatXOF(stockValue)}`}
        actions={<ButtonLink href="/admin/stocks/fournisseurs" size="sm" variant="outline"><Truck className="size-4" /> Fournisseurs</ButtonLink>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-6 xl:col-span-2">
          <Panel title={`Alertes de stock (${alerts.length})`} padded={false}>
            {alerts.length === 0 ? <div className="p-5"><EmptyState title="Aucun produit sous son seuil d'alerte" /></div> : (
              <Table>
                <thead><tr><th>Produit</th><th>Stock</th><th>Seuil</th><th /></tr></thead>
                <tbody>{alerts.map((v) => (
                  <tr key={v.id}>
                    <td><Link href={`/admin/produits/${v.product?.id}`} className="font-medium hover:text-rosewood">{label(v)}</Link></td>
                    <td className={v.stock_quantity === 0 ? 'font-semibold text-danger' : 'font-semibold text-warning'}>{v.stock_quantity === 0 ? 'Rupture' : v.stock_quantity}</td>
                    <td>{v.alert_threshold}</td>
                    <td>{ctx.can('inventory.manage') && <Link href={`/admin/stocks?variante=${v.id}#mouvement`} className="text-sm text-rosewood">Réapprovisionner</Link>}</td>
                  </tr>
                ))}</tbody>
              </Table>
            )}
          </Panel>
          <Panel title="Historique des mouvements" padded={false} action={
            <form action="/admin/stocks" className="flex gap-2"><select name="raison" defaultValue={raison} className="field h-8 py-0 text-xs" aria-label="Filtrer par type"><option value="">Tous</option>{Object.entries(STOCK_REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button className="rounded-lg bg-ink px-2 text-xs text-ivory">OK</button></form>
          }>
            {(moves ?? []).length === 0 ? <div className="p-5"><EmptyState title="Aucun mouvement" /></div> : (
              <Table>
                <thead><tr><th>Date</th><th>Produit</th><th>Type</th><th>Quantité</th><th>Stock après</th></tr></thead>
                <tbody>{((moves ?? []) as unknown as Move[]).map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(m.created_at)}</td>
                    <td>{m.variant?.product?.name}{m.variant && m.variant.name !== 'Standard' ? ` — ${m.variant.name}` : ''}{m.note && <span className="block text-xs text-muted">{m.note}</span>}</td>
                    <td>{STOCK_REASON_LABEL[m.reason] ?? m.reason}{m.unit_cost !== null && <span className="block text-xs text-muted">{formatXOF(m.unit_cost)} / u.</span>}</td>
                    <td className={`font-semibold tabular-nums ${m.quantity_delta < 0 ? 'text-danger' : 'text-success'}`}>{m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}</td>
                    <td className="tabular-nums">{m.resulting_quantity}</td>
                  </tr>
                ))}</tbody>
              </Table>
            )}
          </Panel>
        </div>
        <div id="mouvement" className="h-fit scroll-mt-24">
          {ctx.can('inventory.manage') ? (
            <Panel title="Enregistrer un mouvement">
              {variants.length === 0 ? <EmptyState title="Aucun produit" action={<ButtonLink href="/admin/produits/nouveau" size="sm">Créer un produit</ButtonLink>} /> :
                <StockMovementForm variants={variants.map((v) => ({ id: v.id, label: label(v), stock: v.stock_quantity })).sort((a, b) => a.label.localeCompare(b.label))} suppliers={suppliers ?? []} defaultVariant={variante} />}
            </Panel>
          ) : <Panel title="Mouvements"><p className="text-sm text-muted">Vous pouvez consulter les stocks ; les mouvements sont réservés aux personnes habilitées.</p></Panel>}
        </div>
      </div>
    </>
  );
}
