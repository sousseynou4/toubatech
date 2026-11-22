'use client';

import { useActionState, useState, useTransition } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormFeedback, SubmitButton } from './form-bits';
import { logManualMessage, recordPayment, rescheduleAppointment, saveAppointmentNotes, setAppointmentStatus } from '@/server/admin/appointments';
import type { FormState } from '@/server/admin/common';
import type { AppointmentStatus } from '@/lib/types';
import { whatsappLink } from '@/lib/phone';

const NEXT: Record<AppointmentStatus, { to: AppointmentStatus; label: string; variant: 'primary' | 'outline' | 'danger'; full: boolean; reason?: boolean }[]> = {
  pending: [{ to: 'confirmed', label: 'Confirmer', variant: 'primary', full: true }, { to: 'in_progress', label: 'Démarrer', variant: 'outline', full: false }, { to: 'cancelled', label: 'Annuler', variant: 'danger', full: true, reason: true }, { to: 'no_show', label: 'Absente', variant: 'outline', full: true }],
  confirmed: [{ to: 'in_progress', label: 'Démarrer', variant: 'primary', full: false }, { to: 'cancelled', label: 'Annuler', variant: 'danger', full: true, reason: true }, { to: 'no_show', label: 'Absente', variant: 'outline', full: true }],
  deposit_paid: [{ to: 'in_progress', label: 'Démarrer', variant: 'primary', full: false }, { to: 'cancelled', label: 'Annuler', variant: 'danger', full: true, reason: true }, { to: 'no_show', label: 'Absente', variant: 'outline', full: true }],
  in_progress: [{ to: 'completed', label: 'Terminer', variant: 'primary', full: false }],
  completed: [], cancelled: [], no_show: [],
};

export function StatusActions({ id, status, canManage, canOwn }: { id: string; status: AppointmentStatus; canManage: boolean; canOwn: boolean }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  const actions = NEXT[status].filter((a) => (a.full ? canManage : canManage || canOwn));
  if (!actions.length) return <p className="text-sm text-muted">Aucune action disponible pour ce statut.</p>;
  return (
    <div className="grid gap-3">
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.to} size="sm" variant={a.variant} disabled={pending} onClick={() => {
            let reason: string | undefined;
            if (a.reason) { const r = prompt('Motif de l\'annulation ?'); if (r === null) return; reason = r; }
            else if (a.to === 'no_show' && !confirm('Marquer la cliente comme absente ?')) return;
            start(async () => setState(await setAppointmentStatus(id, a.to, reason)));
          }}>{a.label}</Button>
        ))}
      </div>
    </div>
  );
}

export function RescheduleForm({ id, employees, defaultDate, defaultTime }: { id: string; employees: { id: string; display_name: string }[]; defaultDate: string; defaultTime: string }) {
  const [state, action] = useActionState(rescheduleAppointment, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nouvelle date" htmlFor="rs-date"><Input id="rs-date" type="date" name="date" defaultValue={defaultDate} required /></Field>
        <Field label="Heure" htmlFor="rs-time"><Input id="rs-time" type="time" name="time" step={300} defaultValue={defaultTime} required /></Field>
      </div>
      <Field label="Employée" htmlFor="rs-emp"><Select id="rs-emp" name="employeeId" defaultValue=""><option value="">Inchangée</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.display_name}</option>)}</Select></Field>
      <Field label="Motif (facultatif)" htmlFor="rs-reason"><Input id="rs-reason" name="reason" maxLength={500} /></Field>
      <SubmitButton size="sm" variant="outline">Reporter</SubmitButton>
    </form>
  );
}

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [state, action] = useActionState(saveAppointmentNotes, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={id} />
      <Textarea name="notes" defaultValue={notes} maxLength={4000} aria-label="Notes internes" placeholder="Notes visibles uniquement par l'équipe" />
      <SubmitButton size="sm" variant="outline">Enregistrer les notes</SubmitButton>
    </form>
  );
}

