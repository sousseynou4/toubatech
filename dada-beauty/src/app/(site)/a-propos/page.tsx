import type { Metadata } from 'next';
import { Gem, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import { ArtImage } from '@/components/ui/art-image';
import { ButtonLink } from '@/components/ui/button';
import { Section, SectionHeading } from '@/components/ui/section';
import { getSettings, getSlots } from '@/server/catalog';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'À propos de Dada Beauty',
  description: 'Dada Beauty, institut de beauté à Guédiawaye (Deux Boulangeries, Dakar) : notre vision, notre savoir-faire et nos engagements.',
  alternates: { canonical: '/a-propos' },
};

const VALUES = [
  { icon: Sparkles, title: 'Le souci du détail', text: 'Chaque prestation est réalisée avec précision, du teint parfait au nail art le plus fin.' },
  { icon: HeartHandshake, title: 'L\'écoute', text: 'Nous prenons le temps de comprendre vos envies pour un résultat qui vous ressemble.' },
  { icon: ShieldCheck, title: 'L\'hygiène', text: 'Matériel entretenu et règles d\'hygiène strictes à chaque rendez-vous.' },
  { icon: Gem, title: 'Des produits choisis', text: 'Une sélection de produits et de perruques de qualité, disponibles en boutique.' },
];

export default async function AboutPage() {
  const [{ settings }, slots] = await Promise.all([getSettings(), getSlots()]);
  return (
    <>
      <Section className="bg-gradient-to-b from-powder-100 to-ivory">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading as="h1" eyebrow="À propos" title={<>Dada <em className="text-rosewood">Beauty</em></>} />
            <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-ink-soft">
              {settings.description ?? 'Installé à Guédiawaye, dans le secteur Deux Boulangeries, Dada Beauty est un institut dédié à la mise en beauté des femmes : maquillage, onglerie, extensions de cils, coiffure et perruques. Notre ambition : offrir à chaque cliente une expérience professionnelle, chaleureuse et raffinée.'}
            </p>
            <ButtonLink href="/reserver" className="mt-8">Prendre rendez-vous</ButtonLink>
          </div>
          <ArtImage src={slots.about?.public_url} alt={slots.about?.alt || 'L\'équipe Dada Beauty'} theme="salon" label="Notre équipe" className="aspect-[4/5] rounded-[2rem]" />
        </div>
      </Section>
      <Section>
        <SectionHeading eyebrow="Nos engagements" title="Ce qui nous guide" align="center" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="card p-6">
              <v.icon className="size-7 text-rosewood" />
              <h2 className="mt-4 font-display text-2xl">{v.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{v.text}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
