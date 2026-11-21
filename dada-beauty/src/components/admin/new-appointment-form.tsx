'use client';

import { useActionState } from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { CustomerPicker } from './customer-picker';
import { FormFeedback, SubmitButton } from './form-bits';
import { createAppointment } from '@/server/admin/appointments';
import { formatDuration, formatPrice, todayInDakar } from '@/lib/format';

export function NewAppointmentForm({ services, employees }: {
  services: { id: string; name: string; price: number | null; duration_minutes: number | null; category: { name: string } | null }[];
  employees: { id: string; display_name: string }[];
}) {
  const [state, action] = useActionState(createAppointment, null);
  return (
    <form action={action} className="grid gap-5">
      <FormFeedback state={state} />
      <fieldset><legend className="label">Cliente</legend><CustomerPicker /></fieldset>
      <fieldset>
        <legend className="label">Prestations</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => {
            const configured = s.price !== null && s.duration_minutes !== null;
            return (
              <label key={s.id} className={`flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-sm has-[:checked]:border-rosewood has-[:checked]:bg-powder-50 ${configured ? '' : 'opacity-50'}`}>
                <input type="checkbox" name="serviceIds" value={s.id} disabled={!configured} className="accent-[var(--color-rosewood)]" />
                <span className="flex-1">{s.name}<span className="block text-xs text-muted">{configured ? `${formatPrice(s.price)} · ${formatDuration(s.duration_minutes)}` : 'Prix/durée à configurer'}</span></span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Employée" htmlFor="na-emp"><Select id="na-emp" name="employeeId" required defaultValue=""><option value="" disabled>Choisir…</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.display_name}</option>)}</Select></Field>
        <Field label="Date" htmlFor="na-date"><Input id="na-date" type="date" name="date" defaultValue={todayInDakar()} required /></Field>
        <Field label="Heure" htmlFor="na-time"><Input id="na-time" type="time" name="time" step={300} required /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Origine" htmlFor="na-src"><Select id="na-src" name="source" defaultValue="phone"><option value="phone">Téléphone</option><option value="whatsapp">WhatsApp</option><option value="walk_in">Sur place</option><option value="admin">Autre</option></Select></Field>
        <Field label="Statut" htmlFor="na-status"><Select id="na-status" name="status" defaultValue="confirmed"><option value="confirmed">Confirmé</option><option value="pending">En attente</option></Select></Field>
      </div>
      <Field label="Notes internes" htmlFor="na-notes"><Textarea id="na-notes" name="notes" maxLength={2000} /></Field>
      <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" name="ignoreHours" className="accent-[var(--color-rosewood)]" /> Ignorer les congés de l&apos;employée (les chevauchements restent interdits)</label>
      <SubmitButton>Créer le rendez-vous</SubmitButton>
    </form>
  );
}
