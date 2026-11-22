import type { Metadata } from 'next';
import { Tracking } from '@/components/site/tracking';
import { SectionHeading } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Suivre une réservation ou une commande', robots: { index: false }, alternates: { canonical: '/suivi' } };

export default async function TrackingPage({ searchParams }: PageProps<'/suivi'>) {
  const { type } = await searchParams;
  return (
    <div className="container-page py-14 sm:py-20">
      <SectionHeading as="h1" eyebrow="Suivi" title="Mon rendez-vous, ma commande" align="center" intro="Retrouvez vos informations grâce à votre référence." className="mb-10" />
      <Tracking initialTab={type === 'commande' ? 'commande' : 'rdv'} />
    </div>
  );
}
