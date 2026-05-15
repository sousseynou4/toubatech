import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Check, ArrowRight, Mail, ShoppingBag } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { CartCleanup } from './CartCleanup';

export const metadata: Metadata = {
  title: 'Commande confirmée',
  robots: { index: false, follow: false },
};

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;

  return (
    <Section>
      {/* Clear cart on successful payment */}
      <Suspense fallback={null}>
        <CartCleanup />
      </Suspense>

      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-emerald/20 bg-bone p-10 shadow-lift md:p-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-ink/5 blur-3xl" />

        <div className="relative">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald text-bone">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-h1 text-ink">Merci pour votre commande</h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-500">
            Votre paiement est confirmé et votre commande est en cours de préparation à
            notre atelier de Lorient. Vous recevrez prochainement un email de
            confirmation avec le détail et le suivi de l'expédition.
          </p>

          {sessionId && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-ink/10 bg-mist/30 px-4 py-2.5">
              <span className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
                Session
              </span>
              <span className="font-mono text-xs text-ink truncate max-w-xs">
                {sessionId.slice(0, 20)}…
              </span>
            </div>
          )}

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ink/8 bg-mist/20 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-ink">
                <Mail className="h-3.5 w-3.5 text-emerald" />
                Email de confirmation
              </div>
              <p className="mt-1.5 text-xs text-ink-500">
                Vérifiez votre boîte (et les spams), il arrive sous quelques minutes.
              </p>
            </div>
            <div className="rounded-xl border border-ink/8 bg-mist/20 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-ink">
                <ShoppingBag className="h-3.5 w-3.5 text-emerald" />
                Préparation 48h
              </div>
              <p className="mt-1.5 text-xs text-ink-500">
                Expédition sous 48h ouvrées ou retrait possible à Lorient.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/boutique"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-bone transition-all hover:bg-ink-700"
            >
              Retour à la boutique
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-bone px-6 text-sm font-medium text-ink transition-all hover:border-ink/30 hover:bg-mist/40"
            >
              Page d'accueil
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
