import Link from 'next/link';
import { Clock, MapPin, Phone } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { formatPhone, telLink, whatsappLink } from '@/lib/phone';
import { WEEKDAYS_FR } from '@/lib/format';
import type { BusinessHour, BusinessSettings } from '@/lib/types';

export function HoursList({ hours, className }: { hours: BusinessHour[]; className?: string }) {
  const configured = hours.some((h) => !h.is_closed);
  if (!configured) return <p className={className}>Horaires communiqués prochainement — écrivez-nous sur WhatsApp.</p>;
  return (
    <ul className={className}>
      {hours.map((h) => (
        <li key={h.weekday} className="flex justify-between gap-4 py-0.5">
          <span>{WEEKDAYS_FR[h.weekday - 1]}</span>
          <span className="tabular-nums">{h.is_closed ? 'Fermé' : `${h.open_time?.slice(0, 5)} – ${h.close_time?.slice(0, 5)}`}</span>
        </li>
      ))}
    </ul>
  );
}

export function Footer({ settings, hours }: { settings: BusinessSettings; hours: BusinessHour[] }) {
  const socials = [
    ['Instagram', settings.instagram_url], ['Facebook', settings.facebook_url],
    ['TikTok', settings.tiktok_url], ['Snapchat', settings.snapchat_url],
  ].filter(([, url]) => url) as [string, string][];

  return (
    <footer className="mt-auto border-t border-line bg-powder-50">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Maquillage, onglerie, cils, coiffure et perruques — un institut pensé pour sublimer chaque femme.
          </p>
          {socials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socials.map(([name, url]) => (
                <li key={name}><a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink-soft hover:border-rosewood hover:text-rosewood">{name}</a></li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="eyebrow mb-4">Nous trouver</h2>
          <p className="flex gap-2 text-sm text-ink-soft"><MapPin className="mt-0.5 size-4 shrink-0 text-rosewood" />{settings.address_line}<br />{settings.city}, {settings.country}</p>
          <p className="mt-3 flex gap-2 text-sm"><Phone className="mt-0.5 size-4 shrink-0 text-rosewood" /><a href={telLink(settings.phone)} className="hover:text-rosewood">{formatPhone(settings.phone)}</a></p>
          <a href={whatsappLink(undefined, settings.whatsapp_phone)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-rosewood underline-offset-4 hover:underline">WhatsApp</a>
        </div>
        <div>
          <h2 className="eyebrow mb-4 flex items-center gap-2"><Clock className="size-3.5" /> Horaires</h2>
          <HoursList hours={hours} className="text-sm text-ink-soft" />
        </div>
        <div>
          <h2 className="eyebrow mb-4">Navigation</h2>
          <ul className="grid gap-2 text-sm text-ink-soft">
            {[['/prestations', 'Nos prestations'], ['/reserver', 'Réserver'], ['/evenements', 'Mariages & événements'], ['/boutique', 'Boutique'], ['/galerie', 'Galerie'], ['/suivi', 'Suivre une réservation ou une commande'], ['/contact', 'Contact']].map(([href, label]) => (
              <li key={href}><Link href={href!} className="hover:text-rosewood">{label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.business_name}. Tous droits réservés.</p>
          <ul className="flex flex-wrap gap-4">
            <li><Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link></li>
            <li><Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link></li>
            <li><Link href="/conditions" className="hover:text-ink">Conditions de réservation et de vente</Link></li>
            <li><Link href="/admin" className="hover:text-ink">Espace équipe</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
