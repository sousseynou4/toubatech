import type { Metadata } from 'next';
import { DiagnosticForm } from '@/components/diagnostic/DiagnosticForm';
import { Eyebrow } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Diagnostic en ligne — Réparation à Lorient',
  description:
    "Décrivez votre panne en 5 étapes. Réception d'un pré-diagnostic et d'une estimation tarifaire sous 24h ouvrées par TOUBA TECH à Lorient.",
  alternates: { canonical: '/diagnostic' },
};

export default function DiagnosticPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink/8">
        <div className="absolute inset-0 gradient-mesh opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center md:px-8 md:py-28">
          <Eyebrow>Diagnostic intelligent</Eyebrow>
          <h1 className="mt-6 text-hero text-ink">
            Décrivez votre panne en quelques minutes.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-500">
            Cinq étapes guidées. Notre équipe analyse votre demande et vous transmet une
            estimation tarifaire personnalisée sous 24h ouvrées.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-22">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <DiagnosticForm />
        </div>
      </section>
    </>
  );
}
