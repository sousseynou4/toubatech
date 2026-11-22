import type { Metadata } from 'next';
import { Checkout } from '@/components/shop/checkout';
import { SectionHeading } from '@/components/ui/section';
import { getSettings } from '@/server/catalog';

export const metadata: Metadata = { title: 'Mon panier', robots: { index: false } };

export default async function CartPage() {
  const { settings } = await getSettings();
  return (
    <div className="container-page py-10 sm:py-16">
      <SectionHeading as="h1" eyebrow="Boutique" title="Mon panier" className="mb-10" />
      <Checkout settings={{
        shopEnabled: settings.shop_enabled, pickupEnabled: settings.pickup_enabled, deliveryEnabled: settings.delivery_enabled,
        deliveryFee: settings.delivery_fee, deliveryNote: settings.delivery_zones_note,
        paymentMethods: settings.accepted_payment_methods.filter((m) => m !== 'gift_card'), whatsapp: settings.whatsapp_phone,
      }} />
    </div>
  );
}
