import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { InvoiceDocument } from '@/components/admin/invoices/InvoiceDocument';
import { InvoiceActions } from '@/components/admin/invoices/InvoiceActions';
import { getServerSupabase } from '@/lib/supabase';
import { STATE_LABELS, invoiceState, paymentsOf, remainingCents, todayParis, type InvoicePayment, type InvoiceRow } from '@/lib/invoice';

export async function generateMetadata({ params }: { params: { number: string } }) {
  return { title: `${params.number} — TOUBA TECH` };
}

type WithPayments = InvoiceRow & { invoice_payments: InvoicePayment[] };
const PAYMENTS = 'invoice_payments(paid_at, amount_cents, method)';

export default async function InvoicePage({ params }: { params: { number: string } }) {
  const supabase = getServerSupabase();
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`*, ${PAYMENTS}`)
    .eq('number', params.number)
    .single<WithPayments>();
  if (!invoice) notFound();

  // Avoir → facture qu'il annule ; facture → avoir qui l'annule, s'il existe.
  const relatedQuery = supabase.from('invoices').select(`number, issue_date, total_cents, paid_at, payment_method, ${PAYMENTS}`);
  const { data: related } = await (invoice.credit_note_for
    ? relatedQuery.eq('id', invoice.credit_note_for)
    : relatedQuery.eq('credit_note_for', invoice.id)
  ).maybeSingle<Pick<WithPayments, 'number' | 'issue_date' | 'total_cents' | 'paid_at' | 'payment_method' | 'invoice_payments'>>();

  const isCredit = invoice.kind === 'credit_note';
  const today = todayParis();
  const state = STATE_LABELS[invoiceState(invoice, !isCredit && !!related, today)];
  const payments = paymentsOf(invoice);

  // Facture : ce que le client doit encore (rien si elle est annulée).
  // Avoir : on ne rembourse que ce que le client avait réellement payé sur la facture annulée.
  const settled = (inv: Parameters<typeof remainingCents>[0]) => Math.abs(inv.total_cents) - remainingCents(inv);
  const remaining = isCredit
    ? Math.max(0, (related ? settled(related) : 0) - settled(invoice))
    : related
      ? 0
      : remainingCents(invoice);

  return (
    <>
      <div className="print:hidden">
        <AdminHeader />
      </div>
      {/* Format A4 à l'impression / « Enregistrer en PDF » */}
      <style>{'@page { size: A4; margin: 14mm; }'}</style>
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 print:p-0">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
          <div>
            <Link href="/admin/factures" className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition-colors hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" /> Toutes les factures
            </Link>
            <p className="mt-3 flex items-center gap-3">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${state.cls}`}>{state.label}</span>
              {related && (
                <Link href={`/admin/factures/${related.number}`} className="text-xs text-ink-500 underline hover:text-ink">
                  {isCredit ? `Annule ${related.number}` : `Annulée par ${related.number}`}
                </Link>
              )}
            </p>
          </div>
          <InvoiceActions
            id={invoice.id}
            number={invoice.number}
            isCreditNote={isCredit}
            remaining={remaining}
            canCreditNote={!isCredit && !related}
            today={today}
          />
        </div>

        <InvoiceDocument invoice={invoice} original={isCredit ? related : null} payments={payments} />
      </div>
    </>
  );
}
