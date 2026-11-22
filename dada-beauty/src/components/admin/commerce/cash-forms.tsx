'use client';

import { useActionState } from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { cashMovement, closeCashSession, openCashSession, recordExpense, refundPayment } from '@/server/admin/finance';
import { EXPENSE_CATEGORY_LABEL, MANUAL_METHODS } from './labels';
import { todayInDakar } from '@/lib/format';
import { useResetOnSuccess } from './use-reset';

export function OpenCashForm() {
  const [state, action] = useActionState(openCashSession, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <Field label="Fond de caisse (FCFA)" htmlFor="oc-f" hint="Espèces présentes dans le tiroir à l'ouverture"><Input id="oc-f" name="opening_float" type="number" min={0} defaultValue={0} inputMode="numeric" required /></Field>
      <Field label="Note" htmlFor="oc-n"><Input id="oc-n" name="notes" maxLength={500} /></Field>
      <SubmitButton>Ouvrir la caisse</SubmitButton>
    </form>
  );
}

export function CloseCashForm({ sessionId, expected }: { sessionId: string; expected: number }) {
  const [state, action] = useActionState(closeCashSession, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <input type="hidden" name="session_id" value={sessionId} />
      <p className="text-sm text-ink-soft">Espèces attendues : <strong>{new Intl.NumberFormat('fr-FR').format(expected)} FCFA</strong></p>
      <Field label="Espèces comptées (FCFA)" htmlFor="cc-c"><Input id="cc-c" name="counted_cash" type="number" min={0} inputMode="numeric" required /></Field>
      <Field label="Commentaire" htmlFor="cc-n"><Input id="cc-n" name="notes" maxLength={500} /></Field>
      <SubmitButton variant="outline" onClick={(e) => { if (!confirm('Clôturer la caisse ? Cette action est définitive.')) e.preventDefault(); }}>Clôturer la caisse</SubmitButton>
    </form>
  );
}

export function CashMovementForm() {
  const [state, action] = useActionState(cashMovement, null);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" htmlFor="cm-t"><Select id="cm-t" name="category" defaultValue="withdrawal"><option value="withdrawal">Retrait (dépôt banque…)</option><option value="top_up">Apport de monnaie</option></Select></Field>
        <Field label="Montant (FCFA)" htmlFor="cm-a"><Input id="cm-a" name="amount" type="number" min={1} inputMode="numeric" required /></Field>
      </div>
      <Field label="Motif" htmlFor="cm-n"><Input id="cm-n" name="note" required minLength={3} maxLength={300} /></Field>
      <SubmitButton size="sm" variant="outline">Enregistrer</SubmitButton>
    </form>
  );
}

export function ExpenseForm({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const [state, action] = useActionState(recordExpense, null);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <Field label="Libellé" htmlFor="ex-l"><Input id="ex-l" name="label" required maxLength={200} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie" htmlFor="ex-c"><Select id="ex-c" name="category" defaultValue="consumables">{Object.entries(EXPENSE_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Montant (FCFA)" htmlFor="ex-a"><Input id="ex-a" name="amount" type="number" min={1} inputMode="numeric" required /></Field>
        <Field label="Payé par" htmlFor="ex-m" hint="Espèces : sortie de caisse (caisse ouverte requise)"><Select id="ex-m" name="method" defaultValue="cash">{MANUAL_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Date" htmlFor="ex-d"><Input id="ex-d" name="spent_on" type="date" defaultValue={todayInDakar()} max={todayInDakar()} /></Field>
      </div>
      <Field label="Fournisseur" htmlFor="ex-s"><Select id="ex-s" name="supplier_id" defaultValue=""><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Notes" htmlFor="ex-n"><Textarea id="ex-n" name="notes" maxLength={1000} /></Field>
      <SubmitButton size="sm">Enregistrer la dépense</SubmitButton>
    </form>
  );
}

export function RefundForm({ paymentId, max }: { paymentId: string; max: number }) {
  const [state, action] = useActionState(refundPayment, null);
  if (state?.ok) return <FormFeedback state={state} />;
  return (
    <form action={action} className="grid gap-2 rounded-xl bg-powder-50 p-3">
      <FormFeedback state={state} />
      <input type="hidden" name="payment_id" value={paymentId} />
      <div className="grid grid-cols-2 gap-2">
        <Input name="amount" type="number" min={1} max={max} defaultValue={max} inputMode="numeric" aria-label="Montant à rembourser" required />
        <Input name="reason" placeholder="Motif" required minLength={3} maxLength={500} aria-label="Motif du remboursement" />
      </div>
      <SubmitButton size="sm" variant="danger">Rembourser</SubmitButton>
    </form>
  );
}
