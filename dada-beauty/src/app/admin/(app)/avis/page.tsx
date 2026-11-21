import Link from 'next/link';
import { BadgeCheck, Star } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { ReviewActions } from '@/components/admin/salon/content-forms';
import { Badge } from '@/components/ui/badge';
import { formatShortDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Avis clientes' };
const STATUS: Record<string, string> = { pending: 'À modérer', approved: 'Publiés', rejected: 'Refusés' };

export default async function ReviewsPage({ searchParams }: PageProps<'/admin/avis'>) {
  await requireStaff('reviews.manage');
  const { statut } = await searchParams;
  const filter = typeof statut === 'string' && statut in STATUS ? statut : 'pending';
  const sb = (await createClient())!;
  const { data } = await sb.from('reviews').select('id, display_name, rating, comment, is_verified, status, created_at, appointment_id, service:services(name)').eq('status', filter).order('created_at', { ascending: false }).limit(200);
  type R = { id: string; display_name: string; rating: number; comment: string | null; is_verified: boolean; status: string; created_at: string; appointment_id: string | null; service: { name: string } | null };
  return (
    <>
      <PageHeader title="Avis clientes" description="Seuls les avis liés à un rendez-vous terminé sont « vérifiés ». Rien n'est publié sans modération." />
      <nav className="mb-4 flex gap-2 text-sm" aria-label="Filtrer">
        {Object.entries(STATUS).map(([v, l]) => <Link key={v} href={`/admin/avis?statut=${v}`} className={cn('rounded-full px-3 py-1.5', filter === v ? 'bg-ink text-ivory' : 'border border-line bg-white')}>{l}</Link>)}
      </nav>
      {(data ?? []).length === 0 ? <EmptyState title="Aucun avis">Après une prestation terminée, envoyez le lien d&apos;avis depuis la fiche du rendez-vous (message WhatsApp « Demande d&apos;avis »).</EmptyState> : (
        <div className="grid gap-4 md:grid-cols-2">
          {((data ?? []) as unknown as R[]).map((r) => (
            <article key={r.id} className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <span aria-label={`${r.rating} sur 5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`inline size-4 ${i < r.rating ? 'fill-gold text-gold' : 'text-line'}`} />)}</span>
                {r.is_verified ? <Badge tone="success"><BadgeCheck className="size-3" /> Vérifié</Badge> : <Badge>Non vérifié</Badge>}
              </div>
              {r.comment && <p className="mt-3 text-sm leading-relaxed">« {r.comment} »</p>}
              <p className="mt-3 text-xs text-muted">{r.display_name} · {formatShortDate(r.created_at)}{r.service && ` · ${r.service.name}`}{r.appointment_id && <> · <Link href={`/admin/rendez-vous/${r.appointment_id}`} className="text-rosewood">rendez-vous</Link></>}</p>
              <div className="mt-4"><ReviewActions id={r.id} status={r.status} /></div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
