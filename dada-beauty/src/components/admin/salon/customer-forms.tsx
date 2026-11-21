'use client';

import { useActionState, useTransition, useState } from 'react';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { adjustLoyalty, createCustomer, deleteCustomer, updateCustomer } from '@/server/admin/crm';
import type { FormState } from '@/server/admin/common';

export interface CustomerValues {
  id?: string; full_name: string; phone: string; email: string | null; birthday: string | null; preferences: string | null;
  internal_notes: string | null; marketing_consent: boolean; photo_consent: boolean;
  marketing_consent_at?: string | null; photo_consent_at?: string | null;
}

export function CustomerForm({ customer, readOnly }: { customer?: CustomerValues; readOnly?: boolean }) {
  const [state, action] = useActionState(customer?.id ? updateCustomer : createCustomer, null);
  const c = customer;
  return (
    <form action={action} className="grid gap-4">
      <FormFeedback state={state} />
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <fieldset disabled={readOnly} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom et prénom" htmlFor="cf-name"><Input id="cf-name" name="fullName" defaultValue={c?.full_name} required maxLength={120} /></Field>
          <Field label="Téléphone" htmlFor="cf-phone"><Input id="cf-phone" name="phone" type="tel" defaultValue={c?.phone} required /></Field>
          <Field label="Email (facultatif)" htmlFor="cf-email"><Input id="cf-email" name="email" type="email" defaultValue={c?.email ?? ''} /></Field>
          <Field label="Date d'anniversaire (facultatif)" htmlFor="cf-bd"><Input id="cf-bd" name="birthday" type="date" defaultValue={c?.birthday ?? ''} /></Field>
        </div>
        <Field label="Préférences" htmlFor="cf-pref" hint="Teintes, allergies, style apprécié… (visible par l'équipe)"><Textarea id="cf-pref" name="preferences" defaultValue={c?.preferences ?? ''} maxLength={2000} /></Field>
        <Field label="Notes internes" htmlFor="cf-notes"><Textarea id="cf-notes" name="internalNotes" defaultValue={c?.internal_notes ?? ''} maxLength={4000} /></Field>
        <div className="grid gap-3 rounded-2xl bg-powder-50 p-4 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="marketingConsent" defaultChecked={c?.marketing_consent} className="mt-0.5 size-4 accent-[var(--color-rosewood)]" />
            <span><strong>Consentement marketing</strong> — la cliente accepte de recevoir offres et nouveautés (WhatsApp, SMS, email).
              {c?.marketing_consent_at && <span className="block text-xs text-muted">Donné le {new Date(c.marketing_consent_at).toLocaleDateString('fr-FR')}</span>}</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="photoConsent" defaultChecked={c?.photo_consent} className="mt-0.5 size-4 accent-[var(--color-rosewood)]" />
            <span><strong>Consentement photo</strong> — la cliente autorise explicitement la publication de photos de ses réalisations (galerie, réseaux sociaux). Révocable à tout moment.
              {c?.photo_consent_at && <span className="block text-xs text-muted">Donné le {new Date(c.photo_consent_at).toLocaleDateString('fr-FR')}</span>}</span>
          </label>
        </div>
        {!readOnly && <SubmitButton className="justify-self-start">{c?.id ? 'Enregistrer' : 'Créer la fiche'}</SubmitButton>}
      </fieldset>
    </form>
  );
}

export function LoyaltyAdjustForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState(adjustLoyalty, null);
  return (
    <form action={action} className="grid gap-3" key={state?.ok ? 'done' : 'f'}>
      <FormFeedback state={state} />
      <input type="hidden" name="customerId" value={customerId} />
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <Input name="points" type="number" placeholder="± points" required aria-label="Points (négatif pour utiliser)" />
        <Input name="note" placeholder="Motif (ex. récompense utilisée)" required minLength={3} maxLength={300} aria-label="Motif" />
      </div>
      <SubmitButton size="sm" variant="outline" className="justify-self-start">Ajuster les points</SubmitButton>
    </form>
  );
}

export function DeleteCustomerButton({ id }: { id: string }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <FormFeedback state={state} />
      <Button variant="danger" size="sm" disabled={pending} onClick={() => {
        if (!confirm('Supprimer définitivement cette fiche cliente ? Cette action est irréversible.')) return;
        start(async () => setState(await deleteCustomer(id)));
      }}>Supprimer la fiche</Button>
    </div>
  );
}
