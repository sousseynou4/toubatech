import Link from 'next/link';
import { FolderTree, Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ConfigBadge, EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { Alert } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Prestations' };

type Svc = { id: string; name: string; price: number | null; price_is_from: boolean; duration_minutes: number | null; status: 'to_configure' | 'active' | 'inactive'; is_featured: boolean; requires_quote: boolean; is_bookable: boolean; category_id: string; employees: unknown[] };

export default async function ServicesAdminPage({ searchParams }: PageProps<'/admin/prestations'>) {
  await requireStaff('services.manage');
  const { statut } = await searchParams;
  const filter = typeof statut === 'string' && ['to_configure', 'active', 'inactive'].includes(statut) ? statut : '';
  const sb = (await createClient())!;
  const [{ data: cats }, { data: svcs }] = await Promise.all([
    sb.from('service_categories').select('id, name, is_active').order('sort_order'),
    sb.from('services').select('id, name, price, price_is_from, duration_minutes, status, is_featured, requires_quote, is_bookable, category_id, employees:employee_services(employee_id)').order('sort_order'),
  ]);
  const all = (svcs ?? []) as Svc[];
  const list = filter ? all.filter((s) => s.status === filter) : all;
  const toConfigure = all.filter((s) => s.status === 'to_configure').length;
  const counts = { '': all.length, to_configure: toConfigure, active: all.filter((s) => s.status === 'active').length, inactive: all.filter((s) => s.status === 'inactive').length };
  const LABEL: Record<string, string> = { '': 'Toutes', to_configure: 'À configurer', active: 'Actives', inactive: 'Inactives' };

  return (
    <>
      <PageHeader title="Prestations" description="Catalogue, tarifs FCFA, durées et employées habilitées."
        actions={<>
          <ButtonLink href="/admin/prestations/categories" size="sm" variant="outline"><FolderTree className="size-4" /> Catégories</ButtonLink>
          <ButtonLink href="/admin/prestations/nouvelle" size="sm"><Plus className="size-4" /> Nouvelle prestation</ButtonLink>
        </>} />
      {toConfigure > 0 && <Alert tone="warning" className="mb-4">{toConfigure} prestation{toConfigure > 1 ? 's' : ''} sans prix ou durée confirmés : elles s&apos;affichent « Tarif sur demande » et ne sont pas réservables en ligne.</Alert>}
      <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Filtrer par statut">
        {Object.entries(counts).map(([k, n]) => (
          <Link key={k} href={k ? `/admin/prestations?statut=${k}` : '/admin/prestations'} className={cn('rounded-full px-3 py-1.5', filter === k ? 'bg-ink text-ivory' : 'border border-line bg-white')}>{LABEL[k]} ({n})</Link>
        ))}
      </nav>
      {(cats ?? []).length === 0 ? <EmptyState title="Aucune catégorie" action={<ButtonLink href="/admin/prestations/categories" size="sm">Créer une catégorie</ButtonLink>} /> : (
        <div className="grid gap-6">
          {(cats ?? []).map((c) => {
            const rows = list.filter((s) => s.category_id === c.id);
            if (filter && rows.length === 0) return null;
            return (
              <Panel key={c.id} title={<span className="flex items-center gap-2">{c.name}{!c.is_active && <Badge>Inactive</Badge>}</span>} padded={false}>
                {rows.length === 0 ? <p className="p-5 text-sm text-muted">Aucune prestation.</p> : (
                  <Table>
                    <thead><tr><th>Prestation</th><th>Prix</th><th>Durée</th><th>Employées</th><th>Statut</th></tr></thead>
                    <tbody>{rows.map((s) => (
                      <tr key={s.id}>
                        <td><Link href={`/admin/prestations/${s.id}`} className="font-medium hover:text-rosewood">{s.name}</Link>
                          <span className="ml-2 inline-flex gap-1">{s.is_featured && <Badge tone="gold">Vedette</Badge>}{s.requires_quote && <Badge tone="info">Devis</Badge>}{!s.is_bookable && <Badge>Hors ligne</Badge>}</span></td>
                        <td>{s.price === null ? <span className="text-warning">À définir</span> : formatPrice(s.price, s.price_is_from)}</td>
                        <td>{s.duration_minutes === null ? <span className="text-warning">À définir</span> : formatDuration(s.duration_minutes)}</td>
                        <td>{s.employees.length || <span className="text-warning">0</span>}</td>
                        <td><ConfigBadge status={s.status} /></td>
                      </tr>
                    ))}</tbody>
                  </Table>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
