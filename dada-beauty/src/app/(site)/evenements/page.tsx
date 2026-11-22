import type { Metadata } from 'next';
import { Crown, Home, PartyPopper, Sparkles } from 'lucide-react';
import { QuoteForm } from '@/components/site/quote-form';
import { SectionHeading } from '@/components/ui/section';

export const metadata: Metadata = {
  title: 'Mariages, baptêmes & événements — devis beauté',
  description: 'Maquillage mariée, beauté des invitées, baptêmes, anniversaires et prestations à domicile à Dakar : demandez votre devis Dada Beauty.',
  alternates: { canonical: '/evenements' },
};

export default function EventsPage() {
  return (
    <div className="bg-gradient-to-b from-powder-100 via-powder-50 to-ivory">
      <div className="container-page grid gap-12 py-14 sm:py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading as="h1" eyebrow="Événements" title={<>Votre grand jour, <em className="text-rosewood">sublimé</em></>}
            intro="Mariages, baptêmes, anniversaires, cérémonies ou prestations à domicile : décrivez-nous votre projet, nous vous proposons un devis sur-mesure." />
          <ul className="mt-10 grid gap-5">
            {[[Crown, 'Mariées', 'Essai, maquillage et coiffure du jour J.'], [Sparkles, 'Invitées & cortège', 'Mise en beauté de vos proches.'], [PartyPopper, 'Baptêmes & anniversaires', 'Un look parfait pour vos fêtes.'], [Home, 'À domicile', 'Nous nous déplaçons selon disponibilité.']].map(([Icon, t, d]) => {
              const I = Icon as typeof Crown;
              return (
                <li key={t as string} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-rosewood shadow-soft"><I className="size-5" /></span>
                  <span><span className="block font-display text-2xl">{t as string}</span><span className="text-sm text-muted">{d as string}</span></span>
                </li>
              );
            })}
          </ul>
        </div>
        <QuoteForm />
      </div>
    </div>
  );
}
