'use client';

import Link from 'next/link';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/cn';

const PRESETS = [
  { key: '7j', label: '7 j' }, { key: '30j', label: '30 j' }, { key: 'mois', label: 'Ce mois' },
  { key: 'mois-dernier', label: 'Mois dernier' }, { key: '12m', label: '12 mois' },
] as const;

export function RangePicker({ basePath, preset, from, to, extra = {} }: { basePath: string; preset: string; from: string; to: string; extra?: Record<string, string> }) {
  const href = (p: Record<string, string>) => `${basePath}?${new URLSearchParams({ ...extra, ...p })}`;
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1 text-sm">
        {PRESETS.map((p) => (
          <Link key={p.key} href={href({ periode: p.key })} aria-current={preset === p.key ? 'page' : undefined}
            className={cn('rounded-lg px-3 py-1.5', preset === p.key ? 'bg-powder-100 font-semibold text-rosewood-dark' : 'text-muted hover:text-ink')}>{p.label}</Link>
        ))}
      </div>
      <form action={basePath} className="flex flex-wrap items-center gap-2 text-sm">
        {Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input type="hidden" name="periode" value="perso" />
        <label className="sr-only" htmlFor="rp-from">Du</label>
        <input id="rp-from" type="date" name="du" defaultValue={from} className="field h-10 w-auto py-0" />
        <span className="text-muted">→</span>
        <label className="sr-only" htmlFor="rp-to">Au</label>
        <input id="rp-to" type="date" name="au" defaultValue={to} className="field h-10 w-auto py-0" />
        <button className="h-10 rounded-xl bg-ink px-4 text-ivory">Appliquer</button>
      </form>
    </div>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm hover:border-rosewood print:hidden">
      <Printer className="size-4" /> Imprimer / PDF
    </button>
  );
}
