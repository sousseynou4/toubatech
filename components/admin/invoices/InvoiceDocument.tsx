import { OPERATION_LABELS, formatDateFr, formatEuros, lineTotal, type InvoiceRow } from '@/lib/invoice';

/**
 * La facture telle qu'elle est imprimée / enregistrée en PDF.
 * Mentions obligatoires : art. L441-9 et R441-5 C. com., art. 242 nonies A annexe II CGI.
 */
export function InvoiceDocument({
  invoice: inv,
  original,
}: {
  invoice: InvoiceRow;
  /** Facture annulée, quand le document est un avoir. */
  original?: { number: string; issue_date: string } | null;
}) {
  const s = inv.seller;
  const isCredit = inv.kind === 'credit_note';
  const isPro = inv.customer_type === 'business';

  return (
    <article className="mx-auto max-w-[210mm] bg-white p-8 text-[13px] leading-relaxed text-graphite shadow-soft md:p-12 print:max-w-none print:p-0 print:shadow-none">
      {/* En-tête */}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink/15 pb-6">
        <div>
          <p className="text-xl font-semibold tracking-tight text-ink">
            TOUBA <span className="text-emerald">TECH</span>
          </p>
          <p className="mt-2">{s.legalName}</p>
          <p>{s.address}</p>
          <p>SIRET {s.siret}</p>
          <p className="text-ink-400">{s.status}</p>
          <p className="mt-1">{s.phone} · {s.email} · {s.website}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold uppercase tracking-wide text-ink">{isCredit ? 'Avoir' : 'Facture'}</p>
          <p className="mt-1 font-mono text-[15px]">N° {inv.number}</p>
          <div className="mt-3 space-y-0.5">
            <Row label="Date d'émission" value={formatDateFr(inv.issue_date)} />
            <Row label={inv.operation_type === 'goods' ? 'Date de la vente' : 'Date de la prestation'} value={formatDateFr(inv.service_date)} />
            {!isCredit && <Row label="Échéance" value={inv.due_date <= inv.issue_date ? 'À réception' : formatDateFr(inv.due_date)} />}
          </div>
        </div>
      </header>

      {/* Parties */}
      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">{isCredit ? 'Client' : 'Facturé à'}</p>
          {inv.customer_company && <p className="mt-1 font-medium">{inv.customer_company}</p>}
          <p className={inv.customer_company ? '' : 'mt-1 font-medium'}>{inv.customer_name}</p>
          <p className="whitespace-pre-line">{inv.customer_address}</p>
          {inv.customer_siren && <p>SIREN {inv.customer_siren}</p>}
          {inv.customer_vat && <p>TVA intracom. {inv.customer_vat}</p>}
          {(inv.customer_email || inv.customer_phone) && (
            <p className="text-ink-400">{[inv.customer_email, inv.customer_phone].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="space-y-1">
          {inv.delivery_address && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">Adresse de livraison</p>
              <p className="mt-1 whitespace-pre-line">{inv.delivery_address}</p>
            </div>
          )}
          <Row label="Nature de l'opération" value={OPERATION_LABELS[inv.operation_type]} />
          {inv.device && <Row label="Appareil" value={inv.device} />}
          {inv.diagnostic_reference && <Row label="Dossier" value={inv.diagnostic_reference} />}
          {isCredit && original && (
            <Row label="Annule la facture" value={`N° ${original.number} du ${formatDateFr(original.issue_date)}`} />
          )}
        </div>
      </section>

      {/* Lignes */}
      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-ink text-left text-[11px] uppercase tracking-wider text-ink">
            <th className="py-2 pr-2 font-medium">Désignation</th>
            <th className="w-12 py-2 text-right font-medium">Qté</th>
            <th className="w-28 py-2 text-right font-medium">P.U. HT</th>
            <th className="w-28 py-2 text-right font-medium">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={i} className="border-b border-ink/10 align-top">
              <td className="py-2 pr-2">{l.description}</td>
              <td className="py-2 text-right font-mono">{l.quantity}</td>
              <td className="py-2 text-right font-mono">{formatEuros(l.unit_price_cents)}</td>
              <td className="py-2 text-right font-mono">{formatEuros(lineTotal(l))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <section className="mt-4 flex justify-end">
        <div className="w-72 space-y-1">
          <Row label="Total HT" value={formatEuros(inv.total_cents)} mono />
          <div className="flex justify-between border-t-2 border-ink pt-2 text-[15px] font-semibold text-ink">
            <span>{isCredit ? 'Montant de l’avoir' : 'Net à payer'}</span>
            <span className="font-mono">{formatEuros(inv.total_cents)}</span>
          </div>
          <p className="pt-1 text-right text-[11px] italic">{inv.vat_mention}</p>
        </div>
      </section>

      {/* Paiement */}
      <section className="mt-8 space-y-1 border-t border-ink/15 pt-5 text-[12px]">
        {inv.paid_at ? (
          <p className="font-medium text-emerald-600">
            {isCredit ? 'Remboursé' : 'Facture acquittée'} le {formatDateFr(inv.paid_at)} — {inv.payment_method}.
          </p>
        ) : (
          !isCredit && (
            <p>
              Conditions de paiement :{' '}
              {inv.due_date <= inv.issue_date ? 'paiement à réception de la facture' : `à régler au plus tard le ${formatDateFr(inv.due_date)}`}.
              
            </p>
          )
        )}
        {!isCredit && isPro && (
          <p className="text-ink-500">
            Pas d’escompte pour paiement anticipé. En cas de retard de paiement : pénalités au taux de trois fois le
            taux d’intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 C. com.).
          </p>
        )}
        {inv.warranty && <p>{inv.warranty}</p>}
        {inv.notes && <p className="whitespace-pre-line">{inv.notes}</p>}
      </section>

      <footer className="mt-10 text-center text-[10px] text-ink-400">
        {s.tradeName} — {s.legalName} — {s.address} — SIRET {s.siret} — {inv.vat_mention}
      </footer>
    </article>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-400">{label}</span>
      <span className={`text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
