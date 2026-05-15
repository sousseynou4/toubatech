'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Leaf,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useCart, formatPrice } from '@/lib/cart';
import { GradeBadge } from '@/components/boutique/GradeBadge';
import { Section } from '@/components/ui/Section';

export default function PanierPage() {
  const { items, totalCents, totalQuantity, updateQuantity, removeItem, hydrated } =
    useCart();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [checkoutState, setCheckoutState] = useState<'idle' | 'redirecting' | 'error'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Saisissez un email valide.');
      return;
    }
    setError(null);
    setCheckoutState('redirecting');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          email,
          name: name || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Erreur lors de la création du paiement.');
      }

      const { url } = await response.json();
      if (!url) throw new Error('URL de paiement manquante.');

      // Redirect to Stripe Checkout
      window.location.assign(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      setCheckoutState('error');
    }
  };

  // Loading state — avoid SSR hydration mismatch
  if (!hydrated) {
    return (
      <Section>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
        </div>
      </Section>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <Section>
        <Link
          href="/boutique"
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la boutique
        </Link>
        <div className="mx-auto mt-12 max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-mist/40">
            <ShoppingBag className="h-6 w-6 text-ink-300" />
          </div>
          <h1 className="mt-6 text-h1 text-ink">Votre panier est vide</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            Découvrez notre sélection de smartphones et tablettes reconditionnés, garantis 12
            mois et reconditionnés à Lorient.
          </p>
          <Link
            href="/boutique"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-bone transition-all hover:bg-ink-700"
          >
            Explorer la boutique
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>
    );
  }

  // Total CO2 saved (rough estimate, sum of products)
  // We don't have CO2 in cart state, so we'll skip it for now — could fetch from server later

  return (
    <Section>
      <Link
        href="/boutique"
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Continuer mes achats
      </Link>

      <h1 className="mt-6 text-hero text-ink">Votre panier</h1>
      <p className="mt-2 text-[15px] text-ink-500">
        {totalQuantity} {totalQuantity > 1 ? 'articles' : 'article'}
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        {/* Items list */}
        <div className="lg:col-span-7">
          <ul className="divide-y divide-ink/8 overflow-hidden rounded-3xl border border-ink/10 bg-bone">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-4 p-5">
                {/* Image */}
                <Link
                  href={`/boutique/${item.slug}`}
                  className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-mist/40"
                >
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={200}
                      height={200}
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/boutique/${item.slug}`}
                    className="text-[15px] font-medium text-ink hover:underline"
                  >
                    {item.name}
                  </Link>
                  <div className="mt-1.5">
                    <GradeBadge grade={item.grade} size="sm" />
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    {/* Quantity controls */}
                    <div className="inline-flex items-center rounded-full border border-ink/12 bg-bone">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        aria-label="Diminuer la quantité"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-mist/50 hover:text-ink"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[24px] text-center font-mono text-sm text-ink">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        aria-label="Augmenter la quantité"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-mist/50 hover:text-ink"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-[15px] font-medium text-ink">
                        {formatPrice(item.priceCents * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-400 transition-colors hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        Retirer
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-5">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-3xl border border-ink/10 bg-bone p-6 md:p-7">
              <h2 className="text-h2 text-ink">Récapitulatif</h2>

              <dl className="mt-6 space-y-3 border-b border-ink/8 pb-6 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">Sous-total</dt>
                  <dd className="font-mono text-ink">{formatPrice(totalCents)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">Livraison</dt>
                  <dd className="font-mono text-emerald">Offerte</dd>
                </div>
              </dl>

              <div className="mt-6 flex items-end justify-between">
                <span className="text-sm font-medium text-ink">Total TTC</span>
                <span className="font-mono text-2xl font-medium tracking-tight text-ink">
                  {formatPrice(totalCents)}
                </span>
              </div>

              {/* Email field */}
              <div className="mt-6 space-y-3">
                <div>
                  <label
                    htmlFor="checkout-email"
                    className="text-xs font-medium text-ink"
                  >
                    Email <span className="text-emerald">*</span>
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                    required
                    className="mt-1.5 w-full rounded-xl border border-ink/12 bg-bone px-3 py-2.5 text-sm text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="text-xs font-medium text-ink"
                  >
                    Nom (facultatif)
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="mt-1.5 w-full rounded-xl border border-ink/12 bg-bone px-3 py-2.5 text-sm text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutState === 'redirecting' || !email}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald text-bone font-medium transition-all hover:bg-emerald-500 disabled:opacity-50"
              >
                {checkoutState === 'redirecting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirection sécurisée…
                  </>
                ) : (
                  <>
                    Procéder au paiement
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-[10px] text-ink-400">
                Paiement sécurisé par Stripe · Aucune donnée carte stockée chez TOUBA TECH
              </p>
            </div>

            {/* Reassurance */}
            <div className="space-y-2.5 rounded-2xl border border-ink/8 bg-mist/30 p-5">
              <div className="flex items-start gap-2.5 text-xs text-ink-600">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald" />
                <span>Garantie 12 mois sur tous les produits</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-ink-600">
                <Leaf className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald" />
                <span>Économie circulaire — reconditionné à Lorient</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Section>
  );
}
