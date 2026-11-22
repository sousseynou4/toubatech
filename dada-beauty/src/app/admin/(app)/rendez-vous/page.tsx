import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppointmentBadge, EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { addDays, formatTime, formatXOF, isoWeekday, todayInDakar } from '@/lib/format';
import { listAppointments, listEmployees, listServicesLite, type AppointmentRow } from '@/server/admin/queries';
import { APPOINTMENT_STATUS_LABEL } from '@/lib/types';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Rendez-vous' };
type View = 'jour' | 'semaine' | 'mois' | 'liste';

const iso = (d: string) => `${d}T00:00:00.000Z`; // Dakar = UTC+0, sans heure d'été
const dayOf = (ts: string) => ts.slice(0, 10);

export default async function AppointmentsPage({ searchParams }: PageProps<'/admin/rendez-vous'>) {
  const ctx = await requireStaff('dashboard.view');
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const view = (['jour', 'semaine', 'mois', 'liste'].includes(str('vue')) ? str('vue') : 'semaine') as View;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str('date')) ? str('date') : todayInDakar();
  const filters = { employe: str('employe'), prestation: str('prestation'), statut: str('statut'), q: str('q') };

  let from: string, to: string, days: string[];
  if (view === 'jour') { from = date; to = addDays(date, 1); days = [date]; }
  else if (view === 'mois' ) {
    const first = `${date.slice(0, 8)}01`;
    const gridStart = addDays(first, 1 - isoWeekday(first));
    days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    from = days[0]!; to = addDays(days[41]!, 1);
  } else if (view === 'liste') { from = date; to = addDays(date, 31); days = []; }
  else { const monday = addDays(date, 1 - isoWeekday(date)); days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)); from = days[0]!; to = addDays(days[6]!, 1); }

  const sb = (await createClient())!;
  const [rows, employees, services] = await Promise.all([
    listAppointments(sb, { from: iso(from), to: iso(to), employeeId: filters.employe || undefined, serviceId: filters.prestation || undefined, status: filters.statut || undefined, q: filters.q || undefined }),
    listEmployees(sb), listServicesLite(sb),
  ]);
  const shift = view === 'jour' ? 1 : view === 'mois' ? 30 : 7;
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ vue: view, date, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/rendez-vous?${p}`;
  };
  const label = view === 'jour' ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(iso(date)))
    : view === 'mois' ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso(date)))
    : view === 'liste' ? '31 prochains jours' : `Semaine du ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso(from)))}`;
  const byDay = (d: string) => rows.filter((r) => dayOf(r.start_at) === d);

  return (
    <>
      <PageHeader title="Rendez-vous" description={ctx.can('appointments.view_all') ? 'Planning de l\'institut' : 'Vos rendez-vous'}
        actions={ctx.can('appointments.manage') ? <ButtonLink href="/admin/rendez-vous/nouveau" size="sm"><Plus className="size-4" /> Nouveau rendez-vous</ButtonLink> : undefined} />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <Link href={qs({ date: addDays(date, -shift) })} className="grid size-9 place-items-center rounded-xl border border-line bg-white" aria-label="Période précédente"><ChevronLeft className="size-4" /></Link>
          <Link href={qs({ date: todayInDakar() })} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">Aujourd&apos;hui</Link>
          <Link href={qs({ date: addDays(date, shift) })} className="grid size-9 place-items-center rounded-xl border border-line bg-white" aria-label="Période suivante"><ChevronRight className="size-4" /></Link>
          <p className="ml-2 font-medium capitalize">{label}</p>
        </div>
        <div className="flex rounded-xl border border-line bg-white p-1 text-sm">
          {(['jour', 'semaine', 'mois', 'liste'] as const).map((v) => (
            <Link key={v} href={qs({ vue: v })} aria-current={view === v ? 'page' : undefined} className={cn('rounded-lg px-3 py-1.5 capitalize', view === v ? 'bg-powder-100 font-semibold text-rosewood-dark' : 'text-muted')}>{v}</Link>
          ))}
        </div>
      </div>

      <form className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" action="/admin/rendez-vous">
        <input type="hidden" name="vue" value={view} /><input type="hidden" name="date" value={date} />
        <input name="q" defaultValue={filters.q} placeholder="Cliente, téléphone, réf." className="field h-10 py-0" aria-label="Recherche cliente" />
        {ctx.can('appointments.view_all') && (
          <select name="employe" defaultValue={filters.employe} className="field h-10 py-0" aria-label="Employée">
            <option value="">Toutes les employées</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.display_name}</option>)}
          </select>
        )}
        <select name="prestation" defaultValue={filters.prestation} className="field h-10 py-0" aria-label="Prestation">
          <option value="">Toutes les prestations</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="statut" defaultValue={filters.statut} className="field h-10 py-0" aria-label="Statut">
          <option value="">Tous les statuts</option>{Object.entries(APPOINTMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="h-10 rounded-xl bg-ink text-sm text-ivory">Filtrer</button>
      </form>

      {view === 'jour' && <DayView rows={rows} employees={employees.filter((e) => e.is_active && (!filters.employe || e.id === filters.employe))} />}
      {view === 'semaine' && (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => (
            <div key={d} className={cn('rounded-2xl border border-line bg-white p-2', d === todayInDakar() && 'ring-2 ring-blush')}>
              <Link href={qs({ vue: 'jour', date: d })} className="block px-1 pb-2 text-xs font-semibold capitalize text-ink-soft">
                {new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso(d)))}
              </Link>
              <div className="grid gap-1.5">{byDay(d).map((a) => <ApptChip key={a.id} a={a} />)}{byDay(d).length === 0 && <p className="px-1 py-2 text-xs text-muted/70">—</p>}</div>
            </div>
          ))}
        </div>
      )}
      {view === 'mois' && (
        <div className="overflow-x-auto"><div className="grid min-w-[44rem] grid-cols-7 gap-1.5">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((w) => <p key={w} className="px-2 text-xs font-medium text-muted">{w}</p>)}
          {days.map((d) => {
            const list = byDay(d).filter((a) => a.status !== 'cancelled');
            return (
              <Link key={d} href={qs({ vue: 'jour', date: d })} className={cn('min-h-24 rounded-xl border border-line bg-white p-2 text-xs hover:border-blush', d.slice(0, 7) !== date.slice(0, 7) && 'opacity-45', d === todayInDakar() && 'ring-2 ring-blush')}>
                <span className="font-semibold">{Number(d.slice(8))}</span>
                {list.length > 0 && <span className="ml-1 rounded-full bg-powder-100 px-1.5 text-rosewood-dark">{list.length}</span>}
                <span className="mt-1 flex flex-wrap gap-0.5">{list.slice(0, 8).map((a) => <span key={a.id} className="size-2 rounded-full" style={{ background: a.employee?.color }} title={`${formatTime(a.start_at)} ${a.customer?.full_name}`} />)}</span>
              </Link>
            );
          })}
        </div></div>
      )}
      {view === 'liste' && (
        <Panel padded={false}>
          {rows.length === 0 ? <div className="p-5"><EmptyState title="Aucun rendez-vous sur la période" /></div> : (
            <ul className="divide-y divide-line/70">{rows.map((a) => (
              <li key={a.id}><Link href={`/admin/rendez-vous/${a.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-powder-50/50">
                <span className="w-28 tabular-nums text-muted">{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(a.start_at))} · {formatTime(a.start_at)}</span>
                <span className="min-w-40 flex-1 font-medium">{a.customer?.full_name}<span className="block text-xs font-normal text-muted">{a.services.map((s) => s.service_name).join(', ')} · {a.employee?.display_name}</span></span>
                <span className="tabular-nums">{formatXOF(a.total_amount)}</span><AppointmentBadge status={a.status} />
              </Link></li>
            ))}</ul>
          )}
        </Panel>
      )}
    </>
  );
}

