import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { ServiceCard } from '@/components/site/cards';
import { Section, SectionHeading } from '@/components/ui/section';
import { ButtonLink } from '@/components/ui/button';
import { Alert } from '@/components/ui/field';
import { getCategoriesWithServices } from '@/server/catalog';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Nos prestations — maquillage, onglerie, cils, coiffure',
  description: 'Soft glam, full glam, maquillage mariée, pose gel, capsules, nail art, extensions de cils, volume russe, pose lace frontal et perruques à Guédiawaye, Dakar.',
  alternates: { canonical: '/prestations' },
};

export default async function ServicesPage() {
  const categories = await getCategoriesWithServices();
  return (
    <>
      <Section className="bg-gradient-to-b from-powder-100 to-ivory pb-8 sm:pb-10">
        <SectionHeading as="h1" eyebrow="Carte des prestations" title={<>Nos <em className="text-rosewood">prestations</em></>}
          intro="Les tarifs et durées sont indiqués lorsqu'ils sont confirmés par le salon. Pour toute prestation « sur demande », écrivez-nous : nous vous répondons rapidement." />
        <nav aria-label="Catégories" className="mt-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {categories.map((c) => (
            <a key={c.slug} href={`#${c.slug}`} className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink-soft hover:border-rosewood hover:text-rosewood">{c.name}</a>
          ))}
          <Link href="/evenements" className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm text-ivory">Mariages & événements</Link>
        </nav>
      </Section>
      {categories.length === 0 && (
        <div className="container-page pb-20"><Alert>Le catalogue est en cours de mise en ligne. Contactez-nous sur WhatsApp pour connaître nos prestations.</Alert></div>
      )}
      {categories.map((c, i) => (
        <section key={c.id} id={c.slug} className={`scroll-mt-24 py-12 sm:py-16 ${i % 2 ? 'bg-powder-50' : ''}`}>
          <div className="container-page">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-4xl sm:text-5xl">{c.name}</h2>
                {c.tagline && <p className="mt-2 text-muted">{c.tagline}</p>}
              </div>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.services.map((s) => <ServiceCard key={s.id} service={s} theme={c.slug} />)}
            </div>
          </div>
        </section>
      ))}
      <Section>
        <div className="card flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <HeartHandshake className="size-8 shrink-0 text-rosewood" />
            <div>
              <h2 className="font-display text-3xl">Mariage, baptême, cérémonie, à domicile ?</h2>
              <p className="mt-1 text-muted">Demandez un devis personnalisé pour vous et vos proches.</p>
            </div>
          </div>
          <ButtonLink href="/evenements">Demander un devis</ButtonLink>
        </div>
      </Section>
    </>
  );
}
