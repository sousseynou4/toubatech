'use client';

import { useActionState, useState } from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { recordStockMovement, saveSupplier } from '@/server/admin/commerce';
import { useResetOnSuccess } from './use-reset';

export function StockMovementForm({ variants, suppliers, defaultVariant }: {
  variants: { id: string; label: string; stock: number }[]; suppliers: { id: string; name: string }[]; defaultVariant?: string;
}) {
  const [state, action] = useActionState(recordStockMovement, null);
  const [reason, setReason] = useState('purchase');
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <Field label="Produit / variante" htmlFor="sm-v">
        <Select id="sm-v" name="variant_id" defaultValue={defaultVariant ?? ''} required>
          <option value="" disabled>Choisir…</option>
          {variants.map((v) => <option key={v.id} value={v.id}>{v.label} (stock : {v.stock})</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type de mouvement" htmlFor="sm-r">
          <Select id="sm-r" name="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="purchase">Réception fournisseur (+)</option><option value="initial">Stock initial (+)</option><option value="return">Retour client (+)</option>
            <option value="adjustment">Ajustement d&apos;inventaire (±)</option><option value="loss">Perte / casse (−)</option>
          </Select>
        </Field>
        <Field label="Quantité" htmlFor="sm-q"><Input id="sm-q" name="quantity" type="number" min={1} required inputMode="numeric" /></Field>
      </div>
      {reason === 'adjustment' && (
        <Field label="Sens" htmlFor="sm-dir"><Select id="sm-dir" name="direction" defaultValue="out"><option value="in">Ajouter au stock</option><option value="out">Retirer du stock</option></Select></Field>
      )}
      {reason === 'purchase' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Coût unitaire (FCFA)" htmlFor="sm-c" hint="Met à jour le prix d'achat"><Input id="sm-c" name="unit_cost" type="number" min={0} inputMode="numeric" /></Field>
          <Field label="Fournisseur" htmlFor="sm-s"><Select id="sm-s" name="supplier_id" defaultValue=""><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        </div>
      )}
      <Field label={reason === 'adjustment' || reason === 'loss' ? 'Motif (obligatoire)' : 'Note'} htmlFor="sm-n">
        <Input id="sm-n" name="note" maxLength={500} required={reason === 'adjustment' || reason === 'loss'} minLength={reason === 'adjustment' || reason === 'loss' ? 3 : undefined} />
      </Field>
      <SubmitButton size="sm">Enregistrer le mouvement</SubmitButton>
      <p className="text-xs text-muted">Chaque mouvement est définitif et historisé : une erreur se corrige par un nouveau mouvement.</p>
    </form>
  );
}

interface SupplierValues { id?: string; name?: string; contact_name?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; is_active?: boolean }

export function SupplierForm({ supplier }: { supplier?: SupplierValues }) {
  const [state, action] = useActionState(saveSupplier, null);
  const s = supplier ?? {};
  const ref = useResetOnSuccess(s.id ? null : state);
  return (
    <form ref={ref} action={action} className="grid gap-3">
      <FormFeedback state={state} />
      {s.id && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom" htmlFor={`su-n-${s.id ?? 'n'}`}><Input id={`su-n-${s.id ?? 'n'}`} name="name" defaultValue={s.name} required /></Field>
        <Field label="Contact" htmlFor={`su-c-${s.id ?? 'n'}`}><Input id={`su-c-${s.id ?? 'n'}`} name="contact_name" defaultValue={s.contact_name ?? ''} /></Field>
        <Field label="Téléphone" htmlFor={`su-p-${s.id ?? 'n'}`}><Input id={`su-p-${s.id ?? 'n'}`} name="phone" type="tel" defaultValue={s.phone ?? ''} /></Field>
        <Field label="Email" htmlFor={`su-e-${s.id ?? 'n'}`}><Input id={`su-e-${s.id ?? 'n'}`} name="email" type="email" defaultValue={s.email ?? ''} /></Field>
      </div>
      <Field label="Adresse" htmlFor={`su-a-${s.id ?? 'n'}`}><Input id={`su-a-${s.id ?? 'n'}`} name="address" defaultValue={s.address ?? ''} /></Field>
      <Field label="Notes" htmlFor={`su-no-${s.id ?? 'n'}`}><Textarea id={`su-no-${s.id ?? 'n'}`} name="notes" defaultValue={s.notes ?? ''} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={s.is_active ?? true} className="accent-[var(--color-rosewood)]" /> Actif</label>
      <div><SubmitButton size="sm" variant="outline">{s.id ? 'Mettre à jour' : 'Ajouter le fournisseur'}</SubmitButton></div>
    </form>
  );
}
