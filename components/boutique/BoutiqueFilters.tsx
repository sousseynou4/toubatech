'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'all', label: 'Tout' },
  { value: 'smartphone', label: 'Smartphones' },
  { value: 'tablette', label: 'Tablettes' },
  { value: 'accessoire', label: 'Accessoires' },
];

const GRADES = [
  { value: 'all', label: 'Tous grades' },
  { value: 'A', label: 'Grade A' },
  { value: 'B', label: 'Grade B' },
  { value: 'C', label: 'Grade C' },
];

const SORTS = [
  { value: 'newest', label: 'Plus récent' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
];

export function BoutiqueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') || 'all';
  const currentGrade = searchParams.get('grade') || 'all';
  const currentSort = searchParams.get('sort') || 'newest';

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all' || (key === 'sort' && value === 'newest')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="space-y-5">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => updateParam('category', cat.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm transition-all',
              currentCategory === cat.value
                ? 'border-ink bg-ink text-bone'
                : 'border-ink/12 bg-bone text-ink-600 hover:border-ink/25 hover:text-ink'
            )}
            aria-pressed={currentCategory === cat.value}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Grade filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
            État
          </span>
          {GRADES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => updateParam('grade', g.value)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs transition-all',
                currentGrade === g.value
                  ? 'bg-emerald/10 text-emerald ring-1 ring-emerald/25'
                  : 'text-ink-500 hover:text-ink'
              )}
              aria-pressed={currentGrade === g.value}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
            Tri
          </span>
          <select
            value={currentSort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="rounded-full border border-ink/12 bg-bone px-3 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
