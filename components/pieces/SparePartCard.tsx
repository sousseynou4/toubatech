'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Plus, Check, Cpu } from 'lucide-react';
import { StockBadge, type StockStatus } from './StockBadge';
import { useCart, formatPrice } from '@/lib/cart';

export interface SparePart {
  id: string;
  name: string;
  category: string;
  brand: string;
  deviceModel: string | null;
  qualityGrade: string | null;
  compatibility: string[];
  retailPriceCents: number;
  stockStatus: StockStatus;
  imageUrl: string | null;
}

export function SparePartCard({ part }: { part: SparePart }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const disabled = part.stockStatus === 'out_of_stock';

  const handleAdd = () => {
    if (disabled) return;
    addItem({
      productId: part.id,
      slug: `piece-${part.id}`, // pas de page détail dédiée pour les pièces
      name: part.name,
      grade: 'A', // valeur par défaut — non pertinent pour les pièces
      priceCents: part.retailPriceCents,
      imageUrl: part.imageUrl || '',
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-bone transition-all hover:border-ink/20 hover:shadow-soft">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-mist/40">
        {part.imageUrl ? (
          <Image
            src={part.imageUrl}
            alt={part.name}
            width={400}
            height={400}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Cpu className="h-12 w-12 text-ink-200" strokeWidth={1.2} />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <StockBadge status={part.stockStatus} size="sm" />
        </div>
        {part.qualityGrade && (
          <div className="absolute right-2.5 top-2.5 rounded-full bg-bone/95 px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.1em] text-ink uppercase ring-1 ring-ink/10 backdrop-blur-sm">
            {part.qualityGrade}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[10px] tracking-[0.15em] text-ink-400 uppercase">
          {part.brand}
          {part.deviceModel && ` · ${part.deviceModel}`}
        </p>
        <h3 className="mt-1 text-[14px] font-medium leading-tight text-ink line-clamp-2">
          {part.name}
        </h3>

        {part.compatibility.length > 0 && (
          <p className="mt-2 line-clamp-1 text-[11px] text-ink-400">
            Compatible : {part.compatibility.slice(0, 3).join(', ')}
            {part.compatibility.length > 3 && ` +${part.compatibility.length - 3}`}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-4">
          <p className="text-[18px] font-medium tracking-tight text-ink">
            {formatPrice(part.retailPriceCents)}
          </p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled}
            aria-label={`Ajouter ${part.name} au panier`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-bone transition-all hover:bg-ink-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-ink/30"
          >
            {justAdded ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
