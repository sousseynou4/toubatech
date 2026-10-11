import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Wrench, Recycle, Cpu, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { Section, Eyebrow } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValueProps />
      <ServicesOverview />
      <TrustStrip />
      <FinalCTA />
    </>
  );
}

/* ─────────────────────────────────  HERO  ───────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 gradient-mesh" aria-hidden="true" />
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 md:px-8 md:pb-30 md:pt-22">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Copy */}
          <div className="lg:col-span-7">
            <Eyebrow>Lorient · Morbihan · Bretagne</Eyebrow>
            <h1 className="mt-6 text-display text-ink">
              Réparation experte.
              <br />
              <span className="text-emerald">Économie circulaire.</span>
              <br />
              Impact local.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-500">
              TOUBA TECH redonne vie à vos appareils électroniques — du diagnostic à la
              micro-soudure, en passant par le reconditionné garanti 12 mois.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/diagnostic">
                <Button size="lg" className="w-full sm:w-auto">
                  Démarrer un diagnostic
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/reconditionne">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Voir le reconditionné
                </Button>
              </Link>
            </div>

            {/* Quick info chips */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-500">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-emerald" />
                Lorient & Morbihan
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-emerald" />
                Diagnostic sous 24h
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
                Garantie 12 mois
              </span>
            </div>
          </div>

          {/* Visual placeholder — animated repair illustration */}
          <div className="relative lg:col-span-5">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative aspect-square w-full max-w-md mx-auto">
      {/* Decorative outer ring */}
      <div className="absolute inset-0 rounded-full border border-ink/10 animate-pulse-soft" />
      <div className="absolute inset-8 rounded-full border border-emerald/15" />

      {/* Centered card with phone glyph */}
      <div className="absolute inset-12 flex items-center justify-center rounded-[2rem] border border-ink/10 bg-bone shadow-lift">
        <svg viewBox="0 0 200 200" className="h-3/5 w-3/5" aria-hidden="true">
          {/* Phone outline */}
          <rect x="60" y="30" width="80" height="140" rx="14" fill="none" stroke="#003366" strokeWidth="2.5" />
          <rect x="68" y="42" width="64" height="110" rx="4" fill="#F0F0F0" />
          {/* Repair check */}
          <circle cx="100" cy="97" r="22" fill="#339966" />
          <path d="M89 97 L97 105 L112 89" stroke="#FAFAF7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Speaker dot */}
          <circle cx="100" cy="36" r="1.5" fill="#003366" />
          {/* Home indicator */}
          <rect x="88" y="159" width="24" height="3" rx="1.5" fill="#003366" opacity="0.3" />
        </svg>
      </div>

      {/* Floating annotations */}
      <Annotation
        position="-top-2 right-4"
        icon={<Wrench className="h-3 w-3" />}
        label="Micro-soudure"
      />
      <Annotation
        position="bottom-8 -left-4"
        icon={<Recycle className="h-3 w-3" />}
        label="Réemploi"
        emerald
      />
    </div>
  );
}

function Annotation({
  position,
  icon,
  label,
  emerald,
}: {
  position: string;
  icon: React.ReactNode;
  label: string;
  emerald?: boolean;
}) {
  return (
    <div
      className={`absolute ${position} flex items-center gap-2 rounded-full border bg-bone/90 px-3 py-1.5 text-xs shadow-soft backdrop-blur-sm ${
        emerald ? 'border-emerald/20 text-emerald' : 'border-ink/15 text-ink'
      }`}
    >
      {icon}
      <span className="font-mono text-[10px] tracking-[0.15em] uppercase">{label}</span>
    </div>
  );
}

