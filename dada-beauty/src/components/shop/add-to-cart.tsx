'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { formatXOF } from '@/lib/format';
import { cart } from './cart-store';
import { cn } from '@/lib/cn';

interface V { id: string; name: string; sale_price: number; stock_quantity: number }

export function AddToCart({ product, variants, imageUrl, shopEnabled }: { product: { slug: string; name: string }; variants: V[]; imageUrl?: string | null; shopEnabled: boolean }) {
  const [variantId, setVariantId] = useState(variants.find((v) => v.stock_quantity > 0)?.id ?? variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const v = variants.find((x) => x.id === variantId);
  if (!v) return null;
  const max = Math.min(20, v.stock_quantity);

  return (
    <div>
      <p className="font-display text-4xl">{formatXOF(v.sale_price)}</p>
      {variants.length > 1 && (
        <fieldset className="mt-6">
          <legend className="label">Option</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => (
              <button key={x.id} type="button" onClick={() => { setVariantId(x.id); setQty(1); }} aria-pressed={x.id === variantId} disabled={x.stock_quantity <= 0}
                className={cn('rounded-full border px-4 py-2 text-sm transition disabled:opacity-40 disabled:line-through', x.id === variantId ? 'border-rosewood bg-powder-50 text-rosewood' : 'border-line bg-white')}>
                {x.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <p className={cn('mt-4 text-sm', v.stock_quantity > 0 ? 'text-success' : 'text-danger')}>
        {v.stock_quantity > 5 ? 'En stock' : v.stock_quantity > 0 ? `Plus que ${v.stock_quantity} en stock` : 'Rupture de stock'}
      </p>
      {shopEnabled && v.stock_quantity > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex h-13 items-center rounded-full border border-line bg-white">
            <button type="button" className="grid size-12 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuer"><Minus className="size-4" /></button>
            <span className="w-8 text-center font-medium tabular-nums" aria-live="polite">{qty}</span>
            <button type="button" className="grid size-12 place-items-center" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="Augmenter"><Plus className="size-4" /></button>
          </div>
          <Button size="lg" className="flex-1" onClick={() => {
            cart.add({ variantId: v.id, productSlug: product.slug, name: product.name, variantName: v.name, unitPrice: v.sale_price, imageUrl }, qty);
            setAdded(true);
          }}>
            {added ? <Check className="size-5" /> : <ShoppingBag className="size-5" />} {added ? 'Ajouté au panier' : 'Ajouter au panier'}
          </Button>
        </div>
      )}
      {added && <Link href="/panier" className={buttonClass('outline', 'md', 'mt-3 w-full')}>Voir le panier</Link>}
    </div>
  );
}