function ApptChip({ a }: { a: AppointmentRow }) {
  return (
    <Link href={`/admin/rendez-vous/${a.id}`} className={cn('block rounded-xl border-l-4 bg-powder-50 px-2 py-1.5 text-xs hover:bg-powder-100', a.status === 'cancelled' && 'opacity-50 line-through')} style={{ borderColor: a.employee?.color }}>
      <span className="font-semibold tabular-nums">{formatTime(a.start_at)}</span> {a.customer?.full_name}
      <span className="block truncate text-[0.68rem] text-muted">{a.services.map((s) => s.service_name).join(', ')}</span>
    </Link>
  );
}

function DayView({ rows, employees }: { rows: AppointmentRow[]; employees: { id: string; display_name: string; color: string }[] }) {
  const startH = Math.min(8, ...rows.map((r) => new Date(r.start_at).getUTCHours()));
  const endH = Math.max(20, ...rows.map((r) => new Date(r.end_at).getUTCHours() + 1));
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  const PX = 56; // px par heure
  if (!employees.length) return <EmptyState title="Aucune employée active">Ajoutez l&apos;équipe dans le module Équipe.</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <div className="grid min-w-[40rem]" style={{ gridTemplateColumns: `3.5rem repeat(${employees.length}, minmax(10rem, 1fr))` }}>
        <div />
        {employees.map((e) => <div key={e.id} className="flex items-center gap-2 border-b border-l border-line px-3 py-2.5 text-sm font-medium"><span className="size-2.5 rounded-full" style={{ background: e.color }} />{e.display_name}</div>)}
        <div className="relative" style={{ height: hours.length * PX }}>
          {hours.map((h, i) => <span key={h} className="absolute right-2 -translate-y-2 text-[0.68rem] text-muted" style={{ top: i * PX }}>{String(h).padStart(2, '0')}:00</span>)}
        </div>
        {employees.map((e) => (
          <div key={e.id} className="relative border-l border-line" style={{ height: hours.length * PX, backgroundImage: `repeating-linear-gradient(to bottom, #F1E7EA 0 1px, transparent 1px ${PX}px)` }}>
            {rows.filter((r) => r.employee?.id === e.id).map((a) => {
              const s = new Date(a.start_at); const en = new Date(a.end_at);
              const top = (s.getUTCHours() + s.getUTCMinutes() / 60 - startH) * PX;
              const h = Math.max(26, ((en.getTime() - s.getTime()) / 36e5) * PX - 3);
              return (
                <Link key={a.id} href={`/admin/rendez-vous/${a.id}`} className={cn('absolute inset-x-1 overflow-hidden rounded-lg border-l-4 bg-powder-50 px-2 py-1 text-xs shadow-sm hover:bg-powder-100', a.status === 'cancelled' && 'opacity-40')} style={{ top, height: h, borderColor: e.color }}>
                  <span className="font-semibold">{formatTime(a.start_at)}–{formatTime(a.end_at)}</span> {a.customer?.full_name}
                  <span className="block truncate text-muted">{a.services.map((x) => x.service_name).join(', ')}</span>
                  <span className="mt-0.5 inline-block"><AppointmentBadge status={a.status} /></span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
