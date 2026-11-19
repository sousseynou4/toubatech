'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Printer, Undo2, CheckCircle2 } from 'lucide-react';
import { PAYMENT_METHODS, eurosToCents, formatEuros } from '@/lib/invoice';

interface Props {
  id: string;
  number: string;
  isCreditNote: boolean;
  /** Reste dû par le client (ou à rembourser sur un avoir), en centimes ; 0 = rien à enregistrer. */
  remaining: number;
  canCreditNote: boolean;
  today: string;
}

export function InvoiceActions({ id, number, isCreditNote, remaining, canCreditNote, today }: Props) {
  const router = useRouter();
  const [paidAt, setPaidAt] = useState(today);
  const [amount, setAmount] = useState((remaining / 100).toFixed(2).replace('.', ','));
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [busy, setBusy] = useState<'pay' | 'credit' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(kind: 'pay' | 'credit', url: string, body: unknown) {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || 'Opération refusée.');
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function recordPayment() {
    const cents = eurosToCents(amount);
    if (!(cents > 0 && cents <= remaining)) {
      return setError(`Le montant doit être compris entre 0 et ${formatEuros(remaining)}.`);
    }
    const ok = await call('pay', `/api/admin/invoices/${id}`, { paid_at: paidAt, amount_cents: cents, payment_method: method });
    if (ok) {
      setAmount(((remaining - cents) / 100).toFixed(2).replace('.', ','));
      router.refresh();
    }
  }

  async function creditNote() {
    if (!window.confirm(`Annuler la facture ${number} par un avoir du même montant ?\nCette opération est définitive.`)) return;
    const json = await call('credit', '/api/admin/invoices', { credit_note_for: id });
    if (json?.number) router.push(`/admin/factures/${json.number}`);
  }

  const btn = 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50';
  const field = 'mt-1 block rounded-lg border border-ink/12 bg-bone px-3 py-2 text-sm text-ink';

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => window.print()} className={`${btn} bg-ink text-bone hover:bg-ink-700`}>
          <Printer className="h-4 w-4" /> Imprimer / PDF
        </button>
        {canCreditNote && (
          <button type="button" onClick={creditNote} disabled={busy !== null} className={`${btn} border border-ink/12 text-ink-600 hover:border-red-300 hover:text-red-700`}>
            {busy === 'credit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
            Annuler par un avoir
          </button>
        )}
      </div>

      {remaining > 0 && (
        <div className="rounded-2xl border border-ink/10 bg-bone p-4">
          <p className="text-sm text-ink">
            {isCreditNote ? 'Reste à rembourser' : 'Le client doit encore'} :{' '}
            <strong className="font-mono">{formatEuros(remaining)}</strong>
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-xs text-ink-500">
              {isCreditNote ? 'Remboursé le' : 'Reçu le'}
              <input type="date" value={paidAt} max={today} onChange={(e) => setPaidAt(e.target.value)} className={field} />
            </label>
            <label className="text-xs text-ink-500">
              Montant (€)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={`${field} w-28`} />
            </label>
            <label className="text-xs text-ink-500">
              Mode
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={field}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <button type="button" onClick={recordPayment} disabled={busy !== null || !paidAt} className={`${btn} bg-emerald text-bone hover:bg-emerald-500`}>
              {busy === 'pay' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isCreditNote ? 'Enregistrer le remboursement' : 'Enregistrer le règlement'}
            </button>
          </div>
          {!isCreditNote && <p className="mt-2 text-xs text-ink-400">Paiement en plusieurs fois : saisissez seulement la somme reçue.</p>}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
