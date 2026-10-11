import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  Leaf,
  Recycle,
  Scale,
  Award,
  TrendingDown,
  Users,
  MapPin,
  Cpu,
} from 'lucide-react';
import { Section, Eyebrow } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Engagement écologique — Loi AGEC, QualiRépar à Lorient',
  description:
    "TOUBA TECH s'engage pour une tech durable en Bretagne : conformité à la Loi AGEC, démarche de labellisation QualiRépar, impact CO₂ mesuré. Réparation et reconditionné à Lorient, Morbihan et toute la Bretagne.",
  alternates: { canonical: '/ecologie' },
  openGraph: {
    title: 'Engagement écologique — TOUBA TECH',
    description:
      "Loi AGEC, label QualiRépar, économie circulaire bretonne. Notre engagement pour le numérique responsable.",
    url: '/ecologie',
  },
};

export default function EcologiePage() {
  return (
    <>
      <Hero />
      <ImpactMetrics />
      <LoiAGEC />
      <QualiRepar />
      <CircularEconomy />
      <BretagneLocal />
      <FinalCTA />
    </>
  );
}

/* ─────────────────────────────────  HERO  ───────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink/8">
      <div className="absolute inset-0 gradient-mesh opacity-70" aria-hidden="true" />
      <div className="absolute inset-0 grid-bg opacity-30" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 py-22 md:px-8 md:py-30">
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase"
        >
          <Link href="/" className="transition-colors hover:text-ink">
            Accueil
          </Link>
          <span className="mx-2 text-ink-300">/</span>
          <span className="text-ink">Engagement écologique</span>
        </nav>

        <div className="max-w-3xl">
          <Eyebrow>Tech durable · Bretagne · Économie circulaire</Eyebrow>
          <h1 className="mt-6 text-display text-ink">
            Une tech qui dure,
            <br />
            <span className="text-emerald">une planète qui respire.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-ink-500">
            La fabrication d'un smartphone neuf émet en moyenne <strong className="text-ink">80 kg
            de CO₂</strong> et mobilise plus de 70 matériaux, souvent issus de mines dégradant
            les écosystèmes. Chez TOUBA TECH, à Lorient, nous croyons qu'un appareil bien réparé
            ou bien reconditionné vaut tous les neufs du monde.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────  IMPACT METRICS  ───────────────────────────────── */
function ImpactMetrics() {
  const metrics = [
    {
      icon: Recycle,
      value: '2 500+',
      label: 'Appareils sauvés',
      sublabel: 'depuis notre lancement',
    },
    {
      icon: TrendingDown,
      value: '200 t',
      label: 'CO₂ évités',
      sublabel: 'équivalent à 1 000 vols Paris–New York',
    },
    {
      icon: Cpu,
      value: '> 70',
      label: 'Matériaux préservés',
      sublabel: 'par appareil réparé ou reconditionné',
    },
    {
      icon: Users,
      value: '4 900',
      label: 'Clients accompagnés',
      sublabel: 'en Bretagne sud',
    },
  ];

  return (
    <Section className="bg-ink text-bone">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-emerald uppercase">
          <span className="h-px w-6 bg-emerald" aria-hidden="true" />
          Notre impact mesuré
        </span>
        <h2 className="mt-6 text-hero text-bone">
          Des chiffres,
          <br />
          <span className="text-emerald">pas des promesses.</span>
        </h2>
        <p className="mt-6 text-[16px] leading-relaxed text-bone/70">
          Nous mesurons chaque mois notre contribution réelle à l'économie circulaire,
          appareil par appareil. Les chiffres ci-dessous sont des estimations conservatrices
          basées sur les données ADEME et la méthodologie du Code de l'environnement.
        </p>
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-bone/10 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-ink p-7 md:p-8">
            <metric.icon className="h-5 w-5 text-emerald" strokeWidth={1.6} />
            <p className="mt-6 text-3xl font-medium tracking-tight text-bone md:text-4xl">
              {metric.value}
            </p>
            <p className="mt-3 text-[14px] font-medium text-bone">{metric.label}</p>
            <p className="mt-1 text-xs text-bone/60">{metric.sublabel}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-bone/50">
        Estimations basées sur les facteurs d'émission ADEME (Base Carbone®) appliqués aux
        appareils que nous avons traités. Méthodologie disponible sur demande.
      </p>
    </Section>
  );
}

