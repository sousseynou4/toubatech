import Link from 'next/link';
import { Plus, Download, FileText, Phone } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { getServerSupabase } from '@/lib/supabase';
import {
  STATE_LABELS,
  formatDateFr,
  formatEuros,
  invoiceState,
  paymentsOf,
  remainingCents,
  todayParis,
  type InvoicePayment,
  type InvoiceRow,
} from '@/lib/invoice';

export const metadata = { title: 'Factures — Admin TOUBA TECH' };

type ListRow = Pick<
  InvoiceRow,
  'id' | 'number' | 'kind' | 'credit_note_for' | 'issue_date' | 'due_date' | 'customer_name' | 'customer_company' | 'customer_phone' | 'total_cents' | 'paid_at' | 'payment_method'
> & { invoice_payments: InvoicePayment[] };

interface Debtor {
  name: string;
  phone: string | null;
  invoices: { number: string; due: number }[];
  owed: number;
  oldestDue: string;
}

export default async function InvoicesPage() {
  // shortcut: Supabase renvoie au plus 1000 lignes ; paginer au-delà de ~1000 factures.
  const { data, error } = await getServerSupabase()
    .from('invoices')
    .select('id, number, kind, credit_note_for, issue_date, due_date, customer_name, customer_company, customer_phone, total_cents, paid_at, payment_method, invoice_payments(paid_at, amount_cents, method)')
    .order('created_at', { ascending: false });

  if (error) console.error('[admin/factures] fetch failed:', error);
  const list = (data ?? []) as unknown as ListRow[];
  const credited = new Set(list.map((r) => r.credit_note_for).filter(Boolean));
  const today = todayParis();
  const year = today.slice(0, 4);

  const rows = list.map((r) => {
    const state = invoiceState(r, credited.has(r.id), today);
    const owed = state === 'due' || state === 'partial' || state === 'overdue' ? remainingCents(r) : 0;
    return { ...r, state, owed };
  });

  // Encaissé dans l'année (date de règlement) : règlements reçus moins remboursements d'avoirs.
  const cashedThisYear = rows.reduce(
    (sum, r) => sum + paymentsOf(r).filter((p) => p.paid_at.startsWith(year)).reduce((s, p) => s + (r.kind === 'credit_note' ? -1 : 1) * p.amount_cents, 0),
    0
  );
  const totalOwed = rows.reduce((sum, r) => sum + r.owed, 0);
  const overdueOwed = rows.reduce((sum, r) => sum + (r.state === 'overdue' ? r.owed : 0), 0);

  // Qui me doit combien : regroupement par client.
  const debtors = new Map<string, Debtor>();
  for (const r of rows) {
    if (r.owed === 0) continue;
    const name = r.customer_company ?? r.customer_name;
    const key = name.trim().toLowerCase();
    const d = debtors.get(key) ?? { name, phone: r.customer_phone, invoices: [], owed: 0, oldestDue: r.due_date };
    d.invoices.push({ number: r.number, due: r.owed });
    d.owed += r.owed;
    if (r.due_date < d.oldestDue) d.oldestDue = r.due_date;
    d.phone ??= r.customer_phone;
    debtors.set(key, d);
  }
  const debtorList = [...debtors.values()].sort((a, b) => b.owed - a.owed);

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">Factures</h1>
            <p className="mt-1 text-sm text-ink-500">
              Encaissé en {year} : <strong className="font-mono text-ink">{formatEuros(cashedThisYear)}</strong>
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
            Impossible de lire les factures. Relancez supabase/migration-invoices.sql dans Supabase › SQL Editor.
          </p>
        )}

        {debtorList.length > 0 && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 md:p-6" aria-labelledby="debtors-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="debtors-title" className="text-[15px] font-medium tracking-tight text-ink">
                Clients qui vous doivent de l&apos;argent
              </h2>
              <p className="text-sm text-ink-500">
                Total dû : <strong className="font-mono text-ink">{formatEuros(totalOwed)}</strong>
                {overdueOwed > 0 && <> · dont en retard : <strong className="font-mono text-red-700">{formatEuros(overdueOwed)}</strong></>}
              </p>
            </div>
            <ul className="mt-4 divide-y divide-ink/8">
              {debtorList.map((d) => {
                const late = d.oldestDue < today;
                return (
                  <li key={d.name} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{d.name}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-500">
                        {d.invoices.map((inv) => (
                          <Link key={inv.number} href={`/admin/factures/${inv.number}`} className="font-mono underline hover:text-ink">
                            {inv.number} ({formatEuros(inv.due)})
                          </Link>
                        ))}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {d.phone && (
                        <a href={`tel:${d.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink">
                          <Phone className="h-3 w-3" /> {d.phone}
                        </a>
                      )}
                      <span className={`text-xs ${late ? 'font-medium text-red-700' : 'text-ink-500'}`}>
                        {late ? `en retard depuis le ${formatDateFr(d.oldestDue)}` : `échéance ${formatDateFr(d.oldestDue)}`}
                      </span>
                      <strong className="font-mono text-ink">{formatEuros(d.owed)}</strong>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {rows.length === 0 ? (
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
                  <th className="px-4 py-3 text-right font-medium">Reste dû</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {rows.map((r) => {
                  const st = STATE_LABELS[r.state];
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-mist/20">
                      <td className="px-4 py-3">
                        <Link href={`/admin/factures/${r.number}`} className="font-mono font-medium text-ink hover:text-emerald">{r.number}</Link>
                      </td>
                      <td className="px-4 py-3 text-ink-500">{formatDateFr(r.issue_date)}</td>
                      <td className="px-4 py-3 text-ink">{r.customer_company ?? r.customer_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-ink">{formatEuros(r.total_cents)}</td>
                      <td className={`px-4 py-3 text-right font-mono ${r.owed ? 'font-medium text-ink' : 'text-ink-300'}`}>
                        {r.owed ? formatEuros(r.owed) : '—'}
                      </td>
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
