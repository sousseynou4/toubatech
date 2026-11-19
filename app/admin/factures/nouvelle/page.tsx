import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { InvoiceForm, type InvoicePrefill } from '@/components/admin/invoices/InvoiceForm';
import { getServerSupabase } from '@/lib/supabase';
import { DEVICE_LABELS, PROBLEM_LABELS } from '@/lib/labels';
import { todayParis } from '@/lib/invoice';

export const metadata = { title: 'Nouvelle facture — Admin TOUBA TECH' };

/** Pré-remplissage depuis un dossier de diagnostic : /admin/factures/nouvelle?diagnostic=TT-… */
async function prefillFromDiagnostic(reference?: string): Promise<InvoicePrefill> {
  if (!reference) return {};
  const { data: d } = await getServerSupabase()
    .from('diagnostics')
    .select('reference, device, brand, model, problems, full_name, email, phone')
    .eq('reference', reference)
    .single();
  if (!d) return {};
  const device = `${d.brand} ${d.model}`;
  return {
    customer_name: d.full_name,
    customer_email: d.email,
    customer_phone: d.phone,
    device: `${DEVICE_LABELS[d.device] ?? d.device} ${device}`,
    diagnostic_reference: d.reference,
    lines: (d.problems as string[]).map((p) => ({
      description: `${PROBLEM_LABELS[p] ?? p} — ${device} (pièce et main-d'œuvre)`,
      price: '',
    })),
  };
}

export default async function NewInvoicePage({ searchParams }: { searchParams: { diagnostic?: string } }) {
  const prefill = await prefillFromDiagnostic(searchParams.diagnostic);

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <Link href="/admin/factures" className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Toutes les factures
        </Link>
        <h1 className="mt-6 text-2xl font-medium tracking-tight text-ink">Nouvelle facture</h1>
        <p className="mt-1 text-sm text-ink-500">
          Le numéro (F-AAAA-0001…) et la date d&apos;émission sont attribués automatiquement. Une facture émise ne se
          modifie plus : en cas d&apos;erreur, on l&apos;annule par un avoir et on en refait une.
        </p>
        <div className="mt-8">
          <InvoiceForm prefill={prefill} today={todayParis()} />
        </div>
      </div>
    </>
  );
}