/* ─────────────────────────────────  LOI AGEC  ───────────────────────────────── */
function LoiAGEC() {
  return (
    <Section className="border-t border-ink/8">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>Loi AGEC · 2020</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            La loi qui change
            <br />
            <span className="text-emerald">la donne.</span>
          </h2>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-500">
            La Loi Anti-Gaspillage pour une Économie Circulaire (AGEC), promulguée le 10 février
            2020, encadre la lutte contre l'obsolescence programmée et favorise le réemploi.
            Elle impose la transparence sur la réparabilité des produits et soutient
            l'écosystème de la réparation et du reconditionné.
          </p>
        </div>

        <div className="space-y-3 lg:col-span-7">
          <AGECMeasure
            icon={Scale}
            title="Indice de réparabilité affiché"
            description="Tous les smartphones, ordinateurs portables, télévisions et machines à laver vendus en France affichent une note sur 10. Plus l'indice est élevé, plus l'appareil est conçu pour durer. Nous privilégions les appareils avec un indice ≥ 7."
          />
          <AGECMeasure
            icon={Cpu}
            title="Disponibilité des pièces détachées"
            description="Les fabricants doivent désormais garantir la disponibilité des pièces détachées et leur livraison rapide aux réparateurs. C'est ce qui rend notre activité possible et pérenne."
          />
          <AGECMeasure
            icon={Recycle}
            title="Fonds Réparation depuis 2022"
            description="L'État finance directement une partie du coût de la réparation des produits électriques et électroniques via le label QualiRépar. Concrètement : 25 € à 60 € de bonus, déduits directement de votre facture chez un réparateur agréé."
          />
        </div>
      </div>
    </Section>
  );
}

function AGECMeasure({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Scale;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-bone p-6 md:p-7">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <div>
          <h3 className="text-[17px] font-medium tracking-tight text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────  QUALIREPAR  ───────────────────────────────── */
function QualiRepar() {
  return (
    <Section className="border-t border-ink/8 bg-mist/30">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow>Label QualiRépar</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Vers la labellisation
            <br />
            <span className="text-emerald">QualiRépar.</span>
          </h2>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-500">
            QualiRépar est le label national qui certifie le sérieux d'un réparateur d'appareils
            électriques et électroniques. Il donne accès au <strong className="text-ink">bonus
            réparation</strong>, une aide financière directement déduite de la facture client
            par l'État.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            <strong className="text-ink">Notre démarche est en cours.</strong> Nous remplissons
            l'ensemble des critères techniques et déontologiques exigés par les éco-organismes
            partenaires (ecosystem, Ecologic). Une fois obtenu, le label fera bénéficier
            automatiquement nos clients à Lorient et dans le Morbihan d'une réduction immédiate
            sur leurs réparations éligibles.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <BonusCard amount="25 €" item="Smartphone, tablette" />
            <BonusCard amount="50 €" item="Ordinateur portable, écran" />
          </div>

          <p className="mt-5 text-xs leading-relaxed text-ink-400">
            Montants indicatifs basés sur le barème officiel ecosystem 2024. Sous réserve de
            l'obtention du label et de l'éligibilité du produit (acheté en France, hors
            garantie, hors casse).
          </p>
        </div>

        <aside className="lg:col-span-5">
          <div className="sticky top-24 rounded-3xl border border-emerald/20 bg-bone p-7 shadow-soft md:p-8">
            <Award className="h-7 w-7 text-emerald" strokeWidth={1.6} />
            <h3 className="mt-5 text-[20px] font-medium tracking-tight text-ink">
              Pourquoi le label compte
            </h3>
            <ul className="mt-6 space-y-3.5 text-sm leading-relaxed text-ink-600">
              <CheckItem>Engagement écrit de qualité de service</CheckItem>
              <CheckItem>Pièces et procédures certifiées</CheckItem>
              <CheckItem>Devis transparent obligatoire</CheckItem>
              <CheckItem>Garantie minimale contractuelle</CheckItem>
              <CheckItem>Audit régulier par l'éco-organisme</CheckItem>
              <CheckItem>Bonus état appliqué directement</CheckItem>
            </ul>
            <Link
              href="/diagnostic"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-emerald hover:underline"
            >
              Estimer ma réparation
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </Section>
  );
}

function BonusCard({ amount, item }: { amount: string; item: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-bone p-5">
      <p className="font-mono text-[10px] tracking-[0.18em] text-emerald uppercase">
        Bonus jusqu'à
      </p>
      <p className="mt-2 text-2xl font-medium tracking-tight text-ink">{amount}</p>
      <p className="mt-1 text-xs text-ink-400">{item}</p>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Leaf className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald" strokeWidth={1.8} />
      <span>{children}</span>
    </li>
  );
}

/* ─────────────────────────────────  CIRCULAR ECONOMY  ───────────────────────────────── */
function CircularEconomy() {
  return (
    <Section className="border-t border-ink/8">
      <div className="max-w-3xl">
        <Eyebrow>Économie circulaire</Eyebrow>
        <h2 className="mt-6 text-hero text-ink">
          Réparer, réemployer,
          <br />
          <span className="text-emerald">refuser le gaspillage.</span>
        </h2>
        <p className="mt-6 text-[16px] leading-relaxed text-ink-500">
          Le modèle linéaire "extraire → fabriquer → utiliser → jeter" est intenable. L'économie
          circulaire boucle le cycle : ce qui peut être réparé est réparé, ce qui ne l'est plus
          est démonté pour récupérer ses composants. À chaque étape, on évite l'extraction
          minière, on réduit les émissions et on prolonge la valeur des matériaux.
        </p>
      </div>

      <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-ink/8 md:grid-cols-3">
        <CircularStep
          number="01"
          title="Réparation prioritaire"
          description="Avant toute autre option, nous évaluons la réparabilité. Un écran cassé n'est pas une fin de vie — c'est une intervention de 90 minutes."
        />
        <CircularStep
          number="02"
          title="Reconditionnement local"
          description="Les appareils non récupérables par leur propriétaire sont reconditionnés dans notre atelier à Lorient, testés, garantis 12 mois, et revendus."
        />
        <CircularStep
          number="03"
          title="Recyclage responsable"
          description="En dernier recours, les composants sont confiés à un éco-organisme partenaire pour récupération matière (cuivre, terres rares, plastiques)."
        />
      </div>
    </Section>
  );
}

function CircularStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-bone p-7 md:p-8">
      <p className="font-mono text-xs tracking-[0.2em] text-emerald">{number}</p>
      <h3 className="mt-6 text-h2 text-ink">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{description}</p>
    </div>
  );
}

