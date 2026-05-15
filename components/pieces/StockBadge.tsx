import { cn } from '@/lib/utils';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order';

const CONFIG: Record<StockStatus, { label: string; classes: string; dot: string }> = {
  in_stock: {
    label: 'En stock',
    classes: 'bg-emerald/8 text-emerald ring-emerald/20',
    dot: 'bg-emerald',
  },
  low_stock: {
    label: 'Stock limité',
    classes: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  out_of_stock: {
    label: 'Rupture',
    classes: 'bg-ink/5 text-ink-500 ring-ink/10',
    dot: 'bg-ink-300',
  },
  on_order: {
    label: 'Sur commande',
    classes: 'bg-ink/5 text-ink-600 ring-ink/10',
    dot: 'bg-ink',
  },
};

export function StockBadge({ status, size = 'md' }: { status: StockStatus; size?: 'sm' | 'md' }) {
  const config = CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        config.classes
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full',
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
          config.dot,
          status === 'in_stock' && 'animate-pulse'
        )}
      />
      {config.label}
    </span>
  );
}
