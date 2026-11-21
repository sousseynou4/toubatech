'use client';

import { useActionState, useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { addTimeOff, createEmployee, deleteTimeOff, inviteMember, saveSchedule, setEmployeeServices, updateEmployee, updateProfile } from '@/server/admin/team';
import type { FormState } from '@/server/admin/common';
import { WEEKDAYS_FR, todayInDakar } from '@/lib/format';
import { ROLE_LABEL, type AppRole } from '@/lib/types';

export interface EmployeeValues {
  id?: string; display_name: string; full_name: string | null; phone: string | null; email: string | null; bio: string | null;
  specialties: string[]; color: string; is_active: boolean; accepts_online_booking: boolean; sort_order: number;
}

export function EmployeeForm({ employee }: { employee?: EmployeeValues }) {
  const [state, action] = useActionState(employee?.id ? updateEmployee : createEmployee, null);
  const e = employee;
  return (
    <form action={action} className="grid gap-4">
      <FormFeedback state={state} />
      {e?.id && <input type="hidden" name="id" value={e.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom affiché (clientes)" htmlFor="ef-dn"><Input id="ef-dn" name="displayName" defaultValue={e?.display_name} required maxLength={80} /></Field>
        <Field label="Nom complet" htmlFor="ef-fn"><Input id="ef-fn" name="fullName" defaultValue={e?.full_name ?? ''} maxLength={120} /></Field>
        <Field label="Téléphone" htmlFor="ef-ph"><Input id="ef-ph" name="phone" type="tel" defaultValue={e?.phone ?? ''} /></Field>
        <Field label="Email" htmlFor="ef-em"><Input id="ef-em" name="email" type="email" defaultValue={e?.email ?? ''} /></Field>
      </div>
      <Field label="Spécialités (séparées par des virgules)" htmlFor="ef-sp"><Input id="ef-sp" name="specialties" defaultValue={e?.specialties.join(', ') ?? ''} placeholder="Makeup, Nail art" /></Field>
      <Field label="Présentation" htmlFor="ef-bio"><Textarea id="ef-bio" name="bio" defaultValue={e?.bio ?? ''} maxLength={1000} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Couleur dans le planning" htmlFor="ef-col"><Input id="ef-col" name="color" type="color" defaultValue={e?.color ?? '#DFAAB9'} className="h-11 p-1" /></Field>
        <Field label="Ordre d'affichage" htmlFor="ef-so"><Input id="ef-so" name="sortOrder" type="number" min={0} max={999} defaultValue={e?.sort_order ?? 0} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={e?.is_active ?? true} className="accent-[var(--color-rosewood)]" /> Active</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="acceptsOnline" defaultChecked={e?.accepts_online_booking ?? true} className="accent-[var(--color-rosewood)]" /> Réservable en ligne</label>
      <SubmitButton className="justify-self-start">{e?.id ? 'Enregistrer' : 'Créer l\'employée'}</SubmitButton>
    </form>
  );
}

export function EmployeeServicesForm({ id, services, selected }: { id: string; services: { id: string; name: string; category: string }[]; selected: string[] }) {
  const [state, action] = useActionState(setEmployeeServices, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-2">
        {services.map((s) => (
          <label key={s.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm has-[:checked]:border-rosewood has-[:checked]:bg-powder-50">
            <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={selected.includes(s.id)} className="accent-[var(--color-rosewood)]" />
            <span>{s.name}<span className="block text-xs text-muted">{s.category}</span></span>
          </label>
        ))}
      </div>
      <SubmitButton size="sm" variant="outline" className="justify-self-start">Enregistrer</SubmitButton>
    </form>
  );
}

type Range = { weekday: number; start: string; end: string };

export function ScheduleEditor({ id, initial }: { id: string; initial: Range[] }) {
  const [ranges, setRanges] = useState<Range[]>(initial);
  const [state, action] = useActionState(saveSchedule, null);
  const update = (i: number, patch: Partial<Range>) => setRanges((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ranges" value={JSON.stringify(ranges)} />
      <ul className="grid gap-2">
        {WEEKDAYS_FR.map((label, d) => {
          const wd = d + 1;
          const list = ranges.map((r, i) => ({ r, i })).filter(({ r }) => r.weekday === wd);
          return (
            <li key={wd} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[7rem_1fr]">
              <span className="text-sm font-medium">{label}</span>
              <div className="grid gap-2">
                {list.length === 0 && <span className="text-sm text-muted">Repos</span>}
                {list.map(({ r, i }) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="time" step={300} value={r.start} onChange={(e) => update(i, { start: e.target.value })} aria-label={`${label} début`} className="h-10 py-0" />
                    <span className="text-muted">→</span>
                    <Input type="time" step={300} value={r.end} onChange={(e) => update(i, { end: e.target.value })} aria-label={`${label} fin`} className="h-10 py-0" />
                    <button type="button" className="grid size-9 shrink-0 place-items-center text-muted hover:text-danger" onClick={() => setRanges((x) => x.filter((_, j) => j !== i))} aria-label="Supprimer la plage"><Trash2 className="size-4" /></button>
                  </div>
                ))}
                <button type="button" className="inline-flex items-center gap-1 justify-self-start text-xs font-medium text-rosewood" onClick={() => setRanges((x) => [...x, { weekday: wd, start: '09:00', end: '13:00' }])}>
                  <Plus className="size-3.5" /> Ajouter une plage
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">Les pauses correspondent aux intervalles entre deux plages. Les créneaux en ligne respectent aussi les horaires d&apos;ouverture du salon.</p>
      <SubmitButton size="sm" className="justify-self-start">Enregistrer le planning</SubmitButton>
    </form>
  );
}

export function TimeOffForm({ id }: { id: string }) {
  const [state, action] = useActionState(addTimeOff, null);
  const today = todayInDakar();
  return (
    <form action={action} className="grid gap-3" key={state?.ok ? 'done' : 'f'}>
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Du" htmlFor="to-sd"><Input id="to-sd" type="date" name="startDate" defaultValue={today} required /></Field>
        <Field label="à" htmlFor="to-st"><Input id="to-st" type="time" name="startTime" defaultValue="00:00" /></Field>
        <Field label="Au" htmlFor="to-ed"><Input id="to-ed" type="date" name="endDate" defaultValue={today} required /></Field>
        <Field label="à" htmlFor="to-et"><Input id="to-et" type="time" name="endTime" defaultValue="23:59" /></Field>
      </div>
      <Field label="Motif" htmlFor="to-r"><Input id="to-r" name="reason" maxLength={300} placeholder="Congé, formation…" /></Field>
      <SubmitButton size="sm" variant="outline" className="justify-self-start">Ajouter l&apos;absence</SubmitButton>
    </form>
  );
}

export function DeleteTimeOffButton({ id, employeeId }: { id: string; employeeId: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>(null);
  return (
    <span>
      <button type="button" disabled={pending} className="text-xs text-muted hover:text-danger" onClick={() => { if (confirm('Supprimer cette absence ?')) start(async () => setState(await deleteTimeOff(id, employeeId))); }}>Supprimer</button>
      {state?.error && <span className="ml-2 text-xs text-danger">{state.error}</span>}
    </span>
  );
}

const roleOptions = (actorRole: AppRole) => (Object.keys(ROLE_LABEL) as AppRole[]).filter((r) =>
  r === 'super_admin' ? actorRole === 'super_admin' : r === 'owner' ? ['owner', 'super_admin'].includes(actorRole) : true);

export function ProfileRow({ profile, employees, actorRole, isSelf }: {
  profile: { id: string; full_name: string; role: AppRole; employee_id: string | null; is_active: boolean };
  employees: { id: string; display_name: string }[]; actorRole: AppRole; isSelf: boolean;
}) {
  const [state, action] = useActionState(updateProfile, null);
  const locked = isSelf || (profile.role === 'super_admin' && actorRole !== 'super_admin') || (profile.role === 'owner' && !['owner', 'super_admin'].includes(actorRole));
  const options = roleOptions(actorRole);
  return (
    <form action={action} className="grid gap-2 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[1fr_9rem_10rem_auto_auto] sm:items-center">
      <input type="hidden" name="id" value={profile.id} />
      <Input name="fullName" defaultValue={profile.full_name} aria-label="Nom" className="h-10 py-0" disabled={locked} />
      <Select name="role" defaultValue={profile.role} aria-label="Rôle" className="h-10 py-0" disabled={locked}>
        {(options.includes(profile.role) ? options : [profile.role, ...options]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </Select>
      <Select name="employeeId" defaultValue={profile.employee_id ?? ''} aria-label="Employée liée" className="h-10 py-0" disabled={locked}>
        <option value="">Aucune employée liée</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.display_name}</option>)}
      </Select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={profile.is_active} disabled={locked} className="accent-[var(--color-rosewood)]" /> Actif</label>
      {locked ? <span className="text-xs text-muted">{isSelf ? 'Votre compte' : 'Protégé'}</span> : <SubmitButton size="sm" variant="outline">Enregistrer</SubmitButton>}
      {state && <div className="sm:col-span-5"><FormFeedback state={state} /></div>}
    </form>
  );
}

export function InviteForm({ employees, actorRole }: { employees: { id: string; display_name: string }[]; actorRole: AppRole }) {
  const [state, action] = useActionState(inviteMember, null);
  return (
    <form action={action} className="grid gap-3" key={state?.ok ? 'done' : 'f'}>
      <FormFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom" htmlFor="iv-n"><Input id="iv-n" name="fullName" required maxLength={120} /></Field>
        <Field label="Email" htmlFor="iv-e"><Input id="iv-e" name="email" type="email" required /></Field>
        <Field label="Rôle" htmlFor="iv-r"><Select id="iv-r" name="role" defaultValue="staff">{roleOptions(actorRole).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
        <Field label="Employée liée (planning)" htmlFor="iv-emp"><Select id="iv-emp" name="employeeId" defaultValue=""><option value="">Aucune</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.display_name}</option>)}</Select></Field>
      </div>
      <p className="text-xs text-muted">La personne reçoit un email pour définir son mot de passe. Aucun mot de passe n&apos;est créé ni transmis par l&apos;administration.</p>
      <SubmitButton size="sm" className="justify-self-start">Envoyer l&apos;invitation</SubmitButton>
    </form>
  );
}

