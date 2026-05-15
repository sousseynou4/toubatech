'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/admin';
  const configError = searchParams.get('error') === 'server_config';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Mot de passe incorrect.');
        } else if (response.status === 500) {
          setError(
            'Le serveur est mal configuré (ADMIN_PASSWORD ou ADMIN_SESSION_SECRET manquant).'
          );
        } else {
          setError('Une erreur est survenue. Réessayez.');
        }
        setLoading(false);
        return;
      }

      // Hard navigation so middleware picks up the new cookie
      window.location.assign(redirectTo);
    } catch {
      setError('Connexion impossible au serveur.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {configError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Configuration serveur incomplète</p>
            <p className="mt-1 text-amber-800">
              Vérifie que <code className="font-mono text-xs">ADMIN_PASSWORD</code> et{' '}
              <code className="font-mono text-xs">ADMIN_SESSION_SECRET</code> sont définis
              dans <code className="font-mono text-xs">.env.local</code>.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="flex items-center gap-2 text-sm font-medium text-ink"
        >
          <Lock className="h-3.5 w-3.5 text-ink-400" />
          Mot de passe administrateur
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-ink/12 bg-bone px-4 py-3 pr-12 text-[15px] text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-60"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 hover:bg-ink/5 hover:text-ink"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-bone font-medium tracking-tight transition-all hover:bg-ink-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification…
          </>
        ) : (
          'Accéder à la console'
        )}
      </button>
    </form>
  );
}
