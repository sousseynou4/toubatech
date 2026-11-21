'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, Loader2, Minus, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, Input, Select } from '@/components/ui/field';
import { CustomerPicker } from '@/components/admin/customer-picker';
import { formatXOF } from '@/lib/format';
import { posCheckout } from '@/server/admin/finance';
import { MANUAL_METHODS } from './labels';
import { cn } from '@/lib/cn';

export interface PosProduct { variantId: string; label: string; price: number; stock: number }
export interface PosService { id: string; name: string; price: number | null; category: string }
type Line = { key: string; type: 'product'; variantId: string; label: string; price: number; qty: number; stock: number }
  | { key: string; type: 'service'; serviceId: string; label: string; price: number | null; customPrice: string; qty: number };
type Pay = { method: string; amount: string; reference: string };

const n = (s: string) => Number(s.replace(/[\s  ]/g, '')) || 0;

export function Pos({ products, services, canDiscount, cashOpen }: { products: PosProduct[]; services: PosService[]; canDiscount: boolean; cashOpen: boolean }) {
  const [tab, setTab] = useState<'services' | 'products'>('services');
  const [q, setQ] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState('');
  const [payments, setPayments] = useState<Pay[]>([{ method: 'cash', amount: '', reference: '' }]);
  const [note, setNote] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<{ ok?: boolean; error?: string; message?: string; reference?: string; total?: number } | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [pending, start] = useTransition();

  const needle = q.trim().toLowerCase();
  const shownProducts = useMemo(() => products.filter((p) => !needle || p.label.toLowerCase().includes(needle)).slice(0, 60), [products, needle]);
  const shownServices = useMemo(() => services.filter((s) => !needle || s.name.toLowerCase().includes(needle)), [services, needle]);

  const linePrice = (l: Line) => (l.type === 'product' ? l.price : l.price ?? n(l.customPrice));
  const subtotal = lines.reduce((s, l) => s + linePrice(l) * l.qty, 0);
  const total = Math.max(0, subtotal - (canDiscount ? n(discount) : 0));
  const paid = payments.reduce((s, p) => s + n(p.amount), 0);
  const hasCash = payments.some((p) => p.method === 'cash' && n(p.amount) > 0);

  const addProduct = (p: PosProduct) => setLines((ls) => {
    const ex = ls.find((l) => l.type === 'product' && l.variantId === p.variantId);
    if (ex) return ls.map((l) => (l === ex ? { ...l, qty: Math.min(l.qty + 1, p.stock) } : l));
    return [...ls, { key: p.variantId, type: 'product', variantId: p.variantId, label: p.label, price: p.price, qty: 1, stock: p.stock }];
  });
  const addService = (s: PosService) => setLines((ls) => [...ls, { key: crypto.randomUUID(), type: 'service', serviceId: s.id, label: s.name, price: s.price, customPrice: '', qty: 1 }]);
  const setQty = (key: string, qty: number) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(qty, l.type === 'product' ? l.stock : 100)) } : l)));

  function submit(form: FormData) {
    setResult(null);
    const customerId = String(form.get('customerId') ?? '') || null;
    start(async () => {
      const r = await posCheckout({
        customerId,
        lines: lines.map((l) => l.type === 'product'
          ? { type: 'product' as const, variant_id: l.variantId, quantity: l.qty }
          : { type: 'service' as const, service_id: l.serviceId, quantity: l.qty, ...(l.price === null ? { unit_price: n(l.customPrice) } : {}) }),
        payments: payments.filter((p) => n(p.amount) > 0).map((p) => ({ method: p.method as 'cash', amount: n(p.amount), reference: p.reference || undefined })),
        discount: canDiscount ? n(discount) : 0,
        note: note || undefined,
        idempotencyKey: key,
      });
      setResult(r);
      if (r.ok) {
        setLines([]); setDiscount(''); setNote(''); setPayments([{ method: 'cash', amount: '', reference: '' }]);
        setKey(crypto.randomUUID()); setPickerKey((k) => k + 1);
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <section className="rounded-[1.25rem] border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-xl bg-powder-50 p-1 text-sm">
            {(['services', 'products'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cn('rounded-lg px-4 py-2', tab === t ? 'bg-white font-semibold shadow-soft' : 'text-muted')}>{t === 'services' ? 'Prestations' : 'Produits'}</button>
            ))}
          </div>
          <label className="relative flex-1"><span className="sr-only">Rechercher</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="field h-10 pl-9" /></label>
        </div>
        <div className="mt-4 grid max-h-[32rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {tab === 'services' ? shownServices.map((s) => (
            <button key={s.id} type="button" onClick={() => addService(s)} className="rounded-xl border border-line p-3 text-left text-sm transition hover:border-rosewood hover:bg-powder-50">
              <span className="block font-medium leading-tight">{s.name}</span>
              <span className="mt-1 block text-xs text-muted">{s.category}</span>
              <span className="mt-1 block font-semibold">{s.price !== null ? formatXOF(s.price) : 'Prix à saisir'}</span>
            </button>
          )) : shownProducts.map((p) => (
            <button key={p.variantId} type="button" disabled={p.stock <= 0} onClick={() => addProduct(p)} className="rounded-xl border border-line p-3 text-left text-sm transition hover:border-rosewood hover:bg-powder-50 disabled:opacity-40">
              <span className="block font-medium leading-tight">{p.label}</span>
              <span className="mt-1 block text-xs text-muted">Stock : {p.stock}</span>
              <span className="mt-1 block font-semibold">{formatXOF(p.price)}</span>
            </button>
          ))}
          {(tab === 'services' ? shownServices : shownProducts).length === 0 && <p className="col-span-full p-4 text-sm text-muted">Aucun élément.</p>}
        </div>
      </section>

      <form action={submit} className="grid h-fit gap-4 rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
        <h2 className="font-semibold">Ticket</h2>
        {result?.ok && <Alert tone="success"><Check className="mr-1 inline size-4" />{result.message} Total : {formatXOF(result.total ?? 0)}.</Alert>}
        {result?.error && <Alert tone="danger">{result.error}</Alert>}
        {!cashOpen && <Alert tone="warning">Caisse fermée : seuls les paiements non-espèces sont possibles.</Alert>}
        {lines.length === 0 ? <p className="text-sm text-muted">Ajoutez des prestations ou des produits.</p> : (
          <ul className="divide-y divide-line/70">
            {lines.map((l) => (
              <li key={l.key} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1">{l.label}</span>
                {l.type === 'service' && l.price === null && (
                  <input value={l.customPrice} onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key && x.type === 'service' ? { ...x, customPrice: e.target.value } : x)))}
                    placeholder="Prix FCFA" inputMode="numeric" className="field h-8 w-28 py-0" aria-label={`Prix de ${l.label}`} required />
                )}
                <span className="flex items-center rounded-full border border-line">
                  <button type="button" className="grid size-7 place-items-center" onClick={() => setQty(l.key, l.qty - 1)} aria-label="Diminuer"><Minus className="size-3" /></button>
                  <span className="w-6 text-center tabular-nums">{l.qty}</span>
                  <button type="button" className="grid size-7 place-items-center" onClick={() => setQty(l.key, l.qty + 1)} aria-label="Augmenter"><Plus className="size-3" /></button>
                </span>
                <span className="w-24 text-right tabular-nums">{formatXOF(linePrice(l) * l.qty)}</span>
                <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-muted hover:text-danger" aria-label={`Retirer ${l.label}`}><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <div><p className="label">Cliente (facultatif)</p><CustomerPicker key={pickerKey} allowNew={false} /></div>
        {canDiscount && (
          <label className="flex items-center justify-between gap-3 text-sm">Remise (FCFA)<input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="numeric" className="field h-9 w-32 py-0" /></label>
        )}
        <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><span>Total</span><span className="tabular-nums">{formatXOF(total)}</span></div>

        <fieldset className="grid gap-2">
          <legend className="label">Paiement</legend>
          {payments.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Select value={p.method} onChange={(e) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, method: e.target.value } : x)))} aria-label="Moyen">
                {MANUAL_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
              <Input value={p.amount} onChange={(e) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} placeholder="Montant" inputMode="numeric" aria-label="Montant" />
              <button type="button" onClick={() => setPayments((ps) => ps.length > 1 ? ps.filter((_, j) => j !== i) : ps)} className="grid size-11 place-items-center text-muted hover:text-danger" aria-label="Retirer ce paiement"><X className="size-4" /></button>
              {p.method !== 'cash' && <Input className="col-span-3" value={p.reference} onChange={(e) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, reference: e.target.value } : x)))} placeholder="Référence de transaction (Wave / OM…)" aria-label="Référence" />}
            </div>
          ))}
          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" className="text-rosewood" onClick={() => setPayments((ps) => [...ps, { method: 'wave', amount: '', reference: '' }])}>+ Paiement fractionné</button>
            <button type="button" className="text-rosewood" onClick={() => setPayments((ps) => ps.map((x, j) => (j === 0 ? { ...x, amount: String(Math.max(0, total - ps.slice(1).reduce((s, y) => s + n(y.amount), 0))) } : x)))}>Solder avec le 1er moyen</button>
          </div>
          <p className={cn('text-sm', paid === total ? 'text-success' : 'text-warning')}>Payé : {formatXOF(paid)} {paid !== total && `· ${paid < total ? 'reste' : 'excédent'} ${formatXOF(Math.abs(total - paid))}`}</p>
        </fieldset>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultatif)" maxLength={500} aria-label="Note" />
        <Button type="submit" size="lg" disabled={pending || lines.length === 0 || paid !== total || total === 0 || (hasCash && !cashOpen)}>
          {pending && <Loader2 className="size-5 animate-spin" />} Valider la vente
        </Button>
        <p className="text-xs text-muted">Les prix sont recalculés par la base ; un écart de total est refusé.</p>
      </form>
    </div>
  );
}
