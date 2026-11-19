import Link from 'next/link';
import { Plus, Download, FileText } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { getServerSupabase } from '@/lib/supabase';
import { STATE_LABELS, formatDateFr, formatEuros, invoiceState, todayParis, type InvoiceRow } from '@/lib/invoice';

export const metadata = { title: 'Factures — Admin TOUBA TECH' };

type ListRow = Pick<InvoiceRow, 'id' | 'number' | 'kind' | 'credit_note_for' | 'issue_date' | 'due_date' | 'customer_name' | 'customer_company' | 'total_cents' | 'paid_at'>;

export default async function InvoicesPage() {
  const { data, error } = await getServerSupabase()
    .from('invoices')
    .select('id, number, kind, credit_note_for, issue_date, due_date, customer_name, customer_company, total_cents, paid_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) console.error('[admin/factures] fetch failed:', error);
  const list = (data ?? []) as ListRow[];
  const credited = new Set(list.map((r) => r.credit_note_for).filter(Boolean));
  const today = todayParis();
  const year = today.slice(0, 4);

  const states = list.map((r) => invoiceState(r, credited.has(r.id), today));
  // CA encaissé de l'année : factures payées moins avoirs remboursés (date d'encaissement).
  const cashedThisYear = list.reduce((sum, r) => (r.paid_at?.startsWith(year) ? sum + r.total_cents : sum), 0);
  const toCollect = list.reduce((sum, r, i) => (states[i] === 'due' || states[i] === 'overdue' ? sum + r.total_cents : sum), 0);

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">Factures</h1>
            <p className="mt-1 text-sm text-ink-500">
              Encaissé en {year} : <strong className="font-mono text-ink">{formatEuros(cashedThisYear)}</strong>
              {toCollect > 0 && <> · reste à encaisser : <strong className="font-mono text-ink">{formatEuros(toCollect)}</strong></>}
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/api/admin/invoices" className="inline-flex items-center gap-2 rounded-full border border-ink/12 px-4 py-2.5 text-sm text-ink-600 transition-colors hover:text-ink">
              <Download className="h-4 w-4" /> Export CSV
            </a>
            <Link href="/admin/factures/nouvelle" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bone transition-all hover:bg-ink-700">
              <Plus className="h-4 w-4" /> Nouvelle facture
            </Link>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Impossible de lire les factures. La table a-t-elle été créée (supabase/migration-invoices.sql) ?
          </p>
        )}

        {list.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-ink/10 bg-bone p-12 text-center">
            <FileText className="mx-auto h-6 w-6 text-ink-300" />
            <p className="mt-4 text-[15px] text-ink-500">Aucune facture pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-ink/10 bg-bone">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/8 text-left text-xs text-ink-400">
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 text-right font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {list.map((r, i) => {
                  const st = STATE_LABELS[states[i]];
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-mist/20">
                      <td className="px-4 py-3">
                        <Link href={`/admin/factures/${r.number}`} className="font-mono font-medium text-ink hover:text-emerald">{r.number}</Link>
                      </td>
                      <td className="px-4 py-3 text-ink-500">{formatDateFr(r.issue_date)}</td>
                      <td className="px-4 py-3 text-ink">{r.customer_company ?? r.customer_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-ink">{formatEuros(r.total_cents)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
