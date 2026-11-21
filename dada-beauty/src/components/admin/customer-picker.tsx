'use client';

import { useEffect, useState, useTransition } from 'react';
import { Input } from '@/components/ui/field';
import { searchCustomers } from '@/server/admin/common';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/cn';

/** Recherche de cliente existante (nom / téléphone) ou saisie d'une nouvelle cliente. */
export function CustomerPicker({ name = 'customerId', allowNew = true }: { name?: string; allowNew?: boolean }) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [picked, setPicked] = useState<{ id: string; full_name: string; phone: string } | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    if (q.trim().length < 2 || picked) return;
    const t = setTimeout(() => start(async () => setHits(await searchCustomers(q))), 250);
    return () => clearTimeout(t);
  }, [q, picked]);

  return (
    <div className="grid gap-3">
      {allowNew && (
        <div className="flex gap-2 text-sm">
          {(['existing', 'new'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-full px-3 py-1.5', mode === m ? 'bg-ink text-ivory' : 'border border-line bg-white')}>
              {m === 'existing' ? 'Cliente existante' : 'Nouvelle cliente'}
            </button>
          ))}
        </div>
      )}
      {mode === 'existing' ? (
        <div className="relative">
          <input type="hidden" name={name} value={picked?.id ?? ''} />
          <Input value={picked ? `${picked.full_name} — ${formatPhone(picked.phone)}` : q} onChange={(e) => { setPicked(null); setQ(e.target.value); }} placeholder="Nom ou numéro de téléphone" aria-label="Rechercher une cliente" />
          {!picked && hits.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-white shadow-lift">
              {hits.map((h) => <li key={h.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-powder-50" onClick={() => { setPicked(h); setHits([]); }}>{h.full_name} <span className="text-muted">— {formatPhone(h.phone)}</span></button></li>)}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="newName" placeholder="Nom et prénom" aria-label="Nom de la nouvelle cliente" />
          <Input name="newPhone" type="tel" placeholder="Téléphone" aria-label="Téléphone de la nouvelle cliente" />
        </div>
      )}
    </div>
  );
}
