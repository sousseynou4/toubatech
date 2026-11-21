'use client';

import { useActionState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/field';
import { submitQuote, type ActionResult } from '@/server/public-actions';
import { todayInDakar } from '@/lib/format';

const SERVICES = ['Maquillage mariée', 'Maquillage invitées', 'Soft glam', 'Full glam', 'Onglerie', 'Extensions de cils', 'Pose lace frontal', 'Coiffure', 'Essai maquillage'];

export function QuoteForm() {
  const [state, action, pending] = useActionState<ActionResult<{ reference: string }> | null, FormData>(submitQuote, null);
  if (state?.ok) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-powder-100"><Check className="size-7 text-rosewood" /></div>
        <h2 className="mt-4 font-display text-3xl">Demande reçue !</h2>
        <p className="mt-2 text-ink-soft">Référence : <strong className="font-mono">{state.data.reference}</strong>. Nous revenons vers vous rapidement avec une proposition.</p>
      </div>
    );
  }
  const f = state && !state.ok ? state.fields ?? {} : {};
  return (
    <form action={action} className="card grid gap-5 p-6 sm:p-8" encType="multipart/form-data">
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom et prénom" htmlFor="q-name" error={f.fullName}><Input id="q-name" name="fullName" required autoComplete="name" /></Field>
        <Field label="Téléphone / WhatsApp" htmlFor="q-phone" error={f.phone}><Input id="q-phone" name="phone" type="tel" required autoComplete="tel" /></Field>
        <Field label="Email (facultatif)" htmlFor="q-email" error={f.email}><Input id="q-email" name="email" type="email" /></Field>
        <Field label="Type d'événement" htmlFor="q-type" error={f.eventType}>
          <Select id="q-type" name="eventType" required defaultValue="mariage">
            <option value="mariage">Mariage</option><option value="bapteme">Baptême</option><option value="anniversaire">Anniversaire</option>
            <option value="ceremonie">Cérémonie</option><option value="domicile">Prestation à domicile</option><option value="autre">Autre</option>
          </Select>
        </Field>
        <Field label="Date de l'événement" htmlFor="q-date" error={f.eventDate}><Input id="q-date" name="eventDate" type="date" min={todayInDakar()} required /></Field>
        <Field label="Nombre de personnes" htmlFor="q-people" error={f.peopleCount}><Input id="q-people" name="peopleCount" type="number" min={1} max={200} defaultValue={1} required /></Field>
      </div>
      <Field label="Lieu (quartier, ville)" htmlFor="q-loc" error={f.eventLocation}><Input id="q-loc" name="eventLocation" required /></Field>
      <fieldset>
        <legend className="label">Prestations souhaitées</legend>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <label key={s} className="cursor-pointer rounded-full border border-line bg-white px-3.5 py-2 text-sm has-[:checked]:border-rosewood has-[:checked]:bg-powder-50 has-[:checked]:text-rosewood">
              <input type="checkbox" name="servicesWanted" value={s} className="sr-only" /> {s}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Budget indicatif en FCFA (facultatif)" htmlFor="q-budget" error={f.budgetHint}><Input id="q-budget" name="budgetHint" type="number" min={0} step={1000} inputMode="numeric" /></Field>
      <Field label="Votre message" htmlFor="q-msg" error={f.message}><Textarea id="q-msg" name="message" maxLength={2000} placeholder="Horaires, style recherché, demandes particulières…" /></Field>
      <Field label="Photos d'inspiration (facultatif, 5 max, 5 Mo chacune)" htmlFor="q-files" error={f.inspiration}>
        <Input id="q-files" name="inspiration" type="file" accept="image/jpeg,image/png,image/webp" multiple className="file:mr-3 file:rounded-full file:border-0 file:bg-powder-100 file:px-3 file:py-1.5 file:text-sm" />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>{pending && <Loader2 className="size-5 animate-spin" />} Envoyer ma demande de devis</Button>
      <p className="text-xs text-muted">Vos informations servent uniquement à établir votre devis. Voir notre politique de confidentialité.</p>
    </form>
  );
}
