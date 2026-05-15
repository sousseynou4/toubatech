'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart';

export function CartButton() {
  const { totalQuantity, hydrated } = useCart();

  return (
    <Link
      href="/panier"
      aria-label={
        totalQuantity > 0 ? `Panier (${totalQuantity} article${totalQuantity > 1 ? 's' : ''})` : 'Panier vide'
      }
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink transition-colors hover:border-ink/25 hover:bg-ink/5"
    >
      <ShoppingBag className="h-4 w-4" strokeWidth={1.6} />
      {hydrated && totalQuantity > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald px-1 font-mono text-[10px] font-medium text-bone">
          {totalQuantity}
        </span>
      )}
    </Link>
  );
}
