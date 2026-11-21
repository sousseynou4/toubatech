'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, Loader2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { Alert, Field, Input, Textarea } from '@/components/ui/field';
import { ArtImage } from '@/components/ui/art-image';
import { formatXOF } from '@/lib/format';
import { whatsappLink } from '@/lib/phone';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/types';
import { cn } from '@/lib/cn';
import { cart, useCart } from './cart-store';
import { submitOrder, type OrderConfirmation } from '@/server/public-actions';

export interface CheckoutSettings {
  shopEnabled: boolean; pickupEnabled: boolean; deliveryEnabled: boolean; deliveryFee: number | null; deliveryNote: string | null;
  paymentMethods: PaymentMethod[]; whatsapp: string;
}

export function Checkout({ settings }: { settings: CheckoutSettings }) {
  const lines = useCart();
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(settings.pickupEnabled ? 'pickup' : 'delivery');
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', deliveryAddress: '', deliveryNotes: '' });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OrderConfirmation | null>(null);
  const [pending, start] = useTransition();

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const fee = fulfillment === 'delivery' ? settings.deliveryFee ?? 0 : 0;

  if (done) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-powder-100"><Check className="size-8 text-rosewood" /></div>
        <h2 className="mt-5 font-display text-4xl">Merci pour votre commande !</h2>
        <div className="card mt-8 p-6 text-left text-sm">
          <p className="flex justify-between"><span className="text-muted">Référence</span><strong className="font-mono" data-testid="order-reference">{done.reference}</strong></p>
          <p className="mt-2 flex justify-between"><span className="text-muted">Code de suivi</span><strong className="font-mono">{done.tracking_code}</strong></p>
          <p className="mt-2 flex justify-between"><span className="text-muted">Total</span><strong>{formatXOF(done.total_amount)}</strong></p>
          <p className="mt-4 rounded-xl bg-powder-50 p-3 text-ink-soft">Le salon vérifie votre commande et vous contacte pour le paiement et le {fulfillment === 'pickup' ? 'retrait' : 'la livraison'}. Aucun paiement n&apos;a été prélevé.</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/suivi?type=commande`} className={buttonClass('primary')}>Suivre ma commande</Link>
          <a href={whatsappLink(`Bonjour, je viens de passer la commande ${done.reference}.`, settings.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline')}>Prévenir sur WhatsApp</a>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md text-center">
        <ShoppingBag className="mx-auto size-12 text-blush" />
        <p className="mt-4 font-display text-3xl">Votre panier est vide</p>
        <Link href="/boutique" className={buttonClass('primary', 'md', 'mt-6')}>Découvrir la boutique</Link>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    start(async () => {
      const r = await submitOrder({
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), fullName: form.fullName, phone: form.phone,
        email: form.email || undefined, fulfillment, deliveryAddress: form.deliveryAddress || undefined, deliveryNotes: form.deliveryNotes || undefined,
        paymentMethod: paymentMethod || undefined, marketingConsent: consent,
      });
      if (r.ok) { cart.clear(); setDone(r.data); window.scrollTo({ top: 0 }); }
      else { setError(r.error); setErrors(r.fields ?? {}); }
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <section aria-label="Articles">
        <ul className="divide-y divide-line rounded-[1.25rem] border border-line bg-white">
          {lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 p-4">
              <ArtImage src={l.imageUrl} alt={l.name} theme="boutique" label=" " className="size-20 shrink-0 rounded-xl" showPlaceholderTag={false} />
              <div className="flex flex-1 flex-col">
                <Link href={`/boutique/${l.productSlug}`} className="font-medium hover:text-rosewood">{l.name}</Link>
                {l.variantName !== 'Standard' && <span className="text-xs text-muted">{l.variantName}</span>}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-full border border-line">
                    <button className="grid size-9 place-items-center" onClick={() => cart.setQuantity(l.variantId, l.quantity - 1)} aria-label="Diminuer"><Minus className="size-3.5" /></button>
                    <span className="w-6 text-center text-sm tabular-nums">{l.quantity}</span>
                    <button className="grid size-9 place-items-center" onClick={() => cart.setQuantity(l.variantId, l.quantity + 1)} aria-label="Augmenter"><Plus className="size-3.5" /></button>
                  </div>
                  <span className="font-semibold">{formatXOF(l.unitPrice * l.quantity)}</span>
                </div>
              </div>
              <button onClick={() => cart.remove(l.variantId)} className="self-start p-1 text-muted hover:text-danger" aria-label={`Retirer ${l.name}`}><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Prix et disponibilités vérifiés par le salon au moment de la commande.</p>
      </section>

      <form className="card grid h-fit gap-4 p-6" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <h2 className="font-display text-2xl">Vos informations</h2>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Nom et prénom" htmlFor="c-name" error={errors.fullName}><Input id="c-name" autoComplete="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
        <Field label="Téléphone / WhatsApp" htmlFor="c-phone" error={errors.phone}><Input id="c-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
        <Field label="Email (facultatif)" htmlFor="c-email" error={errors.email}><Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <fieldset>
          <legend className="label">Mode de remise</legend>
          <div className="grid grid-cols-2 gap-2">
            {settings.pickupEnabled && <Choice active={fulfillment === 'pickup'} onClick={() => setFulfillment('pickup')} label="Retrait au salon" sub="Gratuit" />}
            {settings.deliveryEnabled && <Choice active={fulfillment === 'delivery'} onClick={() => setFulfillment('delivery')} label="Livraison" sub={settings.deliveryFee ? formatXOF(settings.deliveryFee) : 'Frais confirmés par le salon'} />}
          </div>
        </fieldset>
        {fulfillment === 'delivery' && (
          <>
            <Field label="Adresse de livraison" htmlFor="c-addr" error={errors.deliveryAddress}><Textarea id="c-addr" value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} /></Field>
            {settings.deliveryNote && <p className="text-xs text-muted">{settings.deliveryNote}</p>}
          </>
        )}
        <fieldset>
          <legend className="label">Paiement souhaité</legend>
          <div className="flex flex-wrap gap-2">
            {settings.paymentMethods.map((m) => <Choice key={m} active={paymentMethod === m} onClick={() => setPaymentMethod(m)} label={PAYMENT_METHOD_LABEL[m]} />)}
          </div>
          <p className="mt-2 text-xs text-muted">Aucun paiement n&apos;est prélevé en ligne : le salon vous confirme la commande et les modalités de paiement.</p>
        </fieldset>
        <label className="flex items-start gap-3 text-sm text-ink-soft">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-rosewood)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Recevoir les nouveautés et offres (facultatif)
        </label>
        <dl className="grid gap-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatXOF(subtotal)}</dd></div>
          {fulfillment === 'delivery' && <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd>{settings.deliveryFee ? formatXOF(fee) : 'À confirmer'}</dd></div>}
          <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatXOF(subtotal + fee)}</dd></div>
        </dl>
        <Button type="submit" size="lg" disabled={pending || !settings.shopEnabled}>{pending && <Loader2 className="size-5 animate-spin" />} Valider ma commande</Button>
        {!settings.shopEnabled && <p className="text-xs text-danger">La boutique en ligne est momentanément fermée.</p>}
      </form>
    </div>
  );
}

function Choice({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn('rounded-2xl border px-4 py-3 text-left text-sm transition', active ? 'border-rosewood bg-powder-50' : 'border-line bg-white')}>
      <span className="block font-medium">{label}</span>{sub && <span className="text-xs text-muted">{sub}</span>}
    </button>
  );
}
