import Link from 'next/link';
import { ArrowUpRight, Clock, Star } from 'lucide-react';
import { ArtImage } from '@/components/ui/art-image';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatPrice, formatXOF } from '@/lib/format';
import type { Product, Service } from '@/lib/types';
import { isServiceBookable } from '@/server/catalog';

export function ServiceCard({ service, theme }: { service: Service; theme?: string }) {
  const bookable = isServiceBookable(service);
  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <Link href={`/prestations/${service.slug}`} className="block" tabIndex={-1} aria-hidden>
        <ArtImage src={service.image?.public_url} alt={service.image?.alt || service.name} theme={theme ?? service.category?.slug} label={service.name}
          className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.02]" sizes="(max-width: 640px) 100vw, 33vw" showPlaceholderTag={false} />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl leading-tight">
            <Link href={`/prestations/${service.slug}`} className="hover:text-rosewood">{service.name}</Link>
          </h3>
          {service.requires_quote && <Badge tone="gold">Sur devis</Badge>}
        </div>
        {service.short_description && <p className="mt-2 text-sm leading-relaxed text-muted">{service.short_description}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
          <span className="font-semibold text-ink">{formatPrice(service.price, service.price_is_from)}</span>
          {service.duration_minutes ? (
            <span className="inline-flex items-center gap-1 text-muted"><Clock className="size-3.5" />{formatDuration(service.duration_minutes)}</span>
          ) : null}
        </div>
        <Link href={bookable ? `/reserver?prestation=${service.slug}` : `/prestations/${service.slug}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-rosewood hover:gap-2 transition-all">
          {bookable ? 'Réserver' : service.requires_quote ? 'Demander un devis' : 'En savoir plus'} <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const prices = (product.variants ?? []).map((v) => v.sale_price!).filter((p) => p !== null);
  const min = prices.length ? Math.min(...prices) : null;
  const inStock = (product.variants ?? []).some((v) => v.stock_quantity > 0);
  return (
    <article className="group">
      <Link href={`/boutique/${product.slug}`} className="block">
        <div className="relative overflow-hidden rounded-[1.25rem]">
          <ArtImage src={product.image?.public_url} alt={product.image?.alt || product.name} theme="boutique" label={product.category?.name}
            className="aspect-square transition-transform duration-500 group-hover:scale-[1.03]" sizes="(max-width: 640px) 50vw, 25vw" showPlaceholderTag={false} />
          {!inStock && <span className="absolute left-3 top-3"><Badge tone="neutral">Rupture</Badge></span>}
        </div>
        <div className="mt-3 px-0.5">
          {product.brand && <p className="text-[0.7rem] uppercase tracking-[0.16em] text-muted">{product.brand}</p>}
          <h3 className="mt-0.5 text-[0.95rem] font-medium leading-snug text-ink group-hover:text-rosewood">{product.name}</h3>
          <p className="mt-1 text-sm font-semibold">{min !== null ? (prices.length > 1 && new Set(prices).size > 1 ? `Dès ${formatXOF(min)}` : formatXOF(min)) : 'Prix sur demande'}</p>
        </div>
      </Link>
    </article>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={className} aria-label={`${rating} sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`inline size-4 ${i < rating ? 'fill-gold text-gold' : 'text-line'}`} aria-hidden />
      ))}
    </span>
  );
}
