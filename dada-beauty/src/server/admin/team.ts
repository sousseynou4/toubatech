'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertPermission } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';
import { dakarLocalToISO } from '@/lib/format';
import { env } from '@/lib/env';
import { createServiceClient } from '@/lib/supabase/admin';
import type { FormState } from './common';

async function guard(perm: string) {
  try { return await assertPermission(perm); } catch { return null; }
}
const DENIED: FormState = { error: dbErrorMessage('PERMISSION_DENIED') };
const uuid = z.uuid();

const employeeSchema = z.object({
  displayName: z.string().trim().min(2, 'Nom affiché requis').max(80),
  fullName: z.string().trim().max(120).optional().transform((v) => v || null),
  phone: z.string().trim().max(30).optional().transform((v) => v || null),
  email: z.string().trim().max(160).optional().transform((v) => v || null).pipe(z.email('Email invalide').nullable()),
  bio: z.string().max(1000).optional().transform((v) => v || null),
  specialties: z.string().max(300).optional().transform((v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12)),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide'),
  isActive: z.boolean(), acceptsOnline: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

function readEmployee(form: FormData) {
  return employeeSchema.safeParse({
    displayName: form.get('displayName'), fullName: form.get('fullName') ?? undefined, phone: form.get('phone') ?? undefined,
    email: form.get('email') ?? undefined, bio: form.get('bio') ?? undefined, specialties: form.get('specialties') ?? undefined,
    color: form.get('color') ?? '#DFAAB9', isActive: form.get('isActive') === 'on', acceptsOnline: form.get('acceptsOnline') === 'on',
    sortOrder: form.get('sortOrder') || 0,
  });
}
const toRow = (d: z.output<typeof employeeSchema>) => ({
  display_name: d.displayName, full_name: d.fullName, phone: d.phone, email: d.email, bio: d.bio, specialties: d.specialties,
  color: d.color, is_active: d.isActive, accepts_online_booking: d.acceptsOnline, sort_order: d.sortOrder,
});

export async function createEmployee(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('team.manage');
  if (!g) return DENIED;
  const parsed = readEmployee(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { data, error } = await g.supabase.from('employees').insert(toRow(parsed.data)).select('id').single();
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath('/admin/equipe');
  redirect(`/admin/equipe/${data.id}`);
}

export async function updateEmployee(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('team.manage');
  if (!g) return DENIED;
  const id = String(form.get('id'));
  if (!uuid.safeParse(id).success) return { error: 'Requête invalide.' };
  const parsed = readEmployee(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const { error } = await g.supabase.from('employees').update(toRow(parsed.data)).eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/equipe/${id}`);
  return { ok: true, message: 'Profil enregistré.' };
}

export async function setEmployeeServices(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('team.manage');
  if (!g) return DENIED;
  const id = String(form.get('id'));
  const ids = form.getAll('serviceIds').map(String);
  if (!uuid.safeParse(id).success || ids.some((s) => !uuid.safeParse(s).success)) return { error: 'Requête invalide.' };
  const del = await g.supabase.from('employee_services').delete().eq('employee_id', id);
  if (del.error) return { error: dbErrorMessage(del.error) };
  if (ids.length) {
    const ins = await g.supabase.from('employee_services').insert(ids.map((s) => ({ employee_id: id, service_id: s })));
    if (ins.error) return { error: dbErrorMessage(ins.error) };
  }
  revalidatePath(`/admin/equipe/${id}`);
  return { ok: true, message: 'Prestations autorisées enregistrées.' };
}

const rangeSchema = z.object({ weekday: z.number().int().min(1).max(7), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) })
  .refine((r) => r.start < r.end, 'Chaque plage doit commencer avant de finir');

export async function saveSchedule(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('team.manage');
  if (!g) return DENIED;
  const id = String(form.get('id'));
  if (!uuid.safeParse(id).success) return { error: 'Requête invalide.' };
  let raw: unknown;
  try { raw = JSON.parse(String(form.get('ranges') ?? '[]')); } catch { return { error: 'Planning invalide.' }; }
  const parsed = z.array(rangeSchema).max(50).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Planning invalide.' };
  // Détecte les plages qui se chevauchent le même jour
  for (let d = 1; d <= 7; d++) {
    const day = parsed.data.filter((r) => r.weekday === d).sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < day.length; i++) if (day[i]!.start < day[i - 1]!.end) return { error: 'Deux plages se chevauchent le même jour.' };
  }
  const del = await g.supabase.from('employee_schedules').delete().eq('employee_id', id);
  if (del.error) return { error: dbErrorMessage(del.error) };
  if (parsed.data.length) {
    const ins = await g.supabase.from('employee_schedules').insert(parsed.data.map((r) => ({ employee_id: id, weekday: r.weekday, start_time: r.start, end_time: r.end })));
    if (ins.error) return { error: dbErrorMessage(ins.error) };
  }
  revalidatePath(`/admin/equipe/${id}`);
  return { ok: true, message: 'Planning hebdomadaire enregistré.' };
}

export async function addTimeOff(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('team.manage');
  if (!g) return DENIED;
  const parsed = z.object({
    id: z.uuid(), startDate: z.iso.date('Date de début requise'), startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endDate: z.iso.date('Date de fin requise'), endTime: z.string().regex(/^\d{2}:\d{2}$/), reason: z.string().max(300).optional(),
  }).safeParse({
    id: form.get('id'), startDate: form.get('startDate'), startTime: form.get('startTime') || '00:00',
    endDate: form.get('endDate'), endTime: form.get('endTime') || '23:59', reason: form.get('reason') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  const start = dakarLocalToISO(d.startDate, d.startTime);
  const end = dakarLocalToISO(d.endDate, d.endTime);
  if (end <= start) return { error: 'La fin doit être après le début.' };
  const { error } = await g.supabase.from('employee_time_off').insert({ employee_id: d.id, period: `[${start},${end})`, reason: d.reason ?? null, created_by: g.ctx.userId });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/equipe/${d.id}`);
  return { ok: true, message: 'Absence enregistrée. Les créneaux en ligne sont bloqués sur cette période.' };
}

export async function deleteTimeOff(id: string, employeeId: string): Promise<FormState> {
  const g = await guard('team.manage');
  if (!g) return DENIED;
  if (!uuid.safeParse(id).success) return { error: 'Requête invalide.' };
  const { error } = await g.supabase.from('employee_time_off').delete().eq('id', id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/equipe/${employeeId}`);
  return { ok: true, message: 'Absence supprimée.' };
}

const ROLES = ['super_admin', 'owner', 'manager', 'staff', 'sales'] as const;

function roleAllowed(actor: string, target: string) {
  if (target === 'super_admin') return actor === 'super_admin';
  if (target === 'owner') return actor === 'owner' || actor === 'super_admin';
  return true;
}

export async function updateProfile(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('users.manage');
  if (!g) return DENIED;
  const parsed = z.object({ id: z.uuid(), role: z.enum(ROLES), employeeId: z.uuid().optional().or(z.literal('')), isActive: z.boolean(), fullName: z.string().trim().max(120) })
    .safeParse({ id: form.get('id'), role: form.get('role'), employeeId: form.get('employeeId') ?? '', isActive: form.get('isActive') === 'on', fullName: form.get('fullName') ?? '' });
  if (!parsed.success) return { error: 'Formulaire invalide.' };
  const d = parsed.data;
  if (d.id === g.ctx.userId && (!d.isActive || d.role !== g.ctx.role)) return { error: 'Vous ne pouvez pas modifier votre propre rôle ni désactiver votre compte.' };
  if (!roleAllowed(g.ctx.role, d.role)) return { error: 'Vous ne pouvez pas attribuer ce rôle.' };
  const { error } = await g.supabase.from('profiles').update({ role: d.role, employee_id: d.employeeId || null, is_active: d.isActive, full_name: d.fullName }).eq('id', d.id);
  if (error) return { error: String(error.message).includes('rôle') || String(error.message).includes('Rôle') ? error.message : dbErrorMessage(error) };
  revalidatePath('/admin/equipe/comptes');
  return { ok: true, message: 'Compte mis à jour.' };
}

export async function inviteMember(_p: FormState, form: FormData): Promise<FormState> {
  const g = await guard('users.manage');
  if (!g) return DENIED;
  const parsed = z.object({ email: z.email('Email invalide'), fullName: z.string().trim().min(2, 'Nom requis').max(120), role: z.enum(ROLES), employeeId: z.uuid().optional().or(z.literal('')) })
    .safeParse({ email: form.get('email'), fullName: form.get('fullName'), role: form.get('role'), employeeId: form.get('employeeId') ?? '' });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  const d = parsed.data;
  if (!roleAllowed(g.ctx.role, d.role)) return { error: 'Vous ne pouvez pas attribuer ce rôle.' };
  const admin = createServiceClient();
  if (!admin) return { error: 'Invitation impossible : la clé SUPABASE_SERVICE_ROLE_KEY n\'est pas configurée sur le serveur (voir ENVIRONMENT.md).' };
  const { data, error } = await admin.auth.admin.inviteUserByEmail(d.email, {
    redirectTo: `${env.siteUrl}/admin/connexion/confirmer?next=/admin/connexion/nouveau-mot-de-passe`,
    data: { full_name: d.fullName },
  });
  if (error || !data.user) return { error: error?.message?.includes('already') ? 'Un compte existe déjà pour cet email.' : 'Échec de l\'envoi de l\'invitation.' };
  // Le profil est créé avec la session de l'administratrice : RLS + garde-fous de rôles en base s'appliquent.
  const { error: pErr } = await g.supabase.from('profiles').upsert({ id: data.user.id, full_name: d.fullName, role: d.role, employee_id: d.employeeId || null, is_active: true });
  if (pErr) return { error: `Invitation envoyée mais profil non créé : ${dbErrorMessage(pErr)}` };
  revalidatePath('/admin/equipe/comptes');
  return { ok: true, message: `Invitation envoyée à ${d.email}.` };
}
