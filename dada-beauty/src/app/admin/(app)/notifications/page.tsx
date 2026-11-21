import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { MarkAllRead } from '@/components/admin/system/notifications-client';
import { Badge, type Tone } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

const MSG_STATUS: Record<string, { label: string; tone: Tone }> = {
  manual: { label: 'Envoi manuel (WhatsApp)', tone: 'info' }, not_configured: { label: 'Non envoyé — fournisseur non configuré', tone: 'warning' },
  queued: { label: 'En file', tone: 'neutral' }, sent: { label: 'Envoyé', tone: 'success' }, delivered: { label: 'Délivré', tone: 'success' }, failed: { label: 'Échec', tone: 'danger' },
};

export default async function NotificationsPage() {
  const ctx = await requireStaff('notifications.view');
  const sb = (await createClient())!;
  const [{ data: notes }, { data: reads }, messages] = await Promise.all([
    sb.from('notifications').select('id, type, title, body, link, created_at').order('created_at', { ascending: false }).limit(100),
    sb.from('notification_reads').select('notification_id').eq('user_id', ctx.userId),
    ctx.can('customers.view')
      ? sb.from('message_log').select('id, channel, template, recipient, status, error, created_at').order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: null }),
  ]);
  const read = new Set((reads ?? []).map((r) => r.notification_id));
  const list = (notes ?? []) as { id: string; type: string; title: string; body: string | null; link: string | null; created_at: string }[];
  const unreadIds = list.filter((n) => !read.has(n.id)).map((n) => n.id);

  return (
    <>
      <PageHeader title="Notifications" description={`${unreadIds.length} non lue(s)`} actions={<MarkAllRead ids={unreadIds} />} />
      <Panel padded={false} title="Activité de l'institut">
        {list.length === 0 ? <div className="p-5"><EmptyState title="Aucune notification">Les nouvelles réservations, commandes, devis, avis et paiements en ligne apparaîtront ici.</EmptyState></div> : (
          <ul className="divide-y divide-line/70">
            {list.map((n) => {
              const unread = !read.has(n.id);
              const body = (
                <div className={cn('flex gap-3 px-5 py-3', unread && 'bg-powder-50/60')}>
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-rosewood' : 'bg-transparent')} aria-hidden />
                  <span className="flex-1"><span className={cn('block text-sm', unread && 'font-semibold')}>{n.title}</span>{n.body && <span className="block text-sm text-muted">{n.body}</span>}</span>
                  <span className="shrink-0 text-xs text-muted">{formatDateTime(n.created_at)}</span>
                </div>
              );
              return <li key={n.id}>{n.link?.startsWith('/admin') ? <Link href={n.link} className="block hover:bg-powder-50">{body}</Link> : body}</li>;
            })}
          </ul>
        )}
      </Panel>
      {messages.data && (
        <Panel padded={false} title="Messages aux clientes" className="mt-6">
          {messages.data.length === 0 ? <div className="p-5"><EmptyState title="Aucun message enregistré" /></div> : (
            <Table><thead><tr><th>Date</th><th>Canal</th><th>Modèle</th><th>Destinataire</th><th>Statut</th></tr></thead>
              <tbody>{(messages.data as { id: string; channel: string; template: string; recipient: string; status: string; error: string | null; created_at: string }[]).map((m) => (
                <tr key={m.id}><td className="whitespace-nowrap">{formatDateTime(m.created_at)}</td><td className="capitalize">{m.channel}</td><td>{m.template}</td><td>{formatPhone(m.recipient)}</td>
                  <td><Badge tone={MSG_STATUS[m.status]?.tone ?? 'neutral'}>{MSG_STATUS[m.status]?.label ?? m.status}</Badge>{m.error && <span className="block text-xs text-danger">{m.error}</span>}</td></tr>
              ))}</tbody></Table>
          )}
        </Panel>
      )}
    </>
  );
}
