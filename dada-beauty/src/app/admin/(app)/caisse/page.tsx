import Link from 'next/link';
import { History } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { Pos, type PosProduct, type PosService } from '@/components/admin/commerce/pos';
import { CashMovementForm, CloseCashForm, OpenCashForm } from '@/components/admin/commerce/cash-forms';
import { CASH_CATEGORY_LABEL } from '@/components/admin/commerce/labels';
import { formatDateTime, formatTime, formatXOF } from '@/lib/format';

export const metadata = { title: 'Caisse' };

export default async function CashierPage() {
  const ctx = await requireStaff('pos.use');
  const sb = (await createClient())!;
  const [{ data: session }, { data: variants }, { data: services }] = await Promise.all([
    sb.from('cash_sessions').select('id, opened_at, opening_float, notes').is('closed_at', null).maybeSingle(),
    sb.from('product_variants').select('id, name, sale_price, stock_quantity, is_active, product:products(name, status)').eq('is_active', true).not('sale_price', 'is', null).limit(1000),
    sb.from('services').select('id, name, price, status, category:service_categories(name)').neq('status', 'inactive').order('sort_order'),
  ]);
  const products: PosProduct[] = ((variants ?? []) as unknown as { id: string; name: string; sale_price: number; stock_quantity: number; product: { name: string; status: string } | null }[])
    .filter((v) => v.product && v.product.status !== 'inactive')
    .map((v) => ({ variantId: v.id, label: `${v.product!.name}${v.name !== 'Standard' ? ` — ${v.name}` : ''}`, price: v.sale_price, stock: v.stock_quantity }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const posServices: PosService[] = ((services ?? []) as unknown as { id: string; name: string; price: number | null; category: { name: string } | null }[])
    .map((s) => ({ id: s.id, name: s.name, price: s.price, category: s.category?.name ?? '' }));

  const canCash = ctx.can('cash.manage');
  let expected = 0;
  let txs: { id: number; direction: string; category: string; amount: number; note: string | null; created_at: string }[] = [];
  if (session && canCash) {
    const [{ data: exp }, { data: t }] = await Promise.all([
      sb.rpc('cash_session_expected', { p_session_id: session.id }),
      sb.from('cash_transactions').select('id, direction, category, amount, note, created_at').eq('session_id', session.id).order('created_at', { ascending: false }).limit(50),
    ]);
    expected = Number(exp ?? 0);
    txs = t ?? [];
  }

  return (
    <>
      <PageHeader title="Caisse" description={session ? `Caisse ouverte depuis ${formatDateTime(session.opened_at)}` : 'Caisse fermée'}
        actions={canCash ? <ButtonLink href="/admin/caisse/sessions" size="sm" variant="outline"><History className="size-4" /> Clôtures</ButtonLink> : undefined} />
      {!session && canCash && <Panel title="Ouvrir la caisse" className="mb-6 max-w-md"><OpenCashForm /></Panel>}
      {!session && !canCash && <p className="mb-6 rounded-2xl bg-powder-50 p-4 text-sm text-ink-soft">La caisse est fermée : seuls les paiements Wave, Orange Money, carte ou virement peuvent être enregistrés. Demandez à une responsable de l&apos;ouvrir pour les espèces.</p>}
      <Pos products={products} services={posServices} canDiscount={ctx.can('pos.discount')} cashOpen={Boolean(session)} />
      {session && canCash && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Panel title="Mouvements de la session" padded={false} className="lg:col-span-2">
            <div className="flex flex-wrap gap-4 border-b border-line/70 px-5 py-3 text-sm">
              <span>Fond : <strong>{formatXOF(session.opening_float)}</strong></span>
              <span>Espèces attendues : <strong>{formatXOF(expected)}</strong></span>
            </div>
            {txs.length === 0 ? <p className="p-5 text-sm text-muted">Aucun mouvement d&apos;espèces.</p> : (
              <ul className="divide-y divide-line/70 text-sm">{txs.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 px-5 py-2.5">
                  <span>{CASH_CATEGORY_LABEL[t.category] ?? t.category}{t.note && <span className="text-muted"> · {t.note}</span>}<span className="block text-xs text-muted">{formatTime(t.created_at)}</span></span>
                  <span className={`tabular-nums font-semibold ${t.direction === 'out' ? 'text-danger' : 'text-success'}`}>{t.direction === 'out' ? '−' : '+'}{formatXOF(t.amount)}</span>
                </li>
              ))}</ul>
            )}
          </Panel>
          <div className="grid h-fit gap-6">
            <Panel title="Retrait / apport"><CashMovementForm /></Panel>
            <Panel title="Clôture"><CloseCashForm sessionId={session.id} expected={expected} /></Panel>
            <p className="text-xs text-muted">Dépenses payées en espèces : <Link href="/admin/depenses" className="text-rosewood">module Dépenses</Link>.</p>
          </div>
        </div>
      )}
    </>
  );
}
