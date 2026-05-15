'use client';

import { useState } from 'react';
import { ShoppingBag, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import type { Product } from './ProductCard';

export function AddToCartButton({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [state, setState] = useState<'idle' | 'added' | 'navigating'>('idle');

  const handleAdd = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: `${product.brand} ${product.model}`,
      grade: product.grade,
      priceCents: product.priceCents,
      imageUrl: product.images[0] || '',
    });
    setState('added');
    setTimeout(() => setState('idle'), 1800);
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: `${product.brand} ${product.model}`,
      grade: product.grade,
      priceCents: product.priceCents,
      imageUrl: product.images[0] || '',
    });
    setState('navigating');
    router.push('/panier');
  };

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <button
        type="button"
        onClick={handleAdd}
        disabled={state !== 'idle'}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-bone shadow-soft transition-all hover:bg-ink-700 hover:shadow-lift disabled:opacity-80"
      >
        {state === 'added' ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Ajouté
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
            Ajouter au panier
          </>
        )}
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={state === 'navigating'}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-bone px-6 text-[15px] font-medium text-ink transition-all hover:border-ink/30 hover:bg-mist/40 disabled:opacity-60"
      >
        {state === 'navigating' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Acheter maintenant'
        )}
      </button>
    </div>
  );
}