/* ─────────────────────────────────  BRETAGNE LOCAL  ───────────────────────────────── */
function BretagneLocal() {
  return (
    <Section className="border-t border-ink/8 bg-mist/30">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>Ancré en Bretagne</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Une réparation
            <br />
            <span className="text-emerald">de proximité.</span>
          </h2>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-500">
            Notre activité de recyclage électronique, de réparation de smartphones et de
            reconditionnement est ancrée à Lorient et rayonne sur l'ensemble du Morbihan,
            de l'Ille-et-Vilaine, du Finistère et des Côtes-d'Armor. Choisir un acteur breton,
            c'est garder la valeur ajoutée localement, créer des emplois en région et réduire
            l'empreinte logistique de chaque intervention.
          </p>
        </div>

        <div className="space-y-3 lg:col-span-7">
          <LocalCard
            icon={MapPin}
            title="Atelier à Lorient"
            description="Notre site principal accueille les dépôts directs, les diagnostics complexes et le reconditionnement. Tous nos techniciens y travaillent."
          />
          <LocalCard
            icon={Users}
            title="Réseau de proximité"
            description="Nous nous appuyons sur un réseau de partenaires locaux en Bretagne pour la collecte de matériel, l'accompagnement social et la sensibilisation au numérique responsable."
          />
          <LocalCard
            icon={Leaf}
            title="Circuit court électronique"
            description="Les pièces détachées proviennent de fournisseurs européens autant que possible. Les appareils reconditionnés sont sourcés en France et reconditionnés localement."
          />
        </div>
      </div>
    </Section>
  );
}

function LocalCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-bone p-6 md:p-7">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <div>
          <h3 className="text-[17px] font-medium tracking-tight text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────  CTA  ───────────────────────────────── */
function FinalCTA() {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-bone p-10 md:p-16">
        <div className="absolute inset-0 gradient-mesh opacity-60" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <Eyebrow>Passez à l'action</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Votre appareil mérite
            <br />
            <span className="text-emerald">une seconde vie.</span>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-500">
            Que vous ayez un appareil à faire réparer ou que vous cherchiez à acheter
            reconditionné, vous participez concrètement à l'économie circulaire bretonne.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/diagnostic"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-bone shadow-soft transition-all hover:bg-ink-700 hover:shadow-lift"
            >
              Diagnostic gratuit
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/boutique"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-ink/15 bg-bone px-7 text-[15px] font-medium text-ink transition-all hover:border-ink/30 hover:bg-mist/40"
            >
              Voir la boutique reconditionné
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
