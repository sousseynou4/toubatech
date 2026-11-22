import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { GiftCardForm, GiftCardToggle, PromotionForm, PromotionRowActions } from '@/components/admin/system/loyalty-forms';
import { Alert } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { formatShortDate, formatXOF } from '@/lib/format';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/types';

const GIFT_TX_LABEL: Record<string, string> = { issue: 'Émission', redeem: 'Utilisation', refund: 'Remboursement (recrédit)' };

export const metadata = { title: 'Fidélité & promotions' };
export const dynamic = 'force-dynamic';

export default async function LoyaltyPage() {
  const ctx = await requireStaff('loyalty.manage');
  const sb = (await createClient())!;
  const [{ data: promos }, { data: cards }, { data: settings }, { data: top }, { data: cashId }, { data: moves }] = await Promise.all([
    sb.from('promotions').select('*').order('created_at', { ascending: false }),
    sb.from('gift_cards').select('id, code, initial_amount, balance, recipient_name, expires_on, is_active, sale_method, created_at').order('created_at', { ascending: false }).limit(100),
    sb.from('business_settings').select('loyalty_enabled, loyalty_points_per_1000_xof').eq('id', 1).single(),
    sb.from('loyalty_accounts').select('points_balance, lifetime_points, customer:customers(id, full_name)').order('points_balance', { ascending: false }).limit(10),
    sb.rpc('open_cash_session_id'),
    sb.from('gift_card_transactions').select('id, kind, amount, resulting_balance, note, created_at, card:gift_cards(code)').order('created_at', { ascending: false }).limit(30),
  ]);
  return (
    <>
      <PageHeader title="Fidélité & promotions" description="Points de fidélité, codes promotionnels et cartes cadeaux." />
      <Alert tone="info" className="mb-6">
        Les codes promo s&apos;appliquent automatiquement dans la boutique en ligne et en caisse : la remise est recalculée par la base,
        et une utilisation est rendue si la commande est annulée. Les cartes cadeaux se règlent en caisse et lors de l&apos;encaissement
        d&apos;un rendez-vous ou d&apos;une commande ; leur solde est débité, ou recrédité en cas de remboursement.
      </Alert>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Programme de points">
          <p className="text-sm">{settings?.loyalty_enabled ? <>Actif : <strong>{settings.loyalty_points_per_1000_xof} point(s)</strong> par tranche de 1 000 FCFA, attribués aux prestations terminées et intégralement payées.</> : 'Programme désactivé (Paramètres → Fidélité).'}</p>
          {(top ?? []).length > 0 && (
            <Table className="mt-4"><thead><tr><th>Cliente</th><th>Solde</th><th>Cumul</th></tr></thead>
              <tbody>{(top as unknown as { points_balance: number; lifetime_points: number; customer: { id: string; full_name: string } | null }[]).map((t, i) => (
                <tr key={i}><td>{t.customer?.full_name}</td><td>{t.points_balance}</td><td>{t.lifetime_points}</td></tr>
              ))}</tbody></Table>
          )}
        </Panel>
        <Panel title="Nouvelle carte cadeau"><GiftCardForm canOffer={ctx.can('loyalty.manage')} cashOpen={Boolean(cashId)} /></Panel>
        <Panel title="Nouvelle promotion" className="xl:col-span-2"><PromotionForm /></Panel>
        <Panel title="Promotions" padded={false} className="xl:col-span-2">
          {(promos ?? []).length === 0 ? <div className="p-5"><EmptyState title="Aucune promotion" /></div> : (
            <Table><thead><tr><th>Code</th><th>Remise</th><th>Min.</th><th>Période</th><th>Utilisations</th><th>Statut</th><th /></tr></thead>
              <tbody>{(promos as { id: string; code: string; description: string | null; discount_type: string; discount_value: number; min_amount: number; starts_at: string | null; ends_at: string | null; max_uses: number | null; uses_count: number; is_active: boolean }[]).map((p) => (
                <tr key={p.id}>
                  <td><span className="font-mono font-semibold">{p.code}</span>{p.description && <span className="block text-xs text-muted">{p.description}</span>}</td>
                  <td>{p.discount_type === 'percent' ? `${p.discount_value} %` : formatXOF(p.discount_value)}</td>
                  <td>{p.min_amount ? formatXOF(p.min_amount) : '—'}</td>
                  <td className="text-xs">{p.starts_at ? formatShortDate(p.starts_at) : '…'} → {p.ends_at ? formatShortDate(p.ends_at) : '…'}</td>
                  <td>{p.uses_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                  <td>{p.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                  <td><PromotionRowActions id={p.id} active={p.is_active} /></td>
                </tr>
              ))}</tbody></Table>
          )}
        </Panel>
        <Panel title="Cartes cadeaux" padded={false} className="xl:col-span-2">
          {(cards ?? []).length === 0 ? <div className="p-5"><EmptyState title="Aucune carte cadeau" /></div> : (
            <Table><thead><tr><th>Code</th><th>Bénéficiaire</th><th>Montant</th><th>Solde</th><th>Expiration</th><th>Statut</th><th /></tr></thead>
              <tbody>{(cards as { id: string; code: string; initial_amount: number; balance: number; recipient_name: string | null; expires_on: string | null; is_active: boolean; sale_method: PaymentMethod | null }[]).map((c) => (
                <tr key={c.id}><td className="font-mono">{c.code}<span className="block font-sans text-xs text-muted">{c.sale_method ? PAYMENT_METHOD_LABEL[c.sale_method] : 'Offerte'}</span></td><td>{c.recipient_name ?? '—'}</td><td>{formatXOF(c.initial_amount)}</td><td className="font-semibold">{formatXOF(c.balance)}</td>
                  <td>{c.expires_on ? formatShortDate(`${c.expires_on}T12:00:00Z`) : '—'}</td><td>{c.is_active ? <Badge tone="success">Active</Badge> : <Badge>Désactivée</Badge>}</td><td><GiftCardToggle id={c.id} active={c.is_active} /></td></tr>
              ))}</tbody></Table>
          )}
        </Panel>
        <Panel title="Derniers mouvements des cartes cadeaux" padded={false} className="xl:col-span-2">
          {(moves ?? []).length === 0 ? <div className="p-5"><EmptyState title="Aucun mouvement" /></div> : (
            <Table><thead><tr><th>Date</th><th>Carte</th><th>Opération</th><th>Montant</th><th>Solde après</th></tr></thead>
              <tbody>{(moves as unknown as { id: number; kind: string; amount: number; resulting_balance: number | null; note: string | null; created_at: string; card: { code: string } | null }[]).map((m) => (
                <tr key={m.id}><td className="text-xs">{formatShortDate(m.created_at)}</td><td className="font-mono">{m.card?.code}</td>
                  <td>{GIFT_TX_LABEL[m.kind] ?? m.kind}{m.note && <span className="block text-xs text-muted">{m.note}</span>}</td>
                  <td className={m.amount < 0 ? 'text-danger' : 'text-success'}>{m.amount > 0 ? '+' : '−'}{formatXOF(Math.abs(m.amount))}</td>
                  <td>{m.resulting_balance !== null ? formatXOF(m.resulting_balance) : '—'}</td></tr>
              ))}</tbody></Table>
          )}
        </Panel>
      </div>
    </>
  );
}
