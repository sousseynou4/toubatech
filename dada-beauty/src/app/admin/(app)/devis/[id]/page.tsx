import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { QuoteForm } from '@/components/admin/salon/content-forms';
import { QUOTE_STATUS_LABEL } from '@/lib/media';
import { buttonClass } from '@/components/ui/button';
import { formatDate, formatDateTime, formatXOF } from '@/lib/format';
import { formatPhone, whatsappLink } from '@/lib/phone';

export const metadata = { title: 'Devis' };
const EVENT_LABEL: Record<string, string> = { mariage: 'Mariage', bapteme: 'Baptême', anniversaire: 'Anniversaire', ceremonie: 'Cérémonie', domicile: 'Prestation à domicile', autre: 'Autre' };

export default async function QuoteDetail({ params }: PageProps<'/admin/devis/[id]'>) {
  const ctx = await requireStaff('quotes.manage');
  const { id } = await params;
  const sb = (await createClient())!;
  const { data: q } = await sb.from('event_quotes').select('*').eq('id', id).maybeSingle();
  if (!q) notFound();
  // URLs signées (1 h) — le bucket est privé, l'accès est contrôlé par la RLS (quotes.manage).
  const signed = q.inspiration_paths.length
    ? (await sb.storage.from('quote-inspirations').createSignedUrls(q.inspiration_paths, 3600)).data ?? []
    : [];
  const firstName = q.full_name.split(' ')[0];
  const reply = q.quoted_amount !== null
    ? `Bonjour ${firstName}, voici notre proposition Dada Beauty pour votre ${EVENT_LABEL[q.event_type]?.toLowerCase()} du ${formatDate(`${q.event_date}T12:00:00Z`)} (réf. ${q.reference}) : ${formatXOF(q.quoted_amount)}.${q.quote_details ? `\n${q.quote_details}` : ''}`
    : `Bonjour ${firstName}, merci pour votre demande de devis Dada Beauty (réf. ${q.reference}). `;

  return (
    <>
      <PageHeader back={{ href: '/admin/devis', label: 'Devis' }} title={q.full_name} description={`${q.reference} · ${QUOTE_STATUS_LABEL[q.status]}`}
        actions={<a href={whatsappLink(reply, q.phone)} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'sm')}><MessageCircle className="size-4" /> Répondre sur WhatsApp</a>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Panel title="Demande">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Événement</dt><dd className="font-medium">{EVENT_LABEL[q.event_type]}</dd></div>
              <div><dt className="text-muted">Date</dt><dd className="font-medium">{formatDate(`${q.event_date}T12:00:00Z`)}</dd></div>
              <div><dt className="text-muted">Lieu</dt><dd>{q.event_location}</dd></div>
              <div><dt className="text-muted">Personnes</dt><dd>{q.people_count}</dd></div>
              <div><dt className="text-muted">Contact</dt><dd>{formatPhone(q.phone)}{q.email && <span className="block">{q.email}</span>}</dd></div>
              <div><dt className="text-muted">Budget indicatif</dt><dd>{q.budget_hint !== null ? formatXOF(q.budget_hint) : '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted">Prestations souhaitées</dt><dd>{q.services_wanted.length ? q.services_wanted.join(', ') : '—'}</dd></div>
              {q.message && <div className="sm:col-span-2"><dt className="text-muted">Message</dt><dd className="whitespace-pre-line rounded-xl bg-powder-50 p-3">{q.message}</dd></div>}
              <div><dt className="text-muted">Reçue le</dt><dd>{formatDateTime(q.created_at)}</dd></div>
              {q.customer_id && ctx.can('customers.view') && <div><dt className="text-muted">Fiche cliente</dt><dd><Link href={`/admin/clientes/${q.customer_id}`} className="text-rosewood">Ouvrir la fiche</Link></dd></div>}
            </dl>
          </Panel>
          <Panel title={`Photos d'inspiration (${q.inspiration_paths.length})`}>
            {signed.length === 0 ? <p className="text-sm text-muted">Aucune photo jointe.</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {signed.map((s, i) => s.signedUrl ? (
                  <a key={i} href={s.signedUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, non optimisable */}
                    <img src={s.signedUrl} alt={`Inspiration ${i + 1}`} className="aspect-square w-full object-cover" />
                  </a>
                ) : null)}
              </div>
            )}
          </Panel>
        </div>
        <Panel title="Suivi du devis" className="h-fit">
          <QuoteForm quote={q} />
          {q.quoted_at && <p className="mt-3 text-xs text-muted">Montant défini le {formatDateTime(q.quoted_at)}</p>}
        </Panel>
      </div>
    </>
  );
}
