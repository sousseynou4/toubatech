import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Connexion',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
      {/* Atmospheric background */}
      <div className="absolute inset-0 gradient-mesh opacity-70" aria-hidden="true" />
      <div className="absolute inset-0 grid-bg opacity-30" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <svg width="44" height="44" viewBox="0 0 28 28" aria-hidden="true">
            <rect x="2" y="2" width="24" height="24" rx="7" fill="#003366" />
            <path
              d="M9 14.5L12.5 18L19.5 11"
              stroke="#339966"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <p className="mt-4 text-[15px] font-medium tracking-tight text-ink">
            TOUBA <span className="text-emerald">TECH</span>
          </p>
          <p className="mt-2 font-mono text-[10px] tracking-[0.22em] text-ink-400 uppercase">
            Console administrateur
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-ink/10 bg-bone p-7 shadow-lift md:p-9">
          <h1 className="text-h2 text-ink">Accès restreint</h1>
          <p className="mt-2 text-sm text-ink-500">
            Saisissez le mot de passe maître pour accéder à la tour de contrôle.
          </p>

          <div className="mt-7">
            <Suspense fallback={<div className="h-32" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          <Link href="/" className="hover:text-ink">
            ← Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}
