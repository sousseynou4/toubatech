'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface PartsFiltersProps {
  categories: FilterOption[];
  brands: FilterOption[];
}

export function PartsFilters({ categories, brands }: PartsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || 'all';
  const currentBrand = searchParams.get('brand') || 'all';
  const currentStock = searchParams.get('stock') === '1';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === 'all') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Debounce search input by 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInput === currentSearch) return;

    debounceRef.current = setTimeout(() => {
      updateParams({ q: searchInput });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const activeCount =
    (currentCategory !== 'all' ? 1 : 0) +
    (currentBrand !== 'all' ? 1 : 0) +
    (currentStock ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Rechercher une pièce : iPhone 13, écran S22, batterie..."
          aria-label="Recherche de pièces détachées"
          className="w-full rounded-full border border-ink/12 bg-bone py-3.5 pl-11 pr-12 text-[15px] text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              updateParams({ q: null });
            }}
            aria-label="Effacer la recherche"
            className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-ink/8 text-ink-500 transition-colors hover:bg-ink/15 hover:text-ink"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filter toggle bar (mobile) + always visible on desktop */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-bone px-4 py-2 text-sm text-ink-600 transition-colors hover:border-ink/25 hover:text-ink md:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtres
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald px-1.5 font-mono text-[10px] font-medium text-bone">
              {activeCount}
            </span>
          )}
        </button>

        {/* Stock filter — always visible */}
        <label className="ml-auto inline-flex items-center gap-2 text-xs text-ink-600">
          <input
            type="checkbox"
            checked={currentStock}
            onChange={(e) => updateParams({ stock: e.target.checked ? '1' : null })}
            className="h-3.5 w-3.5 rounded border-ink/20 text-emerald focus:ring-emerald/20"
          />
          En stock uniquement
        </label>
      </div>

      {/* Filter chips */}
      <div className={cn('space-y-4', !filtersOpen && 'hidden md:block')}>
        <FilterRow
          label="Catégorie"
          options={[{ value: 'all', label: 'Toutes' }, ...categories]}
          current={currentCategory}
          onChange={(v) => updateParams({ category: v })}
        />
        <FilterRow
          label="Marque"
          options={[{ value: 'all', label: 'Toutes' }, ...brands]}
          current={currentBrand}
          onChange={(v) => updateParams({ brand: v })}
        />
      </div>
    </div>
  );
}

function FilterRow({
  label,
  options,
  current,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  current: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all',
              current === option.value
                ? 'border-ink bg-ink text-bone'
                : 'border-ink/12 bg-bone text-ink-600 hover:border-ink/25 hover:text-ink'
            )}
            aria-pressed={current === option.value}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'font-mono text-[10px]',
                  current === option.value ? 'text-bone/60' : 'text-ink-400'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
