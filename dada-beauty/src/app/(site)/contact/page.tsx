import type { Metadata } from 'next';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { HoursList } from '@/components/site/footer';
import { ArtImage } from '@/components/ui/art-image';
import { buttonClass } from '@/components/ui/button';
import { Section, SectionHeading } from '@/components/ui/section';
import { getBusinessHours, getSettings } from '@/server/catalog';
import { formatPhone, telLink, whatsappLink } from '@/lib/phone';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Contact & accès — Guédiawaye, Deux Boulangeries',
  description: 'Contactez Dada Beauty par téléphone ou WhatsApp au +221 77 808 88 93. Institut situé à Guédiawaye, secteur Deux Boulangeries, Dakar.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const [{ settings }, hours] = await Promise.all([getSettings(), getBusinessHours()]);
  return (
    <Section>
      <SectionHeading as="h1" eyebrow="Contact" title={<>Parlons de votre <em className="text-rosewood">prochain rendez-vous</em></>} intro="Le moyen le plus rapide de nous joindre est WhatsApp." />
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-4">
          <a href={whatsappLink('Bonjour Dada Beauty !', settings.whatsapp_phone)} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 p-5 hover:shadow-lift">
            <span className="grid size-12 place-items-center rounded-full bg-[#25D366]/15 text-[#128C4B]"><MessageCircle className="size-6" /></span>
            <span><span className="block font-semibold">WhatsApp</span><span className="text-sm text-muted">{formatPhone(settings.whatsapp_phone)}</span></span>
          </a>
          <a href={telLink(settings.phone)} className="card flex items-center gap-4 p-5 hover:shadow-lift">
            <span className="grid size-12 place-items-center rounded-full bg-powder-100 text-rosewood"><Phone className="size-6" /></span>
            <span><span className="block font-semibold">Téléphone</span><span className="text-sm text-muted">{formatPhone(settings.phone)}</span></span>
          </a>
          {settings.email && (
            <a href={`mailto:${settings.email}`} className="card flex items-center gap-4 p-5 hover:shadow-lift">
              <span className="grid size-12 place-items-center rounded-full bg-powder-100 text-rosewood"><Mail className="size-6" /></span>
              <span><span className="block font-semibold">Email</span><span className="text-sm text-muted">{settings.email}</span></span>
            </a>
          )}
          <div className="card p-5">
            <p className="flex items-center gap-2 font-semibold"><MapPin className="size-5 text-rosewood" /> Adresse</p>
            <p className="mt-2 text-ink-soft">{settings.address_line}<br />{settings.city}, {settings.country}</p>
            <p className="mt-2 text-xs text-muted">Besoin d&apos;un repère précis ? Écrivez-nous sur WhatsApp, nous vous guidons.</p>
          </div>
          <div className="card p-5">
            <p className="flex items-center gap-2 font-semibold"><Clock className="size-5 text-rosewood" /> Horaires</p>
            <HoursList hours={hours} className="mt-3 text-sm text-ink-soft" />
          </div>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-line">
          {settings.map_embed_url ? (
            <iframe title="Carte d'accès Dada Beauty" src={settings.map_embed_url} className="h-full min-h-[28rem] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="relative h-full min-h-[28rem]">
              <ArtImage alt="Carte d'accès" theme="salon" label="Guédiawaye" className="absolute inset-0" showPlaceholderTag={false} />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 p-4 text-sm text-ink-soft backdrop-blur">
                La carte interactive sera ajoutée dès que l&apos;emplacement exact du salon aura été validé.
                <a href={whatsappLink('Bonjour, pouvez-vous m\'envoyer la localisation du salon ?', settings.whatsapp_phone)} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'sm', 'mt-3 w-full')}>Recevoir la localisation sur WhatsApp</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
