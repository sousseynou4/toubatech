import type { Metadata } from 'next';
import { LoginForm } from '@/components/admin/login-form';
import { Logo } from '@/components/ui/logo';
import { isSupabaseConfigured } from '@/lib/env';
import { Alert } from '@/components/ui/field';

export const metadata: Metadata = { title: 'Connexion — espace équipe', robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<'/admin/connexion'>) {
  const { redirect } = await searchParams;
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-powder-100 via-admin to-nude-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center"><Logo href="/" className="items-center" /></div>
        <div className="card p-7">
          <h1 className="font-display text-3xl">Espace équipe</h1>
          <p className="mt-1 text-sm text-muted">Connectez-vous pour accéder au tableau de bord.</p>
          {!isSupabaseConfigured() && <Alert tone="warning" className="mt-4">Base de données non configurée : renseignez les variables Supabase (voir ENVIRONMENT.md).</Alert>}
          <LoginForm redirect={typeof redirect === 'string' ? redirect : '/admin'} />
        </div>
        <p className="mt-6 text-center text-xs text-muted">Accès réservé au personnel de Dada Beauty.</p>
      </div>
    </div>
  );
}
