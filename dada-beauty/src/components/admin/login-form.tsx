'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, Field, Input } from '@/components/ui/field';
import { requestPasswordReset, signIn, updatePassword } from '@/server/auth-actions';

export function LoginForm({ redirect }: { redirect: string }) {
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [state, action, pending] = useActionState(signIn, null);
  const [resetState, resetAction, resetPending] = useActionState(requestPasswordReset, null);
  if (mode === 'reset') {
    return (
      <form action={resetAction} className="mt-6 grid gap-4">
        {resetState && <Alert tone="success">{resetState.message}</Alert>}
        <Field label="Email" htmlFor="r-email"><Input id="r-email" name="email" type="email" required autoComplete="email" /></Field>
        <Button type="submit" disabled={resetPending}>Recevoir un lien</Button>
        <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setMode('login')}>Retour à la connexion</button>
      </form>
    );
  }
  return (
    <form action={action} className="mt-6 grid gap-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="redirect" value={redirect} />
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="username" /></Field>
      <Field label="Mot de passe" htmlFor="password"><Input id="password" name="password" type="password" required autoComplete="current-password" minLength={8} /></Field>
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Se connecter</Button>
      <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setMode('reset')}>Mot de passe oublié ?</button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  if (state?.ok) return <Alert tone="success" className="mt-4">Mot de passe mis à jour. <Link href="/admin" className="font-semibold underline">Accéder au tableau de bord</Link></Alert>;
  return (
    <form action={action} className="mt-6 grid gap-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Nouveau mot de passe (12 caractères min.)" htmlFor="pw"><Input id="pw" name="password" type="password" minLength={12} required autoComplete="new-password" /></Field>
      <Field label="Confirmer" htmlFor="pw2"><Input id="pw2" name="confirm" type="password" minLength={12} required autoComplete="new-password" /></Field>
      <Button type="submit" disabled={pending}>Enregistrer</Button>
    </form>
  );
}
