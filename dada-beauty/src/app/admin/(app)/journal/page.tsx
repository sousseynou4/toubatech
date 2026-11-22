import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import { Badge } from '@/components/ui/badge';
import { addDays, formatDateTime } from '@/lib/format';

export const metadata = { title: 'Journal d\'audit' };
export const dynamic = 'force-dynamic';

const PAGE = 50;
const TABLES = ['appointments', 'payments', 'orders', 'products', 'product_variants', 'services', 'customers', 'profiles', 'role_permissions', 'business_settings', 'business_hours', 'cash_sessions', 'expenses', 'gift_cards', 'event_quotes'];
const ACTIONS = ['INSERT', 'UPDATE', 'DELETE'];
const HIDDEN = new Set(['updated_at', 'created_at']);

function diff(oldD: Record<string, unknown> | null, newD: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(oldD ?? {}), ...Object.keys(newD ?? {})]);
  return [...keys].filter((k) => !HIDDEN.has(k) && JSON.stringify(oldD?.[k]) !== JSON.stringify(newD?.[k]))
    .map((k) => ({ key: k, from: oldD?.[k], to: newD?.[k] }));
}
const show = (v: unknown) => (v === null || v === undefined ? '∅' : typeof v === 'object' ? JSON.stringify(v) : String(v)).slice(0, 120);

export default async function AuditPage({ searchParams }: PageProps<'/admin/journal'>) {
  await requireStaff('audit.view');
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const table = TABLES.includes(s('table')) ? s('table') : '';
  const action = ACTIONS.includes(s('action')) ? s('action') : '';
  const day = /^\d{4}-\d{2}-\d{2}$/.test(s('date')) ? s('date') : '';
  const page = Math.max(0, Number.parseInt(s('page') || '0', 10) || 0);
  const sb = (await createClient())!;
  let q = sb.from('audit_logs').select('id, occurred_at, actor_id, actor_role, table_name, record_id, action, old_data, new_data').order('occurred_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE);
  if (table) q = q.eq('table_name', table);
  if (action) q = q.eq('action', action);
  if (day) q = q.gte('occurred_at', `${day}T00:00:00Z`).lt('occurred_at', `${addDays(day, 1)}T00:00:00Z`);
  const { data } = await q;
  const rows = (data ?? []) as { id: number; occurred_at: string; actor_id: string | null; actor_role: string | null; table_name: string; record_id: string | null; action: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null }[];
  const hasMore = rows.length > PAGE;
  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const qs = (p: number) => `/admin/journal?${new URLSearchParams({ ...(table && { table }), ...(action && { action }), ...(day && { date: day }), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Journal d'audit" description="Actions sensibles enregistrées automatiquement par la base (non modifiable)." />
      <form className="mb-5 grid gap-2 sm:grid-cols-4" action="/admin/journal">
        <select name="table" defaultValue={table} className="field h-10 py-0" aria-label="Table"><option value="">Toutes les données</option>{TABLES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select name="action" defaultValue={action} className="field h-10 py-0" aria-label="Action"><option value="">Toutes les actions</option><option value="INSERT">Création</option><option value="UPDATE">Modification</option><option value="DELETE">Suppression</option></select>
        <input type="date" name="date" defaultValue={day} className="field h-10 py-0" aria-label="Date" />
        <button className="h-10 rounded-xl bg-ink text-sm text-ivory">Filtrer</button>
      </form>
      <Panel padded={false}>
        {rows.length === 0 ? <div className="p-5"><EmptyState title="Aucune entrée" /></div> : (
          <ul className="divide-y divide-line/70">
            {rows.slice(0, PAGE).map((r) => {
              const changes = r.action === 'UPDATE' ? diff(r.old_data, r.new_data) : [];
              return (
                <li key={r.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.action === 'DELETE' ? 'danger' : r.action === 'INSERT' ? 'success' : 'info'}>{r.action === 'INSERT' ? 'Création' : r.action === 'UPDATE' ? 'Modification' : 'Suppression'}</Badge>
                    <span className="font-medium">{r.table_name}</span>
                    <span className="font-mono text-xs text-muted">{r.record_id?.slice(0, 8)}</span>
                    <span className="ml-auto text-xs text-muted">{formatDateTime(r.occurred_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Par {r.actor_id ? names.get(r.actor_id) ?? r.actor_id.slice(0, 8) : 'système / client en ligne'}{r.actor_role ? ` (${r.actor_role})` : ''}</p>
                  {changes.length > 0 && (
                    <ul className="mt-2 grid gap-0.5 rounded-lg bg-nude-50 p-2 font-mono text-[0.72rem]">
                      {changes.slice(0, 12).map((c) => <li key={c.key}><span className="text-ink-soft">{c.key}</span> : <span className="text-danger line-through">{show(c.from)}</span> → <span className="text-success">{show(c.to)}</span></li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <div className="mt-4 flex justify-between text-sm">
        {page > 0 ? <Link href={qs(page - 1)} className="text-rosewood">← Plus récents</Link> : <span />}
        {hasMore && <Link href={qs(page + 1)} className="text-rosewood">Plus anciens →</Link>}
      </div>
    </>
  );
}
