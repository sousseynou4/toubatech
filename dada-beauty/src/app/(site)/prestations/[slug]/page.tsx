import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarHeart, Clock, MessageCircle, Wallet } from 'lucide-react';
import { ArtImage } from '@/components/ui/art-image';
import { ButtonLink, buttonClass } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getService, getSettings, isServiceBookable } from '@/server/catalog';
import { formatDuration, formatPrice, formatXOF } from '@/lib/format';
import { whatsappLink } from '@/lib/phone';

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<'/prestations/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  if (!s) return { title: 'Prestation' };
  return {
    title: `${s.name} à Guédiawaye, Dakar`,
    description: s.short_description ?? `${s.name} chez Dada Beauty, institut de beauté à Guédiawaye (Deux Boulangeries).`,
    alternates: { canonical: `/prestations/${s.slug}` },
  };
}

export default async function ServicePage({ params }: PageProps<'/prestations/[slug]'>) {
  const { slug } = await params;
  const [service, { settings }] = await Promise.all([getService(slug), getSettings()]);
  if (!service) notFound();
  const bookable = isServiceBookable(service) && settings.online_booking_enabled;
  const deposit = service.deposit_amount ?? (service.price !== null && settings.deposit_policy === 'percent'
    ? Math.round((service.price * settings.deposit_value) / 100)
    : settings.deposit_policy === 'fixed' ? Math.min(settings.deposit_value, service.price ?? 0) : 0);

  return (
    <div className="container-page py-10 sm:py-16">
      <Link href="/prestations" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Toutes les prestations</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ArtImage src={service.image?.public_url} alt={service.image?.alt || service.name} theme={service.category?.slug} label={service.name} priority className="aspect-[4/5] rounded-[2rem]" />
        <div className="lg:py-6">
          <p className="eyebrow">{service.category?.name}</p>
          <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">{service.name}</h1>
          {service.short_description && <p className="mt-5 text-lg leading-relaxed text-ink-soft">{service.short_description}</p>}
          <dl className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-powder-50 p-4"><dt className="flex items-center gap-1.5 text-xs text-muted"><Wallet className="size-3.5" /> Tarif</dt><dd className="mt-1 font-semibold">{formatPrice(service.price, service.price_is_from)}</dd></div>
            <div className="rounded-2xl bg-powder-50 p-4"><dt className="flex items-center gap-1.5 text-xs text-muted"><Clock className="size-3.5" /> Durée</dt><dd className="mt-1 font-semibold">{formatDuration(service.duration_minutes)}</dd></div>
          </dl>
          {deposit > 0 && bookable && <p className="mt-4 text-sm text-muted">Un acompte de <strong className="text-ink">{formatXOF(deposit)}</strong> peut être demandé pour confirmer le rendez-vous.</p>}
          {service.description && <div className="mt-8 whitespace-pre-line leading-relaxed text-ink-soft">{service.description}</div>}
          {service.conditions && (
            <div className="mt-6 rounded-2xl border border-line p-4 text-sm text-ink-soft"><p className="mb-1 font-semibold text-ink">Conditions</p><p className="whitespace-pre-line">{service.conditions}</p></div>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {bookable ? (
              <ButtonLink href={`/reserver?prestation=${service.slug}`} size="lg"><CalendarHeart className="size-5" /> Réserver cette prestation</ButtonLink>
            ) : service.requires_quote ? (
              <ButtonLink href="/evenements" size="lg">Demander un devis</ButtonLink>
            ) : (
              <Badge tone="gold" className="self-start px-4 py-2 text-sm">Réservation sur WhatsApp pour cette prestation</Badge>
            )}
            <a href={whatsappLink(`Bonjour Dada Beauty, je souhaite des informations sur la prestation « ${service.name} ».`, settings.whatsapp_phone)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'lg')}>
              <MessageCircle className="size-5" /> Poser une question
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
