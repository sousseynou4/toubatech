'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export async function signIn(_prev: unknown, form: FormData): Promise<{ error: string } | null> {
  const parsed = z.object({ email: z.email(), password: z.string().min(8) }).safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) return { error: 'Email ou mot de passe invalide.' };
  const sb = await createClient();
  if (!sb) return { error: 'Supabase n\'est pas configuré (voir ENVIRONMENT.md).' };
  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Identifiants incorrects.' };
  const redirectTo = String(form.get('redirect') ?? '/admin');
  redirect(redirectTo.startsWith('/admin') ? redirectTo : '/admin');
}

export async function signOut() {
  const sb = await createClient();
  await sb?.auth.signOut();
  redirect('/admin/connexion');
}

export async function requestPasswordReset(_prev: unknown, form: FormData): Promise<{ message: string }> {
  const email = z.email().safeParse(form.get('email'));
  const sb = await createClient();
  if (email.success && sb) {
    await sb.auth.resetPasswordForEmail(email.data, { redirectTo: `${env.siteUrl}/admin/connexion/confirmer` });
  }
  // Réponse identique dans tous les cas (pas d'énumération des comptes).
  return { message: 'Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.' };
}

export async function updatePassword(_prev: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const pwd = String(form.get('password') ?? '');
  if (pwd.length < 12) return { error: 'Le mot de passe doit contenir au moins 12 caractères.' };
  if (pwd !== form.get('confirm')) return { error: 'Les mots de passe ne correspondent pas.' };
  const sb = await createClient();
  if (!sb) return { error: 'Service indisponible.' };
  const { error } = await sb.auth.updateUser({ password: pwd });
  if (error) return { error: 'Lien expiré ou invalide. Recommencez la procédure.' };
  return { ok: true };
}
