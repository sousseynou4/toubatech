import Link from 'next/link';
import { Download } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { RankingBars, RevenueChart } from '@/components/admin/charts';
import { SERIES } from '@/lib/chart-colors';
import { PrintButton, RangePicker } from '@/components/admin/system/range-picker';
import { Alert } from '@/components/ui/field';
import { formatShortDate, formatXOF } from '@/lib/format';
import { resolveRange } from '@/server/admin/analytics';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Statistiques' };
export const dynamic = 'force-dynamic';

interface Summary {
  revenue_services: number; revenue_products: number; discounts: number; revenue_net: number; cogs: number; gross_margin_products: number;
  expenses: number; estimated_result: number; cash_in: number; refunds: number; deposits_held: number; appointments_total: number;
  appointments_completed: number; appointments_cancelled: number; appointments_no_show: number; cancellation_rate: number; no_show_rate: number;
  new_customers: number; orders_completed: number; average_ticket: number;
}

export default async function StatsPage({ searchParams }: PageProps<'/admin/statistiques'>) {
  await requireStaff('analytics.view');
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);
  const range = await resolveRange(s('periode'), s('du'), s('au'));
  const days = (Date.parse(range.to) - Date.parse(range.from)) / 864e5 + 1;
  const gran = (['day', 'week', 'month'].includes(s('grain') ?? '') ? s('grain') : days > 120 ? 'month' : days > 45 ? 'week' : 'day') as 'day' | 'week' | 'month';
  const sb = (await createClient())!;
  const p = { p_from: range.from, p_to: range.to };
  const [summary, series, services, products, employees, growth, stock] = await Promise.all([
    sb.rpc('analytics_summary', p), sb.rpc('analytics_revenue_series', { ...p, p_granularity: gran }),
    sb.rpc('analytics_top_services', { ...p, p_limit: 10 }), sb.rpc('analytics_top_products', { ...p, p_limit: 10 }),
    sb.rpc('analytics_employee_performance', p), sb.rpc('analytics_customer_growth', p), sb.rpc('analytics_stock_rotation', p),
  ]);
  if (summary.error) return <Alert tone="danger">Impossible de charger les statistiques : {summary.error.message}</Alert>;
  const k = summary.data as Summary;
  const fmtBucket = (b: string) => gran === 'month'
    ? new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${b}T12:00:00Z`))
    : formatShortDate(`${b}T12:00:00Z`).slice(0, 5);
  const seriesRows = ((series.data ?? []) as { bucket: string; services: number; products: number; cash_in: number; expenses: number }[]);
  const chart = seriesRows.map((r) => ({ label: fmtBucket(r.bucket), services: Number(r.services), products: Number(r.products) }));
  const exportHref = (type: string) => `/admin/statistiques/export?${new URLSearchParams({ type, from: range.from, to: range.to, ...(type === 'series' ? { grain: gran } : {}) })}`;
  const keep = { periode: range.preset, ...(range.preset === 'perso' ? { du: range.from, au: range.to } : {}) };

  const kpis: { label: string; value: string; hint?: string; strong?: boolean }[] = [
    { label: 'CA prestations', value: formatXOF(k.revenue_services), hint: 'Rendez-vous terminés + prestations en caisse' },
    { label: 'CA produits', value: formatXOF(k.revenue_products), hint: 'Commandes livrées + ventes caisse' },
    { label: 'Remises', value: formatXOF(k.discounts) },
    { label: 'CA net', value: formatXOF(k.revenue_net), strong: true },
    { label: 'Encaissements', value: formatXOF(k.cash_in), hint: 'Paiements reçus sur la période' },
    { label: 'Remboursements', value: formatXOF(k.refunds) },
    { label: 'Acomptes détenus', value: formatXOF(k.deposits_held), hint: 'Sur rendez-vous non terminés (à date)' },
    { label: 'Dépenses', value: formatXOF(k.expenses) },
    { label: 'Coût des marchandises', value: formatXOF(k.cogs) },
    { label: 'Marge produits', value: formatXOF(k.gross_margin_products) },
    { label: 'Résultat estimé', value: formatXOF(k.estimated_result), hint: 'CA net − coût des marchandises − dépenses', strong: true },
    { label: 'Panier moyen', value: formatXOF(k.average_ticket) },
    { label: 'Rendez-vous', value: `${k.appointments_completed} / ${k.appointments_total}`, hint: 'Terminés / planifiés' },
    { label: 'Taux d\'annulation', value: `${k.cancellation_rate} %`, hint: `${k.appointments_cancelled} annulation(s)` },
    { label: 'Taux d\'absence', value: `${k.no_show_rate} %`, hint: `${k.appointments_no_show} absence(s)` },
    { label: 'Nouvelles clientes', value: String(k.new_customers) },
  ];

  return (
    <div className="stats-print">
      <style>{`@media print {
        aside, header, nav, .print\\:hidden { display: none !important; }
        .lg\\:pl-64 { padding-left: 0 !important; }
        body, .bg-admin { background: #fff !important; }
        .stats-print section { break-inside: avoid; box-shadow: none !important; }
        @page { size: A4; margin: 12mm; }
      }`}</style>
      <PageHeader title="Statistiques" description={`Du ${formatShortDate(`${range.from}T12:00:00Z`)} au ${formatShortDate(`${range.to}T12:00:00Z`)} — données réelles, heure de Dakar`}
        actions={<><PrintButton /><Link href={exportHref('summary')} className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-sm text-ivory print:hidden"><Download className="size-4" /> CSV</Link></>} />
      <RangePicker basePath="/admin/statistiques" preset={range.preset} from={range.from} to={range.to} />

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((x) => (
          <div key={x.label} className={cn('rounded-[1.25rem] border border-line bg-white p-4 shadow-soft', x.strong && 'border-blush bg-powder-50')}>
            <p className="text-xs text-muted">{x.label}</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{x.value}</p>
            {x.hint && <p className="mt-1 text-[0.7rem] text-muted">{x.hint}</p>}
          </div>
        ))}
      </div>

      <Panel className="mt-6" title="Chiffre d'affaires" action={
        <div className="flex items-center gap-1 text-xs print:hidden">
          {(['day', 'week', 'month'] as const).map((g) => (
            <Link key={g} href={`/admin/statistiques?${new URLSearchParams({ ...keep, grain: g })}`} className={cn('rounded-lg px-2 py-1', gran === g ? 'bg-powder-100 font-semibold' : 'text-muted')}>{g === 'day' ? 'Jour' : g === 'week' ? 'Semaine' : 'Mois'}</Link>
          ))}
          <Link href={exportHref('series')} className="ml-2 text-rosewood">CSV</Link>
        </div>
      }>
        {chart.some((c) => c.services + c.products > 0) ? <RevenueChart data={chart} height={300} /> : <EmptyState title="Aucune vente reconnue sur la période" />}
        {seriesRows.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted">Voir le tableau (encaissements et dépenses inclus)</summary>
            <Table className="mt-3"><thead><tr><th>Période</th><th>Prestations</th><th>Produits</th><th>Encaissé</th><th>Dépenses</th></tr></thead>
              <tbody>{seriesRows.map((r) => <tr key={r.bucket}><td>{fmtBucket(r.bucket)}</td><td className="tabular-nums">{formatXOF(Number(r.services))}</td><td className="tabular-nums">{formatXOF(Number(r.products))}</td><td className="tabular-nums">{formatXOF(Number(r.cash_in))}</td><td className="tabular-nums">{formatXOF(Number(r.expenses))}</td></tr>)}</tbody>
            </Table>
          </details>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Prestations populaires" action={<Link href={exportHref('services')} className="text-xs text-rosewood print:hidden">CSV</Link>}>
          {(services.data ?? []).length ? (
            <>
              <RankingBars data={(services.data as { label: string; revenue: number }[]).map((x) => ({ label: x.label, value: Number(x.revenue) }))} />
              <Table className="mt-3"><thead><tr><th>Prestation</th><th>Nombre</th><th>CA</th></tr></thead>
                <tbody>{(services.data as { service_id: string; label: string; quantity: number; revenue: number }[]).map((x) => <tr key={x.service_id}><td>{x.label}</td><td>{x.quantity}</td><td className="tabular-nums">{formatXOF(Number(x.revenue))}</td></tr>)}</tbody></Table>
            </>
          ) : <EmptyState title="Aucune prestation terminée" />}
        </Panel>
        <Panel title="Produits les plus vendus" action={<Link href={exportHref('products')} className="text-xs text-rosewood print:hidden">CSV</Link>}>
          {(products.data ?? []).length ? (
            <>
              <RankingBars color={SERIES[1]} valueLabel="Quantité" money={false} data={(products.data as { label: string; quantity: number }[]).map((x) => ({ label: x.label, value: Number(x.quantity) }))} />
              <Table className="mt-3"><thead><tr><th>Produit</th><th>Qté</th><th>CA</th><th>Marge</th></tr></thead>
                <tbody>{(products.data as { variant_id: string; label: string; quantity: number; revenue: number; margin: number }[]).map((x) => <tr key={x.variant_id}><td>{x.label}</td><td>{x.quantity}</td><td className="tabular-nums">{formatXOF(Number(x.revenue))}</td><td className="tabular-nums">{formatXOF(Number(x.margin))}</td></tr>)}</tbody></Table>
            </>
          ) : <EmptyState title="Aucune vente de produit" />}
        </Panel>
        <Panel title="Performance de l'équipe" padded={false} action={<Link href={exportHref('employees')} className="text-xs text-rosewood print:hidden">CSV</Link>}>
          {(employees.data ?? []).length ? (
            <Table><thead><tr><th>Employée</th><th>RDV</th><th>Terminés</th><th>Absences</th><th>CA</th></tr></thead>
              <tbody>{(employees.data as { employee_id: string; display_name: string; color: string; appointments: number; completed: number; no_show: number; revenue: number }[]).map((e) => (
                <tr key={e.employee_id}><td><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: e.color }} />{e.display_name}</td><td>{e.appointments}</td><td>{e.completed}</td><td>{e.no_show}</td><td className="tabular-nums">{formatXOF(Number(e.revenue))}</td></tr>
              ))}</tbody></Table>
          ) : <div className="p-5"><EmptyState title="Aucune donnée" /></div>}
        </Panel>
        <Panel title="Évolution de la clientèle" padded={false}>
          {(growth.data ?? []).length ? (
            <Table><thead><tr><th>Mois</th><th>Nouvelles clientes</th><th>Total cumulé</th></tr></thead>
              <tbody>{(growth.data as { bucket: string; new_customers: number; total_customers: number }[]).map((g) => (
                <tr key={g.bucket}><td className="capitalize">{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${g.bucket}T12:00:00Z`))}</td><td>{g.new_customers}</td><td>{g.total_customers}</td></tr>
              ))}</tbody></Table>
          ) : <div className="p-5"><EmptyState title="Aucune donnée" /></div>}
        </Panel>
      </div>

      <Panel className="mt-6" title="Rotation des stocks" padded={false} action={<Link href={exportHref('stock')} className="text-xs text-rosewood print:hidden">CSV</Link>}>
        {(stock.data ?? []).length ? (
          <Table><thead><tr><th>Produit</th><th>Vendus</th><th>En stock</th><th>Seuil</th><th>Couverture</th></tr></thead>
            <tbody>{(stock.data as { variant_id: string; label: string; sold: number; stock_quantity: number; alert_threshold: number; days_of_cover: number | null }[]).map((r) => (
              <tr key={r.variant_id}><td>{r.label}</td><td>{r.sold}</td><td className={r.stock_quantity <= r.alert_threshold ? 'font-semibold text-danger' : ''}>{r.stock_quantity}</td><td>{r.alert_threshold}</td>
                <td>{r.days_of_cover === null ? '—' : `${r.days_of_cover} j`}</td></tr>
            ))}</tbody></Table>
        ) : <div className="p-5"><EmptyState title="Aucun produit actif" /></div>}
      </Panel>
    </div>
  );
}
