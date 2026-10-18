import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowUpRight,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Sparkles,
  Wrench,
  CircuitBoard,
  Droplets,
  HardDrive,
  CreditCard,
  Truck,
  Check,
} from 'lucide-react';
import { Section, Eyebrow } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { SITE_URL } from '@/lib/site';
import { FAQAccordion } from './FAQAccordion';
import { SERVICES, PRICING, PROCESS_STEPS, FAQ, type RepairService } from './data';

export const metadata: Metadata = {
  title: 'Réparation smartphone, tablette & ordinateur à Lorient — Morbihan',
  description:
    "Réparation experte de smartphones, tablettes et ordinateurs à Lorient et dans tout le Morbihan : écran cassé, batterie, micro-soudure, désoxydation, récupération de données. Diagnostic gratuit, garantie 12 mois, déplacement à domicile.",
  alternates: { canonical: '/reparation' },
  openGraph: {
    title: 'Réparation experte à Lorient & Morbihan — TOUBA TECH',
    description:
      "Du remplacement d'écran à la micro-soudure : tous niveaux d'expertise sous un même toit, à Lorient. Garantie 12 mois. Devis gratuit.",
    url: '/reparation',
  },
};

const SERVICE_ICONS: Record<string, typeof Wrench> = {
  'remplacement-standard': Wrench,
  'micro-soudure': CircuitBoard,
  'desoxydation': Droplets,
  'recuperation-donnees': HardDrive,
};

const LEVEL_TONES: Record<RepairService['level'], string> = {
  Standard: 'border-ink/12 bg-ink/5 text-ink',
  Avancé: 'border-amber-200 bg-amber-50 text-amber-800',
  Expert: 'border-emerald/20 bg-emerald/5 text-emerald',
};

