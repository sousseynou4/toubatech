'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { searchAdmin, type SearchHit } from '@/server/admin/common';

const TYPE_LABEL: Record<string, string> = { customer: 'Cliente', appointment: 'Rendez-vous', order: 'Commande', product: 'Produit', service: 'Prestation' };

export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => start(async () => { setHits(await searchAdmin(q)); setOpen(true); }), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={box} className="relative max-w-md">
      <label className="relative block">
        <span className="sr-only">Recherche globale</span>
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setHits([]); }} onFocus={() => hits.length && setOpen(true)}
          placeholder="Cliente, téléphone, référence…" className="h-10 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm outline-none focus:border-blush focus:ring-4 focus:ring-powder/40" />
      </label>
      {open && q.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
          {hits.length === 0 ? <p className="p-4 text-sm text-muted">Aucun résultat</p> : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hits.map((h) => (
                <li key={h.type + h.id}>
                  <Link href={h.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-powder-50">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{h.title}</span><span className="block truncate text-xs text-muted">{h.subtitle}</span></span>
                    <span className="shrink-0 rounded-full bg-nude-50 px-2 py-0.5 text-[0.65rem] text-ink-soft">{TYPE_LABEL[h.type] ?? h.type}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
