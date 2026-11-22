import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPhone } from '@/lib/phone';
import { formatShortDate } from '@/lib/format';

export const metadata = { title: 'Clientes' };
const PER_PAGE = 25;

export default async function CustomersPage({ searchParams }: PageProps<'/admin/clientes'>) {
  const ctx = await requireStaff('customers.view');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 60) : '';
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : 1) || 1);
  const sb = (await createClient())!;
  let query = sb.from('customers').select('id, full_name, phone, email, last_visit_at, created_at, marketing_consent, photo_consent', { count: 'exact' });
  if (q) {
    const safe = q.replace(/[%_,()]/g, '');
    const digits = q.replace(/\D/g, '');
    query = query.or(digits.length >= 3 ? `full_name.ilike.%${safe}%,phone.ilike.%${digits}%` : `full_name.ilike.%${safe}%`);
  }
  const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const rows = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const link = (p: number) => `/admin/clientes?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Clientes" description={`${count ?? 0} fiche${(count ?? 0) > 1 ? 's' : ''}`}
        actions={ctx.can('customers.manage') ? <ButtonLink href="/admin/clientes/nouvelle" size="sm"><Plus className="size-4" /> Nouvelle cliente</ButtonLink> : undefined} />
      <form className="mb-4 flex max-w-md gap-2" action="/admin/clientes">
        <input name="q" defaultValue={q} placeholder="Nom ou numéro de téléphone" className="field h-10 py-0" aria-label="Rechercher une cliente" />
        <button className="h-10 rounded-xl bg-ink px-4 text-sm text-ivory">Rechercher</button>
      </form>
      <Panel padded={false}>
        {rows.length === 0 ? <div className="p-5"><EmptyState title={q ? 'Aucune cliente trouvée' : 'Aucune cliente pour le moment'}>Les fiches sont créées automatiquement lors des réservations et commandes.</EmptyState></div> : (
          <Table>
            <thead><tr><th>Nom</th><th>Téléphone</th><th>Dernière visite</th><th>Inscription</th><th>Consentements</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/clientes/${c.id}`} className="font-medium text-ink hover:text-rosewood">{c.full_name}</Link>{c.email && <span className="block text-xs text-muted">{c.email}</span>}</td>
                  <td className="tabular-nums">{formatPhone(c.phone)}</td>
                  <td>{c.last_visit_at ? formatShortDate(c.last_visit_at) : <span className="text-muted">—</span>}</td>
                  <td>{formatShortDate(c.created_at)}</td>
                  <td className="space-x-1">{c.marketing_consent && <Badge tone="rose">Marketing</Badge>}{c.photo_consent && <Badge tone="gold">Photo</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="rounded-xl border border-line bg-white px-3 py-2">← Précédent</Link> : <span />}
          <span className="text-muted">Page {page} / {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="rounded-xl border border-line bg-white px-3 py-2">Suivant →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