export default function ReparationPage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Services />
      <Process />
      <Pricing />
      <Coverage />
      <FAQSection />
      <FinalCTA />

      {/* JSON-LD: Service + FAQPage + BreadcrumbList */}
      <SchemaMarkup />
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
        {/* Breadcrumb */}
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase"
        >
          <Link href="/" className="transition-colors hover:text-ink">
            Accueil
          </Link>
          <span className="mx-2 text-ink-300">/</span>
          <span className="text-ink">Réparation</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Eyebrow>Service à Lorient · Morbihan · Bretagne</Eyebrow>
            <h1 className="mt-6 text-display text-ink">
              Réparation experte
              <br />
              <span className="text-emerald">pour vos appareils.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[18px] leading-relaxed text-ink-500">
              Smartphone, tablette, console, ordinateur : du remplacement d'écran courant à la
              micro-soudure de précision, nos techniciens à Lorient redonnent vie à votre
              électronique. Diagnostic gratuit, devis transparent, garantie 12 mois.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/diagnostic">
                <Button size="lg" className="w-full sm:w-auto">
                  Diagnostic gratuit en ligne
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="tel:+33000000000">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Phone className="h-3.5 w-3.5" />
                  Nous appeler
                </Button>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <HighlightCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function HighlightCard() {
  const facts = [
    { icon: Clock, label: 'Diagnostic sous 24h ouvrées' },
    { icon: ShieldCheck, label: 'Garantie 12 mois pièces & main-d\'œuvre' },
    { icon: MapPin, label: 'Atelier à Lorient · Morbihan' },
    { icon: Truck, label: 'Déplacement à domicile possible' },
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-bone p-7 shadow-soft md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald/8 blur-3xl" />
      <div className="relative">
        <p className="font-mono text-[10px] tracking-[0.22em] text-emerald uppercase">
          Engagement TOUBA TECH
        </p>
        <p className="mt-3 text-[18px] leading-relaxed text-ink">
          Un service de réparation de proximité, des techniques de niveau industriel.
        </p>
        <ul className="mt-7 space-y-4">
          {facts.map((fact) => (
            <li key={fact.label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink">
                <fact.icon className="h-4 w-4" strokeWidth={1.6} />
              </span>
              <span className="text-[14px] text-ink-600">{fact.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────────────  TRUST STRIP  ───────────────────────────────── */
function TrustStrip() {
  const items = [
    { icon: ShieldCheck, title: '12 mois', subtitle: 'Garantie totale' },
    { icon: Clock, title: '< 24h', subtitle: 'Diagnostic' },
    { icon: CreditCard, title: 'Paiement', subtitle: 'En 3 ou 4 fois sans frais' },
    { icon: MapPin, title: 'Morbihan', subtitle: 'Service de proximité' },
  ];
  return (
    <section className="border-b border-ink/8 bg-mist/30">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 py-10 md:grid-cols-4 md:px-8 md:py-12">
        {items.map((item) => (
          <div key={item.title} className="flex items-center gap-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-bone text-emerald shadow-soft">
              <item.icon className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium tracking-tight text-ink">{item.title}</p>
              <p className="text-xs text-ink-400">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────  SERVICES  ───────────────────────────────── */
function Services() {
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>Notre expertise</Eyebrow>
        <h2 className="mt-6 text-hero text-ink">
          Quatre niveaux d'intervention,
          <br />
          <span className="text-emerald">un seul atelier à Lorient.</span>
        </h2>
        <p className="mt-6 text-[16px] leading-relaxed text-ink-500">
          De la réparation courante à l'intervention de pointe en micro-soudure, nous prenons en
          charge l'ensemble du spectre technique. Là où d'autres déclarent un appareil
          irréparable, nous regardons de plus près.
        </p>
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-2">
        {SERVICES.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
    </Section>
  );
}

function ServiceCard({ service }: { service: RepairService }) {
  const Icon = SERVICE_ICONS[service.slug] ?? Wrench;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-bone p-7 transition-all hover:border-ink/25 hover:shadow-lift md:p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5 text-ink transition-colors group-hover:bg-ink group-hover:text-bone">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase ${LEVEL_TONES[service.level]}`}
        >
          {service.level === 'Expert' && <Sparkles className="h-3 w-3" />}
          {service.level}
        </span>
      </div>

      <h3 className="mt-7 text-h2 text-ink">{service.title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{service.shortDescription}</p>
      <p className="mt-4 text-sm leading-relaxed text-ink-500">{service.longDescription}</p>

      <ul className="mt-6 space-y-2.5 border-t border-ink/8 pt-6">
        {service.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-600">
            <Check
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald"
              strokeWidth={2.5}
            />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-7 flex items-center justify-between border-t border-ink/8 pt-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
            Délai indicatif
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{service.averageDuration}</p>
        </div>
        <Link
          href="/diagnostic"
          className="inline-flex items-center gap-1.5 text-sm text-ink transition-transform group-hover:translate-x-0.5"
        >
          Demander un diagnostic
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

/* ─────────────────────────────────  PROCESS  ───────────────────────────────── */
function Process() {
  return (
    <Section className="border-t border-ink/8 bg-ink text-bone">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-emerald uppercase">
          <span className="h-px w-6 bg-emerald" aria-hidden="true" />
          Comment ça marche
        </span>
        <h2 className="mt-6 text-hero text-bone">
          Quatre étapes. Pas de mauvaise surprise.
        </h2>
        <p className="mt-6 text-[16px] leading-relaxed text-bone/70">
          Un processus transparent du premier clic à la restitution. Vous savez exactement où en
          est votre appareil, à chaque étape.
        </p>
      </div>

      <ol className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-bone/10 md:grid-cols-2 lg:grid-cols-4">
        {PROCESS_STEPS.map((step) => (
          <li key={step.number} className="bg-ink p-7 md:p-8">
            <p className="font-mono text-[12px] font-medium tracking-[0.2em] text-emerald">
              {step.number}
            </p>
            <h3 className="mt-5 text-[17px] font-medium tracking-tight text-bone">
              {step.title}
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-bone/65">
              {step.description}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/diagnostic">
          <Button size="lg" variant="emerald">
            Démarrer mon diagnostic gratuit
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Link>
        <p className="text-sm text-bone/60">
          Sans engagement · Réponse sous 24h ouvrées
        </p>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────  PRICING  ───────────────────────────────── */
function Pricing() {
  return (
    <Section>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <Eyebrow>Grille indicative</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Tarifs transparents
            <br />
            <span className="text-emerald">pas de mauvaise surprise.</span>
          </h2>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-500">
            Voici nos tarifs de départ sur les modèles les plus demandés. Le prix final est
            toujours confirmé après diagnostic et systématiquement validé par vous avant toute
            intervention.
          </p>
        </div>
        <p className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase md:text-right">
          Prix nets · À partir de
        </p>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        {PRICING.map((catalog) => (
          <PriceCard key={catalog.brand} catalog={catalog} />
        ))}
      </div>

      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ink-400">
        Tarifs donnés à titre indicatif et susceptibles d'évoluer selon le modèle précis et
        l'état de l'appareil. Devis ferme et définitif communiqué après diagnostic. Réparations
        éligibles au bonus réparation État dans le cadre du label QualiRépar (en cours
        d'obtention).
      </p>
    </Section>
  );
}

function PriceCard({ catalog }: { catalog: typeof PRICING[number] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink/10 bg-bone">
      <div className="border-b border-ink/8 bg-mist/40 px-7 py-5 md:px-8">
        <h3 className="text-[17px] font-medium tracking-tight text-ink">{catalog.brand}</h3>
        <p className="mt-1 text-xs text-ink-400">{catalog.popular}</p>
      </div>
      <ul className="divide-y divide-ink/8">
        {catalog.items.map((item) => (
          <li
            key={item.service}
            className="flex items-baseline justify-between gap-4 px-7 py-4 md:px-8"
          >
            <div className="min-w-0">
              <p className="text-[15px] text-ink">{item.service}</p>
              {item.note && <p className="mt-0.5 text-[11px] text-ink-400">{item.note}</p>}
            </div>
            <p className="flex items-baseline gap-1 font-mono text-[15px] font-medium tracking-tight text-ink whitespace-nowrap">
              <span className="text-[10px] tracking-normal text-ink-400 uppercase">dès</span>
              {item.price}€
            </p>
          </li>
        ))}
      </ul>
      <div className="border-t border-ink/8 px-7 py-4 md:px-8">
        <Link
          href="/diagnostic"
          className="inline-flex items-center gap-1.5 text-sm text-ink transition-transform hover:translate-x-0.5"
        >
          Obtenir un devis pour mon modèle
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────  COVERAGE  ───────────────────────────────── */
function Coverage() {
  const zones = [
    {
      title: 'Au siège à Lorient',
      description:
        'Dépôt direct dans notre atelier en centre-ville, sans rendez-vous pour les réparations courantes. Stationnement à proximité.',
      tag: 'Recommandé',
    },
    {
      title: 'Points relais Morbihan',
      description:
        'Réseau de points de dépôt partenaires à Vannes, Quimperlé, Pontivy, Auray, Hennebont et plus. Idéal si Lorient est loin de chez vous.',
      tag: 'Pratique',
    },
    {
      title: 'Déplacement à domicile',
      description:
        "Un technicien se déplace dans tout le Morbihan pour les particuliers à mobilité réduite ou les professionnels souhaitant éviter une coupure d'activité.",
      tag: 'Sur devis',
    },
  ];
  return (
    <Section className="border-t border-ink/8">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>Zone d'intervention</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Lorient, Morbihan,
            <br />
            <span className="text-emerald">toute la Bretagne sud.</span>
          </h2>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-500">
            Réparer en circuit court, c'est soutenir l'économie locale bretonne, réduire
            l'empreinte carbone de votre appareil et bénéficier d'un interlocuteur joignable.
            Notre atelier à Lorient rayonne sur l'ensemble du Morbihan.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              'Lorient',
              'Lanester',
              'Hennebont',
              'Auray',
              'Vannes',
              'Quimperlé',
              'Ploemeur',
              'Larmor-Plage',
              'Pontivy',
            ].map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-bone px-3 py-1 text-xs text-ink-600"
              >
                <MapPin className="h-3 w-3 text-emerald" />
                {city}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 lg:col-span-7">
          {zones.map((zone) => (
            <div
              key={zone.title}
              className="rounded-2xl border border-ink/10 bg-bone p-6 md:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[17px] font-medium tracking-tight text-ink">
                  {zone.title}
                </h3>
                <span className="inline-flex items-center rounded-full border border-emerald/20 bg-emerald/5 px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] text-emerald uppercase">
                  {zone.tag}
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
                {zone.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────  FAQ  ───────────────────────────────── */
function FAQSection() {
  return (
    <Section className="border-t border-ink/8 bg-mist/30">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Eyebrow>Questions fréquentes</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            On répond à vos doutes.
          </h2>
          <p className="mt-6 text-[15px] leading-relaxed text-ink-500">
            Une question qui ne figure pas ici ? Notre équipe à Lorient est disponible par
            téléphone ou via le formulaire de diagnostic.
          </p>
          <Link
            href="/diagnostic"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline"
          >
            Poser ma question
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="lg:col-span-8">
          <FAQAccordion items={FAQ} />
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────  FINAL CTA  ───────────────────────────────── */
function FinalCTA() {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-bone p-10 md:p-16">
        <div className="absolute inset-0 gradient-mesh opacity-60" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <Eyebrow>Prêt à redonner vie à votre appareil ?</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Décrivez votre panne.
            <br />
            <span className="text-emerald">On s'occupe du reste.</span>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-500">
            Formulaire intelligent en 2 minutes. Notre équipe à Lorient analyse votre demande et
            vous transmet un pré-diagnostic et un devis sous 24h ouvrées. Sans engagement.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/diagnostic">
              <Button size="lg">
                Démarrer le diagnostic
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/reconditionne">
              <Button size="lg" variant="secondary">
                Voir le reconditionné
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────  SCHEMA.ORG  ───────────────────────────────── */
function SchemaMarkup() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            serviceType: "Réparation d'appareils électroniques",
            provider: {
              '@type': 'LocalBusiness',
              name: 'TOUBA TECH',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Lorient',
                postalCode: '56100',
                addressCountry: 'FR',
              },
            },
            areaServed: [
              { '@type': 'City', name: 'Lorient' },
              { '@type': 'AdministrativeArea', name: 'Morbihan' },
              { '@type': 'AdministrativeArea', name: 'Bretagne' },
            ],
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Services de réparation',
              itemListElement: SERVICES.map((service) => ({
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: service.title,
                  description: service.shortDescription,
                },
              })),
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Accueil',
                item: `${SITE_URL}/`,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Réparation',
                item: `${SITE_URL}/reparation`,
              },
            ],
          }),
        }}
      />
    </>
  );
}
