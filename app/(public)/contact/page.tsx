import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Eyebrow, Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { BUSINESS, FULL_ADDRESS } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact — atelier de réparation à Lorient',
  description:
    "Contacter TOUBA TECH, atelier de réparation de smartphones et tablettes à Lorient : 25 avenue du Général de Gaulle, 07 82 93 56 66, contact@toubatech.eu.",
  alternates: { canonical: '/contact' },
};

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`TOUBA TECH, ${FULL_ADDRESS}`)}`;

export default function ContactPage() {
  return (
    <Section>
      <Eyebrow>Lorient · Morbihan</Eyebrow>
      <h1 className="mt-6 text-hero text-ink">Contacter TOUBA TECH</h1>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-500">
        Pour une panne, le plus rapide est le diagnostic gratuit en ligne : vous recevez un
        pré-diagnostic et une estimation sous 24h ouvrées. Pour tout le reste, l'atelier est à
        votre écoute.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <ContactCard icon={<MapPin className="h-5 w-5" />} label="Atelier">
          <p>{FULL_ADDRESS}</p>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-emerald hover:underline">
            Itinéraire <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </ContactCard>
        <ContactCard icon={<Phone className="h-5 w-5" />} label="Téléphone">
          <a href={`tel:${BUSINESS.telephone}`} className="hover:text-emerald">{BUSINESS.telephoneDisplay}</a>
        </ContactCard>
        <ContactCard icon={<Mail className="h-5 w-5" />} label="E-mail">
          <a href={`mailto:${BUSINESS.email}`} className="hover:text-emerald">{BUSINESS.email}</a>
        </ContactCard>
        <ContactCard icon={<Clock className="h-5 w-5" />} label="Horaires">
          <p>Du lundi au samedi, 9h30–19h</p>
        </ContactCard>
      </div>

      <div className="mt-12">
        <Link href="/diagnostic">
          <Button size="lg">
            Démarrer un diagnostic gratuit
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Section>
  );
}

function ContactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-bone p-6 shadow-soft">
      <div className="flex items-center gap-2.5 text-emerald">
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">{label}</span>
      </div>
      <div className="mt-3 text-[16px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}
