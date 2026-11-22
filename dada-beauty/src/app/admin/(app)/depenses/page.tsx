import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { ExpenseForm } from '@/components/admin/commerce/cash-forms';
import { EXPENSE_CATEGORY_LABEL } from '@/components/admin/commerce/labels';
import { formatShortDate, formatXOF, todayInDakar } from '@/lib/format';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/types';

export const metadata = { title: 'Dépenses' };

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function ExpensesPage({ searchParams }: PageProps<'/admin/depenses'>) {
  await requireStaff('expenses.manage');
  const { mois } = await searchParams;
  const month = typeof mois === 'string' && /^\d{4}-\d{2}$/.test(mois) ? mois : todayInDakar().slice(0, 7);
  const sb = (await createClient())!;
  const [{ data }, { data: suppliers }] = await Promise.all([
    sb.from('expenses').select('id, category, label, amount, method, spent_on, notes, supplier:suppliers(name)').gte('spent_on', `${month}-01`).lt('spent_on', `${shiftMonth(month, 1)}-01`).order('spent_on', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('suppliers').select('id, name').eq('is_active', true).order('name'),
  ]);
  const rows = (data ?? []) as unknown as { id: string; category: string; label: string; amount: number; method: PaymentMethod; spent_on: string; notes: string | null; supplier: { name: string } | null }[];
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCat = Object.entries(rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + r.amount }), {})).sort((a, b) => b[1] - a[1]);
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <>
      <PageHeader title="Dépenses" description={<>Total {monthLabel} : <strong className="text-ink">{formatXOF(total)}</strong></>} />
      <div className="mb-4 flex items-center gap-2">
        <Link href={`/admin/depenses?mois=${shiftMonth(month, -1)}`} className="grid size-9 place-items-center rounded-xl border border-line bg-white" aria-label="Mois précédent"><ChevronLeft className="size-4" /></Link>
        <Link href={`/admin/depenses?mois=${shiftMonth(month, 1)}`} className="grid size-9 place-items-center rounded-xl border border-line bg-white" aria-label="Mois suivant"><ChevronRight className="size-4" /></Link>
        <p className="ml-2 font-medium capitalize">{monthLabel}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-6 xl:col-span-2">
          {byCat.length > 0 && (
            <Panel title="Par catégorie">
              <ul className="grid gap-2 text-sm">{byCat.map(([c, v]) => (
                <li key={c} className="grid grid-cols-[10rem_1fr_auto] items-center gap-3">
                  <span>{EXPENSE_CATEGORY_LABEL[c] ?? c}</span>
                  <span className="h-2 rounded-full bg-powder-100"><span className="block h-2 rounded-full bg-[#B04E72]" style={{ width: `${Math.max(2, (v / total) * 100)}%` }} /></span>
                  <span className="tabular-nums">{formatXOF(v)}</span>
                </li>
              ))}</ul>
            </Panel>
          )}
          <Panel padded={false}>
            {rows.length === 0 ? <div className="p-5"><EmptyState title="Aucune dépense ce mois-ci" /></div> : (
              <Table>
                <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Moyen</th><th>Montant</th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{formatShortDate(`${r.spent_on}T12:00:00Z`)}</td>
                    <td>{r.label}{(r.supplier || r.notes) && <span className="block text-xs text-muted">{[r.supplier?.name, r.notes].filter(Boolean).join(' · ')}</span>}</td>
                    <td>{EXPENSE_CATEGORY_LABEL[r.category] ?? r.category}</td>
                    <td>{PAYMENT_METHOD_LABEL[r.method]}</td>
                    <td className="tabular-nums font-semibold">{formatXOF(r.amount)}</td>
                  </tr>
                ))}</tbody>
              </Table>
            )}
          </Panel>
        </div>
        <Panel title="Nouvelle dépense" className="h-fit"><ExpenseForm suppliers={suppliers ?? []} /></Panel>
      </div>
    </>
  );
}
