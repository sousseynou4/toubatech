import Link from 'next/link';
import { AlertTriangle, CalendarClock, CalendarDays, PackageSearch, Plus, Sparkles, Store, Users, Wallet } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppointmentBadge, EmptyState, KpiCard, PageHeader, Panel } from '@/components/admin/ui';
import { RankingBars, RevenueChart } from '@/components/admin/charts';
import { ButtonLink } from '@/components/ui/button';
import { Alert } from '@/components/ui/field';
import { addDays, formatDateTime, formatShortDate, formatTime, formatXOF, todayInDakar } from '@/lib/format';
import { listAppointments, lowStock } from '@/server/admin/queries';

export const dynamic = 'force-dynamic';

function nextDays(n: number) {
  const now = new Date();
  return { from: now.toISOString(), to: new Date(now.getTime() + n * 864e5).toISOString() };
}

interface Overview {
  appointments_today: number; appointments_pending: number; customers_total: number | null; customers_new_month: number | null;
  low_stock_count: number | null; orders_to_process: number | null; quotes_new: number | null;
  revenue_today: number | null; revenue_month: number | null; cash_in_today: number | null;
}

export default async function DashboardPage({ searchParams }: PageProps<'/admin'>) {
  const ctx = await requireStaff('dashboard.view');
  const { refus } = await searchParams;
  const sb = (await createClient())!;
  const today = todayInDakar();
  const monthStart = `${today.slice(0, 8)}01`;
  const canFin = ctx.can('analytics.view');

  const [{ data: ov }, upcoming, recent, stock, series, topServices, perf, settings, events] = await Promise.all([
    sb.rpc('dashboard_overview'),
    listAppointments(sb, { ...nextDays(14), limit: 40 }),
    listAppointments(sb, { order: 'created', limit: 6 }),
    ctx.can('products.view') ? lowStock(sb, 6) : Promise.resolve([]),
    canFin ? sb.rpc('analytics_revenue_series', { p_from: addDays(today, -29), p_to: today, p_granularity: 'day' }) : Promise.resolve({ data: [] }),
    canFin ? sb.rpc('analytics_top_services', { p_from: monthStart, p_to: today, p_limit: 6 }) : Promise.resolve({ data: [] }),
    canFin ? sb.rpc('analytics_employee_performance', { p_from: monthStart, p_to: today }) : Promise.resolve({ data: [] }),
    sb.from('business_settings').select('onboarding_completed').eq('id', 1).maybeSingle(),
    sb.from('appointment_events').select('id, event_type, to_status, created_at, appointment:appointments(id, reference)').order('created_at', { ascending: false }).limit(8),
  ]);
  const o = (ov ?? {}) as Overview;
  const next = upcoming.filter((a) => !['cancelled', 'completed', 'no_show'].includes(a.status)).slice(0, 7);
  const revenue = ((series.data ?? []) as { bucket: string; services: number; products: number }[]).map((r) => ({ label: formatShortDate(`${r.bucket}T12:00:00Z`).slice(0, 5), services: Number(r.services), products: Number(r.products) }));
  const hour = Number(new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', hour12: false, timeZone: 'Africa/Dakar' }).format(new Date()));
  const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const EVENT_LABEL: Record<string, string> = { created: 'Nouveau rendez-vous', status_changed: 'Statut modifié', rescheduled: 'Rendez-vous reporté', payment: 'Paiement enregistré', note: 'Note ajoutée' };

  return (
    <>
      <PageHeader
        title={`${hello}, ${ctx.fullName.split(' ')[0]} ✨`}
        description={new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'Africa/Dakar' }).format(new Date())}
        actions={<>
          {ctx.can('appointments.manage') && <ButtonLink href="/admin/rendez-vous/nouveau" size="sm"><Plus className="size-4" /> Rendez-vous</ButtonLink>}
          {ctx.can('pos.use') && <ButtonLink href="/admin/caisse" size="sm" variant="outline"><Store className="size-4" /> Caisse</ButtonLink>}
        </>}
      />
      {refus && <Alert tone="warning" className="mb-6">Vous n&apos;avez pas accès à cette page.</Alert>}
      {settings.data && !settings.data.onboarding_completed && ctx.can('settings.manage') && (
        <Alert tone="info" className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span><strong>Configuration initiale à terminer :</strong> horaires, tarifs, durées, équipe et paiements doivent être renseignés pour ouvrir la réservation en ligne.</span>
          <ButtonLink href="/admin/parametres/configuration" size="sm" variant="primary"><Sparkles className="size-4" /> Continuer la configuration</ButtonLink>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Rendez-vous du jour" value={o.appointments_today ?? 0} icon={<CalendarDays className="size-5" />} href="/admin/rendez-vous"
          hint={o.appointments_pending ? `${o.appointments_pending} demande${o.appointments_pending > 1 ? 's' : ''} en attente` : 'Aucune demande en attente'} />
        <KpiCard label="Chiffre d'affaires du mois" tone="gold" icon={<Wallet className="size-5" />} href={canFin ? '/admin/statistiques' : undefined}
          value={canFin ? formatXOF(o.revenue_month) : '—'} hint={canFin ? `Aujourd'hui : ${formatXOF(o.revenue_today)} · encaissé : ${formatXOF(o.cash_in_today)}` : 'Accès réservé'} />
        <KpiCard label="Clientes" tone="nude" icon={<Users className="size-5" />} href={o.customers_total !== null ? '/admin/clientes' : undefined}
          value={o.customers_total ?? '—'} hint={o.customers_new_month !== null ? `+${o.customers_new_month} ce mois-ci` : undefined} />
        <KpiCard label="Alertes de stock" tone={o.low_stock_count ? 'ink' : 'rose'} icon={<AlertTriangle className="size-5" />} href={o.low_stock_count !== null ? '/admin/stocks' : undefined}
          value={o.low_stock_count ?? '—'} hint={o.orders_to_process ? `${o.orders_to_process} commande(s) à traiter` : o.low_stock_count ? 'Produits à réapprovisionner' : 'Stocks au-dessus des seuils'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {canFin && (
          <Panel title="Chiffre d'affaires — 30 derniers jours" className="xl:col-span-2" action={<Link href="/admin/statistiques" className="text-xs text-rosewood">Statistiques →</Link>}>
            {revenue.some((r) => r.services + r.products > 0) ? <RevenueChart data={revenue} /> : <EmptyState title="Pas encore de ventes">Le graphique se remplit avec les prestations terminées et les ventes enregistrées.</EmptyState>}
          </Panel>
        )}
        <Panel title="Prochains rendez-vous" className={canFin ? '' : 'xl:col-span-2'} padded={false} action={<Link href="/admin/rendez-vous" className="text-xs text-rosewood">Planning →</Link>}>
          {next.length === 0 ? <div className="p-5"><EmptyState title="Aucun rendez-vous à venir" /></div> : (
            <ul className="divide-y divide-line/70">
              {next.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/rendez-vous/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-powder-50/50">
                    <span className="w-1 self-stretch rounded-full" style={{ background: a.employee?.color }} />
                    <span className="w-14 shrink-0 text-center"><span className="block text-sm font-semibold tabular-nums">{formatTime(a.start_at)}</span><span className="text-[0.68rem] text-muted">{formatShortDate(a.start_at).slice(0, 5)}</span></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.customer?.full_name}</span><span className="block truncate text-xs text-muted">{a.services.map((s) => s.service_name).join(', ')} · {a.employee?.display_name}</span></span>
                    <AppointmentBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {canFin && (
          <Panel title="Prestations du mois">
            {(topServices.data ?? []).length ? <RankingBars data={(topServices.data as { label: string; revenue: number }[]).map((s) => ({ label: s.label, value: Number(s.revenue) }))} /> : <EmptyState title="Aucune prestation terminée ce mois-ci" />}
          </Panel>
        )}
        {canFin && (
          <Panel title="Performance de l'équipe (mois)">
            {(perf.data ?? []).length ? (
              <ul className="grid gap-3">
                {(perf.data as { employee_id: string; display_name: string; color: string; appointments: number; completed: number; revenue: number }[]).map((e) => (
                  <li key={e.employee_id} className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: e.color }}>{e.display_name.slice(0, 2)}</span>
                    <span className="flex-1"><span className="block text-sm font-medium">{e.display_name}</span><span className="text-xs text-muted">{e.completed}/{e.appointments} rendez-vous terminés</span></span>
                    <span className="text-sm font-semibold tabular-nums">{formatXOF(Number(e.revenue))}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Aucune employée enregistrée" action={ctx.can('team.manage') ? <ButtonLink href="/admin/equipe" size="sm" variant="outline">Ajouter l&apos;équipe</ButtonLink> : undefined} />}
          </Panel>
        )}
        {ctx.can('products.view') && (
          <Panel title="À réapprovisionner" padded={false} action={<Link href="/admin/stocks" className="text-xs text-rosewood">Stocks →</Link>}>
            {stock.length === 0 ? <div className="p-5"><EmptyState title="Aucune alerte de stock" /></div> : (
              <ul className="divide-y divide-line/70">
                {stock.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="flex items-center gap-2"><PackageSearch className="size-4 text-muted" />{v.product?.name}{v.name !== 'Standard' && ` — ${v.name}`}</span>
                    <span className={v.stock_quantity === 0 ? 'font-semibold text-danger' : 'font-semibold text-warning'}>{v.stock_quantity} / seuil {v.alert_threshold}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        <Panel title="Réservations récentes" padded={false}>
          {recent.length === 0 ? <div className="p-5"><EmptyState title="Aucune réservation" /></div> : (
            <ul className="divide-y divide-line/70">
              {recent.map((a) => (
                <li key={a.id}><Link href={`/admin/rendez-vous/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-powder-50/50">
                  <span className="min-w-0"><span className="block truncate font-medium">{a.customer?.full_name}</span><span className="text-xs text-muted">{a.reference} · reçu le {formatDateTime(a.created_at)}</span></span>
                  <AppointmentBadge status={a.status} />
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Activité récente" padded={false}>
          {(events.data ?? []).length === 0 ? <div className="p-5"><EmptyState title="Aucune activité" /></div> : (
            <ul className="divide-y divide-line/70">
              {(events.data as unknown as { id: number; event_type: string; created_at: string; appointment: { id: string; reference: string } | null }[]).map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <CalendarClock className="size-4 shrink-0 text-muted" />
                  <span className="flex-1">{EVENT_LABEL[e.event_type] ?? e.event_type} {e.appointment && <Link href={`/admin/rendez-vous/${e.appointment.id}`} className="text-rosewood">{e.appointment.reference}</Link>}</span>
                  <span className="text-xs text-muted">{formatDateTime(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
