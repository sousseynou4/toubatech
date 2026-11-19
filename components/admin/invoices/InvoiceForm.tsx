'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, FileCheck2 } from 'lucide-react';
import {
  DEFAULT_WARRANTY,
  OPERATION_LABELS,
  PAYMENT_METHODS,
  eurosToCents,
  formatEuros,
  invoiceTotal,
  type InvoiceInput,
} from '@/lib/invoice';

export interface InvoicePrefill {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  device?: string;
  diagnostic_reference?: string;
  lines?: { description: string; price: string }[];
}

interface LineDraft {
  description: string;
  quantity: string;
  price: string; // en euros, tel que tapé
}

export function InvoiceForm({ prefill, today }: { prefill: InvoicePrefill; today: string }) {
  const router = useRouter();
  const [customerType, setCustomerType] = useState<InvoiceInput['customer_type']>('individual');
  const [f, setF] = useState({
    customer_name: prefill.customer_name ?? '',
    customer_company: '',
    customer_siren: '',
    customer_vat: '',
    customer_address: '',
    delivery_address: '',
    customer_email: prefill.customer_email ?? '',
    customer_phone: prefill.customer_phone ?? '',
    device: prefill.device ?? '',
    service_date: today,
    due_date: today,
    operation_type: 'services' as InvoiceInput['operation_type'],
    warranty: DEFAULT_WARRANTY,
    notes: '',
    payment_method: PAYMENT_METHODS[0],
  });
  const [payMode, setPayMode] = useState<'full' | 'deposit' | 'none'>('full');
  const [deposit, setDeposit] = useState('');
  const [lines, setLines] = useState<LineDraft[]>(
    prefill.lines?.length
      ? prefill.lines.map((l) => ({ description: l.description, quantity: '1', price: l.price }))
      : [{ description: '', quantity: '1', price: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));
  const setLine = (i: number, key: keyof LineDraft, value: string) =>
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, [key]: value } : l)));

  const parsedLines = lines.map((l) => ({
    description: l.description,
    quantity: Number.parseInt(l.quantity, 10),
    unit_price_cents: eurosToCents(l.price),
  }));
  const linesValid = parsedLines.every((l) => Number.isInteger(l.quantity) && l.quantity > 0 && Number.isFinite(l.unit_price_cents));
  const total = linesValid ? invoiceTotal(parsedLines) : NaN;
  const isPro = customerType === 'business';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!linesValid) return setError('Vérifiez les quantités et les prix des lignes.');
    const depositCents = eurosToCents(deposit);
    if (payMode === 'deposit' && !(depositCents > 0 && depositCents < total)) {
      return setError(`L'acompte doit être compris entre 0 et ${formatEuros(total)}.`);
    }
    const paidCents = payMode === 'full' ? total : payMode === 'deposit' ? depositCents : 0;
    const due = total - paidCents;
    if (!window.confirm(
      `Émettre la facture de ${formatEuros(total)}${due > 0 ? ` (reste dû par le client : ${formatEuros(due)})` : ' (payée)'} ?\n` +
      'Une fois émise, elle ne pourra plus être modifiée (seulement annulée par un avoir).'
    )) return;

    setSaving(true);
    const payload = {
      ...f,
      customer_type: customerType,
      customer_company: isPro ? f.customer_company : '',
      customer_siren: isPro ? f.customer_siren : '',
      customer_vat: isPro ? f.customer_vat : '',
      diagnostic_reference: prefill.diagnostic_reference ?? null,
      lines: parsedLines,
      initial_payment: paidCents > 0 ? { amount_cents: paidCents, method: f.payment_method } : null,
    };
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || 'Échec de l’émission de la facture.');
      router.push(`/admin/factures/${json.number}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Client">
        <div className="flex gap-2" role="radiogroup" aria-label="Type de client">
          {(['individual', 'business'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={customerType === t}
              onClick={() => setCustomerType(t)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                customerType === t ? 'bg-ink text-bone' : 'border border-ink/12 text-ink-500 hover:text-ink'
              }`}
            >
              {t === 'individual' ? 'Particulier' : 'Professionnel'}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={isPro ? 'Nom du contact' : 'Nom et prénom'} required>
            <input className={inputCls} value={f.customer_name} onChange={set('customer_name')} required maxLength={120} />
          </Field>
          {isPro && (
            <Field label="Raison sociale" required>
              <input className={inputCls} value={f.customer_company} onChange={set('customer_company')} required maxLength={160} />
            </Field>
          )}
          {isPro && (
            <Field label="SIREN du client" hint="obligatoire sur les factures entre pros">
              <input className={inputCls} value={f.customer_siren} onChange={set('customer_siren')} maxLength={20} inputMode="numeric" />
            </Field>
          )}
          {isPro && (
            <Field label="N° TVA intracommunautaire" hint="s'il en a un">
              <input className={inputCls} value={f.customer_vat} onChange={set('customer_vat')} maxLength={20} />
            </Field>
          )}
          <Field label="Email">
            <input type="email" className={inputCls} value={f.customer_email} onChange={set('customer_email')} maxLength={200} />
          </Field>
          <Field label="Téléphone">
            <input type="tel" className={inputCls} value={f.customer_phone} onChange={set('customer_phone')} maxLength={30} />
          </Field>
        </div>
        <Field label="Adresse de facturation" required>
          <textarea className={inputCls} rows={2} value={f.customer_address} onChange={set('customer_address')} required minLength={5} maxLength={400} placeholder="N° et rue, code postal, ville" />
        </Field>
        <Field label="Adresse de livraison" hint="seulement si différente (envoi d'un appareil)">
          <textarea className={inputCls} rows={2} value={f.delivery_address} onChange={set('delivery_address')} maxLength={400} />
        </Field>
      </Section>

      <Section title="Prestation">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Appareil concerné" hint="modèle, IMEI ou n° de série">
            <input className={inputCls} value={f.device} onChange={set('device')} maxLength={200} placeholder="iPhone 13 — IMEI 35…" />
          </Field>
          <Field label="Nature de l'opération" required>
            <select className={inputCls} value={f.operation_type} onChange={set('operation_type')}>
              {Object.entries(OPERATION_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Date de la prestation / vente" required>
            <input type="date" className={inputCls} value={f.service_date} onChange={set('service_date')} required />
          </Field>
          {prefill.diagnostic_reference && (
            <Field label="Dossier d'origine">
              <span className="block py-2.5 font-mono text-sm text-ink">{prefill.diagnostic_reference}</span>
            </Field>
          )}
        </div>

        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_70px_120px_110px_36px] gap-2 px-1 text-xs text-ink-400 sm:grid">
            <span>Désignation</span><span>Qté</span><span>Prix unitaire (€)</span><span className="text-right">Total</span><span />
          </div>
          {lines.map((l, i) => {
            const p = parsedLines[i];
            const ok = Number.isInteger(p.quantity) && Number.isFinite(p.unit_price_cents);
            return (
              <div key={i} className="grid grid-cols-[1fr_70px] gap-2 sm:grid-cols-[1fr_70px_120px_110px_36px]">
                <input aria-label="Désignation" className={inputCls} value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} required maxLength={300} placeholder="Remplacement écran OLED (pièce + main-d'œuvre)" />
                <input aria-label="Quantité" className={inputCls} value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} inputMode="numeric" required />
                <input aria-label="Prix unitaire en euros" className={inputCls} value={l.price} onChange={(e) => setLine(i, 'price', e.target.value)} inputMode="decimal" required placeholder="89,00" />
                <p className="self-center text-right font-mono text-sm text-ink">{ok ? formatEuros(p.quantity * p.unit_price_cents) : '—'}</p>
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                  disabled={lines.length === 1}
                  aria-label="Supprimer la ligne"
                  className="flex items-center justify-center rounded-lg text-ink-300 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { description: '', quantity: '1', price: '' }])}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
          </button>
          <p className="text-xs text-ink-400">Pour une remise, ajoutez une ligne avec un prix négatif (ex. -10).</p>
        </div>

        <div className="flex items-baseline justify-end gap-4 border-t border-ink/8 pt-4">
          <span className="text-sm text-ink-500">Net à payer</span>
          <span className="font-mono text-xl font-medium text-ink">{Number.isFinite(total) ? formatEuros(total) : '—'}</span>
        </div>

        <Field label="Garantie">
          <textarea className={inputCls} rows={2} value={f.warranty} onChange={set('warranty')} maxLength={500} />
        </Field>
        <Field label="Note sur la facture" hint="facultatif">
          <textarea className={inputCls} rows={2} value={f.notes} onChange={set('notes')} maxLength={1000} />
        </Field>
      </Section>

      <Section title="Paiement">
        <fieldset className="space-y-2">
          <legend className="sr-only">Le client a-t-il payé ?</legend>
          {([
            ['full', "Le client a tout payé aujourd'hui"],
            ['deposit', "Le client a versé un acompte, il doit encore le reste"],
            ['none', "Le client n'a rien payé pour l'instant"],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="payMode" checked={payMode === value} onChange={() => setPayMode(value)} className="h-4 w-4 accent-[#339966]" />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {payMode === 'deposit' && (
            <Field label="Montant de l'acompte (€)" required>
              <input className={inputCls} value={deposit} onChange={(e) => setDeposit(e.target.value)} inputMode="decimal" required placeholder="50,00" />
            </Field>
          )}
          {payMode !== 'none' && (
            <Field label="Mode de règlement" required>
              <select className={inputCls} value={f.payment_method} onChange={set('payment_method')}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
          )}
          {payMode !== 'full' && (
            <Field label="Le client doit payer le reste avant le" required hint="aujourd'hui = à réception">
              <input type="date" className={inputCls} value={f.due_date} min={today} onChange={set('due_date')} required />
            </Field>
          )}
        </div>
        {payMode === 'deposit' && Number.isFinite(total) && eurosToCents(deposit) > 0 && (
          <p className="text-sm text-ink">
            Reste dû par le client : <strong className="font-mono">{formatEuros(total - eurosToCents(deposit))}</strong>
          </p>
        )}
      </Section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-bone transition-all hover:bg-ink-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
          Émettre la facture
        </button>
      </div>
    </form>
  );
}

const inputCls = 'w-full rounded-xl border border-ink/12 bg-bone px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-bone p-6">
      <h2 className="text-[15px] font-medium tracking-tight text-ink">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-1.5 text-xs font-medium text-ink">
        {label}
        {required && <span className="text-emerald">*</span>}
        {hint && <span className="font-normal text-ink-400">— {hint}</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
