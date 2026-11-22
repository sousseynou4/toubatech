import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { QUOTE_STATUS_LABEL } from '@/lib/media';
import { Badge, type Tone } from '@/components/ui/badge';
import { formatShortDate, formatXOF } from '@/lib/format';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Devis événements' };
const TONE: Record<string, Tone> = { new: 'warning', contacted: 'info', quoted: 'gold', accepted: 'success', declined: 'neutral', cancelled: 'neutral' };
const EVENT_LABEL: Record<string, string> = { mariage: 'Mariage', bapteme: 'Baptême', anniversaire: 'Anniversaire', ceremonie: 'Cérémonie', domicile: 'À domicile', autre: 'Autre' };

export default async function QuotesPage({ searchParams }: PageProps<'/admin/devis'>) {
  await requireStaff('quotes.manage');
  const { statut } = await searchParams;
  const filter = typeof statut === 'string' && statut in QUOTE_STATUS_LABEL ? statut : '';
  const sb = (await createClient())!;
  let q = sb.from('event_quotes').select('id, reference, full_name, event_type, event_date, people_count, status, quoted_amount, created_at').order('created_at', { ascending: false }).limit(200);
  if (filter) q = q.eq('status', filter);
  const { data } = await q;
  return (
    <>
      <PageHeader title="Devis événements" description="Mariages, baptêmes, anniversaires, cérémonies et prestations à domicile." />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Filtrer par statut">
        {[['', 'Tous'], ...Object.entries(QUOTE_STATUS_LABEL)].map(([v, l]) => <Link key={v} href={v ? `/admin/devis?statut=${v}` : '/admin/devis'} className={cn('rounded-full px-3 py-1.5', filter === v ? 'bg-ink text-ivory' : 'border border-line bg-white')}>{l}</Link>)}
      </nav>
      <Panel padded={false}>
        {(data ?? []).length === 0 ? <div className="p-5"><EmptyState title="Aucune demande de devis" /></div> : (
          <Table>
            <thead><tr><th>Demande</th><th>Événement</th><th>Date</th><th>Pers.</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>{(data ?? []).map((d) => (
              <tr key={d.id}>
                <td><Link href={`/admin/devis/${d.id}`} className="font-medium hover:text-rosewood">{d.full_name}</Link><span className="block text-xs text-muted">{d.reference} · reçu le {formatShortDate(d.created_at)}</span></td>
                <td>{EVENT_LABEL[d.event_type] ?? d.event_type}</td>
                <td>{formatShortDate(`${d.event_date}T12:00:00Z`)}</td>
                <td>{d.people_count}</td>
                <td>{d.quoted_amount !== null ? formatXOF(d.quoted_amount) : '—'}</td>
                <td><Badge tone={TONE[d.status]}>{QUOTE_STATUS_LABEL[d.status]}</Badge></td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
