import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { Badge } from '@/components/ui/badge';
import { CASH_CATEGORY_LABEL } from '@/components/admin/commerce/labels';
import { formatDateTime, formatTime, formatXOF } from '@/lib/format';

export const metadata = { title: 'Clôtures de caisse' };

export default async function CashSessionsPage({ searchParams }: PageProps<'/admin/caisse/sessions'>) {
  await requireStaff('cash.manage');
  const { session: selected } = await searchParams;
  const sb = (await createClient())!;
  const { data } = await sb.from('cash_sessions').select('id, opened_at, closed_at, opening_float, expected_cash, counted_cash, difference, notes').order('opened_at', { ascending: false }).limit(60);
  const sessions = data ?? [];
  const sel = typeof selected === 'string' ? sessions.find((s) => s.id === selected) : undefined;
  const { data: txs } = sel ? await sb.from('cash_transactions').select('id, direction, category, amount, note, created_at').eq('session_id', sel.id).order('created_at') : { data: [] };

  return (
    <>
      <PageHeader back={{ href: '/admin/caisse', label: 'Caisse' }} title="Clôtures de caisse" description="Historique des sessions, écarts de caisse et mouvements d'espèces" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel padded={false} className="xl:col-span-2">
          {sessions.length === 0 ? <div className="p-5"><EmptyState title="Aucune session de caisse" /></div> : (
            <Table>
              <thead><tr><th>Ouverture</th><th>Clôture</th><th>Fond</th><th>Attendu</th><th>Compté</th><th>Écart</th></tr></thead>
              <tbody>{sessions.map((s) => (
                <tr key={s.id} className={s.id === sel?.id ? 'bg-powder-50' : ''}>
                  <td><a href={`/admin/caisse/sessions?session=${s.id}`} className="text-rosewood">{formatDateTime(s.opened_at)}</a></td>
                  <td>{s.closed_at ? formatDateTime(s.closed_at) : <Badge tone="success">Ouverte</Badge>}</td>
                  <td className="tabular-nums">{formatXOF(s.opening_float)}</td>
                  <td className="tabular-nums">{formatXOF(s.expected_cash)}</td>
                  <td className="tabular-nums">{formatXOF(s.counted_cash)}</td>
                  <td className={`tabular-nums font-semibold ${s.difference === null ? '' : s.difference === 0 ? 'text-success' : 'text-danger'}`}>{s.difference === null ? '—' : `${s.difference > 0 ? '+' : ''}${formatXOF(s.difference)}`}</td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Panel>
        <Panel title={sel ? `Mouvements du ${formatDateTime(sel.opened_at)}` : 'Détail'} padded={false} className="h-fit">
          {!sel ? <p className="p-5 text-sm text-muted">Sélectionnez une session.</p> : (txs ?? []).length === 0 ? <p className="p-5 text-sm text-muted">Aucun mouvement d&apos;espèces.</p> : (
            <ul className="divide-y divide-line/70 text-sm">{(txs ?? []).map((t) => (
              <li key={t.id} className="flex justify-between gap-3 px-5 py-2.5">
                <span>{CASH_CATEGORY_LABEL[t.category] ?? t.category}{t.note && <span className="text-muted"> · {t.note}</span>}<span className="block text-xs text-muted">{formatTime(t.created_at)}</span></span>
                <span className={`tabular-nums ${t.direction === 'out' ? 'text-danger' : 'text-success'}`}>{t.direction === 'out' ? '−' : '+'}{formatXOF(t.amount)}</span>
              </li>
            ))}</ul>
          )}
          {sel?.notes && <p className="border-t border-line px-5 py-3 text-xs text-muted whitespace-pre-line">{sel.notes}</p>}
        </Panel>
      </div>
    </>
  );
}
