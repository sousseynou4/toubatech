import type { Metadata } from 'next';
import { BookingWizard, type WizardCategory } from '@/components/booking/booking-wizard';
import { SectionHeading } from '@/components/ui/section';
import { getBusinessHours, getCategoriesWithServices, getSettings, isServiceBookable } from '@/server/catalog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Réserver un rendez-vous en ligne',
  description: 'Réservez votre rendez-vous beauté chez Dada Beauty à Guédiawaye : maquillage, onglerie, cils, coiffure. Créneaux disponibles en temps réel.',
  alternates: { canonical: '/reserver' },
};

export default async function BookingPage({ searchParams }: PageProps<'/reserver'>) {
  const { prestation } = await searchParams;
  const [{ settings }, categories, hours] = await Promise.all([getSettings(), getCategoriesWithServices(), getBusinessHours()]);
  const deposit = (price: number, own: number | null) => own ?? (settings.deposit_policy === 'percent' ? Math.round((price * settings.deposit_value) / 100) : settings.deposit_policy === 'fixed' ? Math.min(price, settings.deposit_value) : 0);

  const wizardCategories: WizardCategory[] = settings.online_booking_enabled ? categories
    .map((c) => ({
      slug: c.slug, name: c.name, tagline: c.tagline,
      services: c.services.filter(isServiceBookable).map((s) => ({
        id: s.id, slug: s.slug, name: s.name, short_description: s.short_description, description: s.description,
        price: s.price!, price_is_from: s.price_is_from, duration_minutes: s.duration_minutes!, deposit: deposit(s.price!, s.deposit_amount),
        conditions: s.conditions, imageUrl: s.image?.public_url ?? null,
      })),
    }))
    .filter((c) => c.services.length > 0) : [];

  return (
    <div className="bg-gradient-to-b from-powder-50 to-ivory">
      <div className="container-page py-10 sm:py-16">
        <SectionHeading as="h1" eyebrow="Réservation" title={<>Réserver un <em className="text-rosewood">rendez-vous</em></>} align="center" className="mb-10" />
        <BookingWizard
          categories={wizardCategories}
          initialService={typeof prestation === 'string' ? prestation : undefined}
          settings={{
            maxDaysAhead: settings.booking_max_days_ahead,
            closedWeekdays: hours.filter((h) => h.is_closed).map((h) => h.weekday),
            paymentMethods: settings.accepted_payment_methods.filter((m) => m !== 'gift_card'),
            whatsapp: settings.whatsapp_phone,
            waveMerchant: settings.wave_merchant_display,
            orangeMerchant: settings.orange_money_merchant_display,
            cancellationPolicy: settings.cancellation_policy,
          }}
        />
      </div>
    </div>
  );
}