export function PaymentForm({ appointmentId, orderId, remaining, depositDue, cashOpen }: { appointmentId?: string; orderId?: string; remaining: number; depositDue: number; cashOpen: boolean }) {
  const [state, action] = useActionState(recordPayment, null);
  const [key] = useState(() => crypto.randomUUID());
  const [method, setMethod] = useState('cash');
  if (remaining <= 0) return <Alert tone="success">Entièrement réglé.</Alert>;
  return (
    <form action={action} className="grid gap-3" key={state?.ok ? 'done' : 'form'}>
      <FormFeedback state={state} />
      {appointmentId && <input type="hidden" name="appointmentId" value={appointmentId} />}
      {orderId && <input type="hidden" name="orderId" value={orderId} />}
      <input type="hidden" name="idempotencyKey" value={state?.ok ? crypto.randomUUID() : key} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant (FCFA)" htmlFor="p-amount"><Input id="p-amount" name="amount" type="number" min={1} max={remaining} defaultValue={depositDue > 0 ? depositDue : remaining} required inputMode="numeric" /></Field>
        <Field label="Type" htmlFor="p-kind"><Select id="p-kind" name="kind" defaultValue={appointmentId ? (depositDue > 0 ? 'deposit' : 'balance') : 'full'}>
          {appointmentId ? <><option value="deposit">Acompte</option><option value="balance">Solde</option></> : <option value="full">Paiement</option>}
        </Select></Field>
      </div>
      <Field label="Moyen de paiement" htmlFor="p-method"><Select id="p-method" name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="cash">Espèces</option><option value="wave">Wave (reçu et vérifié)</option><option value="orange_money">Orange Money (reçu et vérifié)</option><option value="card">Carte</option><option value="bank_transfer">Virement</option><option value="gift_card">Carte cadeau</option><option value="other">Autre</option>
      </Select></Field>
      {method === 'gift_card'
        ? <Field label="Code de la carte cadeau" htmlFor="p-ref" hint="Le solde est vérifié et débité automatiquement."><Input id="p-ref" name="providerReference" maxLength={20} required className="font-mono uppercase" autoComplete="off" /></Field>
        : method !== 'cash' && <Field label="Référence de transaction" htmlFor="p-ref" hint="Numéro de transaction visible dans l'application Wave / Orange Money"><Input id="p-ref" name="providerReference" maxLength={120} /></Field>}
      {method === 'cash' && !cashOpen && <Alert tone="warning">La caisse est fermée : ouvrez-la dans le module Caisse pour encaisser des espèces.</Alert>}
      <Field label="Note (facultatif)" htmlFor="p-note"><Input id="p-note" name="note" maxLength={500} /></Field>
      <p className="text-xs text-muted">Reste dû : {new Intl.NumberFormat('fr-FR').format(remaining)} FCFA</p>
      <SubmitButton size="sm">Enregistrer le paiement</SubmitButton>
    </form>
  );
}

/** Messages WhatsApp pré-remplis (envoi manuel depuis le téléphone de l'équipe, tracé dans le journal). */
export function WhatsAppTemplates({ phone, messages, appointmentId, orderId, customerId, apiConfigured }: {
  phone: string; messages: { key: string; label: string; body: string }[]; appointmentId?: string; orderId?: string; customerId?: string; apiConfigured: boolean;
}) {
  return (
    <div className="grid gap-2">
      {!apiConfigured && <p className="text-xs text-muted">WhatsApp Business API non connectée : les messages s&apos;ouvrent dans WhatsApp, prêts à être envoyés.</p>}
      {messages.map((m) => (
        <a key={m.key} href={whatsappLink(m.body, phone)} target="_blank" rel="noopener noreferrer"
          onClick={() => { void logManualMessage({ appointmentId, orderId, customerId, recipient: phone, template: m.key, body: m.body }); }}
          className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:border-[#25D366] hover:bg-[#25D366]/5">
          <MessageCircle className="size-4 text-[#128C4B]" />{m.label}
        </a>
      ))}
    </div>
  );
}