/* ─────────────────────────────────  VALUE PROPS  ───────────────────────────────── */
function ValueProps() {
  const items = [
    {
      number: '01',
      eyebrow: 'Impact environnemental',
      title: 'Chaque appareil sauvé évite jusqu\'à 80kg de CO₂',
      description:
        "Un smartphone réparé, c'est une nouvelle vie de plusieurs années pour un appareil dont la production a déjà été réalisée. Nous mesurons et publions notre impact.",
    },
    {
      number: '02',
      eyebrow: 'Service local',
      title: 'Lorient, Morbihan, et déplacement à domicile',
      description:
        'Dépôt au siège, réseau de points relais ou déplacement à votre domicile. Notre équipe est implantée en Bretagne pour une réactivité maximale.',
    },
    {
      number: '03',
      eyebrow: 'Expertise technique',
      title: 'Micro-soudure et désoxydation en salle blanche',
      description:
        'Là où d\'autres déclarent un appareil irréparable, nos techniciens interviennent au composant près sur les cartes mères les plus complexes.',
    },
  ];

  return (
    <Section>
      <Eyebrow>Notre approche</Eyebrow>
      <h2 className="mt-6 max-w-3xl text-hero text-ink">
        Trois engagements concrets pour vos appareils.
      </h2>
      <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-ink/8 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.number} className="bg-bone p-8 md:p-10">
            <p className="font-mono text-xs tracking-[0.2em] text-emerald">{item.number}</p>
            <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">
              {item.eyebrow}
            </p>
            <h3 className="mt-3 text-h2 text-ink">{item.title}</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">{item.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────────────  SERVICES  ───────────────────────────────── */
function ServicesOverview() {
  const services = [
    {
      href: '/reparation',
      icon: Wrench,
      title: 'Réparation',
      description: 'Smartphones, tablettes, consoles, ordinateurs. Diagnostic gratuit, devis sous 24h.',
    },
    {
      href: '/reconditionne',
      icon: Recycle,
      title: 'Reconditionné',
      description: 'iPhone, Galaxy, iPad reconditionnés et garantis 12 mois. Origine traçable.',
    },
    {
      href: '/pieces-detachees',
      icon: Cpu,
      title: 'Pièces détachées',
      description: 'Catalogue pour particuliers et pros. Écrans, batteries, connecteurs, cartes mères.',
    },
  ];

  return (
    <Section className="border-t border-ink/8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Services</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">Trois pôles. Une exigence.</h2>
        </div>
        <Link
          href="/reparation"
          className="inline-flex items-center gap-1.5 self-start text-sm text-ink-600 transition-colors hover:text-ink"
        >
          Découvrir tous les services
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {services.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group relative overflow-hidden rounded-3xl border border-ink/10 bg-bone p-8 transition-all hover:border-ink/25 hover:shadow-lift"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5 text-ink transition-colors group-hover:bg-ink group-hover:text-bone">
              <s.icon className="h-5 w-5" strokeWidth={1.6} />
            </div>
            <h3 className="mt-6 text-h2 text-ink">{s.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{s.description}</p>
            <div className="mt-8 inline-flex items-center gap-1.5 text-sm text-ink transition-transform group-hover:translate-x-0.5">
              Explorer
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────────────  TRUST  ───────────────────────────────── */
function TrustStrip() {
  const stats = [
    { value: '2 500+', label: 'Appareils sauvés' },
    { value: '< 24h', label: 'Délai de diagnostic' },
    { value: '12 mois', label: 'Garantie reconditionné' },
    { value: '4,9 / 5', label: 'Satisfaction client' },
  ];
  return (
    <Section className="border-t border-ink/8 bg-ink text-bone">
      <div className="grid gap-y-10 sm:grid-cols-2 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-display font-medium tracking-tight text-bone">{s.value}</p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-bone/60 uppercase">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────────────  CTA  ───────────────────────────────── */
function FinalCTA() {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-bone p-10 md:p-16">
        <div className="absolute inset-0 gradient-mesh opacity-60" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <Eyebrow>Diagnostic personnalisé</Eyebrow>
          <h2 className="mt-6 text-hero text-ink">
            Décrivez votre panne, recevez une estimation sous 24h.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-500">
            Notre formulaire intelligent collecte les bonnes informations en 2 minutes. Nos
            techniciens à Lorient analysent votre demande et reviennent vers vous.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/diagnostic">
              <Button size="lg">
                Démarrer le diagnostic
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Contacter l'équipe
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
