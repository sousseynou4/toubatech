import Link from 'next/link';
import { KeyRound, Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Équipe' };

export default async function TeamPage() {
  const ctx = await requireStaff('team.manage');
  const sb = (await createClient())!;
  const { data } = await sb.from('employees').select('id, display_name, full_name, specialties, color, is_active, accepts_online_booking, services:employee_services(service_id), schedules:employee_schedules(id)').order('sort_order').order('display_name');
  type Row = { id: string; display_name: string; full_name: string | null; specialties: string[]; color: string; is_active: boolean; accepts_online_booking: boolean; services: unknown[]; schedules: unknown[] };
  const rows = (data ?? []) as Row[];
  return (
    <>
      <PageHeader title="Équipe" description="Employées, prestations autorisées, plannings et absences."
        actions={<>
          {ctx.can('users.manage') && <ButtonLink href="/admin/equipe/comptes" size="sm" variant="outline"><KeyRound className="size-4" /> Comptes & rôles</ButtonLink>}
          <ButtonLink href="/admin/equipe/nouvelle" size="sm"><Plus className="size-4" /> Ajouter une employée</ButtonLink>
        </>} />
      {rows.length === 0 ? <EmptyState title="Aucune employée enregistrée">Ajoutez l&apos;équipe pour ouvrir la réservation en ligne : chaque employée a ses prestations et son planning.</EmptyState> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((e) => {
            const warn = e.services.length === 0 || e.schedules.length === 0;
            return (
              <Link key={e.id} href={`/admin/equipe/${e.id}`} className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft transition hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: e.color }}>{e.display_name.slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{e.display_name}</span><span className="block truncate text-xs text-muted">{e.specialties.join(' · ') || e.full_name || '—'}</span></span>
                  {!e.is_active && <Badge>Inactive</Badge>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Badge tone="rose">{e.services.length} prestation{e.services.length > 1 ? 's' : ''}</Badge>
                  {e.accepts_online_booking ? <Badge tone="success">En ligne</Badge> : <Badge>Hors ligne</Badge>}
                  {warn && <Badge tone="warning">{e.schedules.length === 0 ? 'Planning à saisir' : 'Prestations à cocher'}</Badge>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
