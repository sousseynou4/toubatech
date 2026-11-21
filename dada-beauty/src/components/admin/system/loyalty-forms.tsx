'use client';

import { useActionState, useState, useTransition } from 'react';
import { Field, Input, Select } from '@/components/ui/field';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { createGiftCard, deletePromotion, savePromotion, setGiftCardActive, togglePromotion } from '@/server/admin/loyalty';
import type { FormState } from '@/server/admin/common';

export function PromotionForm() {
  const [state, action] = useActionState(savePromotion, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code" htmlFor="pr-code"><Input id="pr-code" name="code" required maxLength={30} className="uppercase" placeholder="TABASKI2027" /></Field>
        <Field label="Description" htmlFor="pr-desc"><Input id="pr-desc" name="description" maxLength={300} /></Field>
        <Field label="Type de remise" htmlFor="pr-type"><Select id="pr-type" name="discount_type" defaultValue="percent"><option value="percent">Pourcentage</option><option value="fixed">Montant fixe (FCFA)</option></Select></Field>
        <Field label="Valeur" htmlFor="pr-val"><Input id="pr-val" name="discount_value" type="number" min={1} required /></Field>
        <Field label="Montant minimum (FCFA)" htmlFor="pr-min"><Input id="pr-min" name="min_amount" type="number" min={0} defaultValue={0} /></Field>
        <Field label="S'applique à" htmlFor="pr-app"><Select id="pr-app" name="applies_to" defaultValue="all"><option value="all">Tout</option><option value="services">Prestations</option><option value="products">Produits</option></Select></Field>
        <Field label="Début" htmlFor="pr-start"><Input id="pr-start" name="starts_at" type="date" /></Field>
        <Field label="Fin" htmlFor="pr-end"><Input id="pr-end" name="ends_at" type="date" /></Field>
        <Field label="Utilisations max." htmlFor="pr-max"><Input id="pr-max" name="max_uses" type="number" min={1} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked className="accent-[var(--color-rosewood)]" /> Active</label>
      <div><SubmitButton size="sm">Créer la promotion</SubmitButton></div>
    </form>
  );
}

export function PromotionRowActions({ id, active }: { id: string; active: boolean }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex items-center gap-3 text-xs">
      <button disabled={pending} className="text-rosewood" onClick={() => start(async () => setState(await togglePromotion(id, !active)))}>{active ? 'Désactiver' : 'Activer'}</button>
      <button disabled={pending} className="text-danger" onClick={() => { if (confirm('Supprimer cette promotion ?')) start(async () => setState(await deletePromotion(id))); }}>Supprimer</button>
      {state?.error && <span className="text-danger">{state.error}</span>}
    </span>
  );
}

export function GiftCardForm() {
  const [state, action] = useActionState(createGiftCard, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Montant (FCFA)" htmlFor="gc-amount"><Input id="gc-amount" name="amount" type="number" min={1000} step={500} required /></Field>
        <Field label="Bénéficiaire" htmlFor="gc-name"><Input id="gc-name" name="recipient_name" maxLength={120} /></Field>
        <Field label="Expire le" htmlFor="gc-exp"><Input id="gc-exp" name="expires_on" type="date" /></Field>
      </div>
      <div><SubmitButton size="sm">Créer la carte cadeau</SubmitButton></div>
    </form>
  );
}

export function GiftCardToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>(null);
  return (
    <span className="text-xs">
      <button disabled={pending} className={active ? 'text-danger' : 'text-rosewood'} onClick={() => start(async () => setState(await setGiftCardActive(id, !active)))}>{active ? 'Désactiver' : 'Réactiver'}</button>
      {state?.error && <span className="ml-2 text-danger">{state.error}</span>}
    </span>
  );
}
