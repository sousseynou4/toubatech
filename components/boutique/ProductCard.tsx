'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Check, Leaf, ShieldCheck } from 'lucide-react';
import { GradeBadge, type Grade } from './GradeBadge';
import { useCart, formatPrice } from '@/lib/cart';

export interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
  storage: string | null;
  color: string | null;
  grade: Grade;
  priceCents: number;
  originalPriceCents: number | null;
  co2SavedKg: number | null;
  warrantyMonths: number;
  shortDescription: string | null;
  images: string[];
  stock: number;
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const imageUrl = product.images[0] || '/placeholder-product.png';

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: `${product.brand} ${product.model}`,
      grade: product.grade,
      priceCents: product.priceCents,
      imageUrl,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const fullName = [product.brand, product.model, product.storage, product.color]
    .filter(Boolean)
    .join(' · ');

  const savings =
    product.originalPriceCents && product.originalPriceCents > product.priceCents
      ? Math.round(
          ((product.originalPriceCents - product.priceCents) /
            product.originalPriceCents) *
            100
        )
      : null;

  return (
    <Link
      href={`/boutique/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-bone transition-all hover:border-ink/20 hover:shadow-lift"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-mist/40">
        <Image
          src={imageUrl}
          alt={fullName}
          width={600}
          height={600}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Grade badge */}
        <div className="absolute left-3 top-3">
          <GradeBadge grade={product.grade} />
        </div>
        {/* Savings badge */}
        {savings !== null && savings >= 10 && (
          <div className="absolute right-3 top-3 rounded-full bg-ink px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-bone uppercase">
            -{savings}%
          </div>
        )}
        {/* Stock warning */}
        {product.stock <= 2 && product.stock > 0 && (
          <div className="absolute bottom-3 left-3 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">
            Plus que {product.stock} en stock
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-bone/85 backdrop-blur-sm">
            <span className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-bone">
              Rupture de stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[15px] font-medium tracking-tight text-ink">
          {product.brand} {product.model}
        </h3>
        <p className="mt-0.5 text-xs text-ink-400">
          {[product.storage, product.color].filter(Boolean).join(' · ')}
        </p>

        {/* Reassurance row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-500">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald" />
            {product.warrantyMonths} mois garantie
          </span>
          {product.co2SavedKg !== null && (
            <span
              className="inline-flex items-center gap-1"
              title="Économie CO₂ estimée vs achat neuf (référence Loi AGEC)"
            >
              <Leaf className="h-3 w-3 text-emerald" />
              {product.co2SavedKg} kg CO₂ évités
            </span>
          )}
        </div>

        {/* Price row */}
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[20px] font-medium tracking-tight text-ink">
              {formatPrice(product.priceCents)}
            </p>
            {product.originalPriceCents && (
              <p className="text-xs text-ink-400 line-through">
                {formatPrice(product.originalPriceCents)}
              </p>
            )}
          </div>
          {product.stock > 0 && (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`Ajouter ${fullName} au panier`}
              className="group/btn flex h-10 w-10 items-center justify-center rounded-full bg-ink text-bone transition-all hover:bg-ink-700 active:scale-95"
            >
              {justAdded ? (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <Plus className="h-4 w-4 transition-transform group-hover/btn:rotate-90" />
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
