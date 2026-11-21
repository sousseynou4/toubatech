import type { Metadata } from 'next';
import { ReviewForm } from '@/components/site/review-form';
import { SectionHeading } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Donner mon avis', robots: { index: false } };

export default async function ReviewPage({ params }: PageProps<'/avis/[token]'>) {
  const { token } = await params;
  return (
    <div className="container-page max-w-xl py-14 sm:py-20">
      <SectionHeading as="h1" eyebrow="Votre avis" title="Comment s'est passé votre rendez-vous ?" align="center" className="mb-8" />
      <ReviewForm token={token} />
    </div>
  );
}
