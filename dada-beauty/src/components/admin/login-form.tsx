'use client';

import { useActionState, useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
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

/**
 * Les emails Supabase par défaut (offre gratuite) renvoient la session dans le
 * fragment d'URL (#access_token=…). On l'installe dans les cookies avant que
 * le formulaire n'appelle l'action serveur de changement de mot de passe.
 */
function useSessionFromHash() {
  const [status, setStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique de l'URL au montage
    if (hash.get('error')) { setStatus('error'); return; }
    const access_token = hash.get('access_token');
    const refresh_token = hash.get('refresh_token');
    if (!access_token || !refresh_token) return;
    createBrowserSupabase().auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      window.history.replaceState(null, '', window.location.pathname);
      setStatus(error ? 'error' : 'ready');
    });
  }, []);
  return status;
}

export function NewPasswordForm() {
  const hashStatus = useSessionFromHash();
  const [state, action, pending] = useActionState(updatePassword, null);
  if (state?.ok) return <Alert tone="success" className="mt-4">Mot de passe mis à jour. <Link href="/admin" className="font-semibold underline">Accéder au tableau de bord</Link></Alert>;
  return (
    <form action={action} className="mt-6 grid gap-4">
      {hashStatus === 'error' && <Alert tone="danger">Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien depuis « Mot de passe oublié ».</Alert>}
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Nouveau mot de passe (12 caractères min.)" htmlFor="pw"><Input id="pw" name="password" type="password" minLength={12} required autoComplete="new-password" /></Field>
      <Field label="Confirmer" htmlFor="pw2"><Input id="pw2" name="confirm" type="password" minLength={12} required autoComplete="new-password" /></Field>
      <Button type="submit" disabled={pending}>Enregistrer</Button>
    </form>
  );
}
