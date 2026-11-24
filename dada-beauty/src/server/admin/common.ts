'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStaffContext } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/errors';

export interface SearchHit { type: string; id: string; title: string; subtitle: string; href: string }

export async function searchAdmin(q: string): Promise<SearchHit[]> {
  const ctx = await getStaffContext();
  if (!ctx || q.length > 80) return [];
  const sb = (await createClient())!;
  const { data } = await sb.rpc('admin_search', { p_query: q });
  return (data ?? []) as SearchHit[];
}

export async function markNotificationsRead(ids: string[]) {
  const ctx = await getStaffContext();
  if (!ctx || !ids.length) return;
  const sb = (await createClient())!;
  await sb.from('notification_reads').upsert(ids.slice(0, 200).map((id) => ({ notification_id: id, user_id: ctx.userId })), { ignoreDuplicates: true });
  revalidatePath('/admin', 'layout');
}

/** `link` : lien à usage unique à transmettre (invitation d'un membre de l'équipe par WhatsApp). */
export type FormState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string>; link?: string } | null;

/** Exécute une opération Supabase et renvoie un état de formulaire uniforme. */
export async function toState(p: PromiseLike<{ error: unknown }>, success = 'Enregistré.'): Promise<FormState> {
  const { error } = await p;
  if (error) return { error: dbErrorMessage(error) };
  return { ok: true, message: success };
}

export async function searchCustomers(q: string): Promise<{ id: string; full_name: string; phone: string }[]> {
  const ctx = await getStaffContext();
  if (!ctx || !ctx.can('customers.view') || q.trim().length < 2 || q.length > 60) return [];
  const sb = (await createClient())!;
  const digits = q.replace(/\D/g, '');
  const safe = q.replace(/[%_,()]/g, '');
  const filter = digits.length >= 3 ? `full_name.ilike.%${safe}%,phone.ilike.%${digits}%` : `full_name.ilike.%${safe}%`;
  const { data } = await sb.from('customers').select('id, full_name, phone').or(filter).order('full_name').limit(10);
  return data ?? [];
}
