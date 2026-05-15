import type { Metadata } from 'next';
import { Eyebrow, Section } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Boutique reconditionné — iPhone & Galaxy à Lorient',
  description:
    'Smartphones et tablettes reconditionnés garantis 12 mois. iPhone, Samsung Galaxy, iPad. Reconditionnement local à Lorient.',
};

export default function ReconditionnePage() {
  return (
    <Section>
      <Eyebrow>Bientôt disponible</Eyebrow>
      <h1 className="mt-6 text-hero text-ink">Boutique Reconditionné</h1>
      <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-500">
        Catalogue de smartphones et tablettes reconditionnés, garantis 12 mois. Intégration
        Stripe à venir.
      </p>
    </Section>
  );
}
