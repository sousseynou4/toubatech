import { NextResponse, type NextRequest } from 'next/server';
import { getStaffContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/** Export CSV (Excel FR : séparateur « ; », BOM UTF-8). Les RPC vérifient aussi analytics.view en base. */
const TYPES = ['summary', 'series', 'services', 'products', 'employees', 'stock'] as const;
type ExportType = (typeof TYPES)[number];

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s; // anti-injection de formules
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
function toCsv(headers: string[], rows: unknown[][]): string {
  return '﻿' + [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export async function GET(request: NextRequest) {
  const ctx = await getStaffContext();
  if (!ctx || !ctx.can('analytics.view')) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const type = sp.get('type') as ExportType;
  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!TYPES.includes(type) || !iso.test(from) || !iso.test(to) || from > to) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  const sb = (await createClient())!;
  const p = { p_from: from, p_to: to };
  let csv: string;

  if (type === 'summary') {
    const { data, error } = await sb.rpc('analytics_summary', p);
    if (error) return NextResponse.json({ error: 'Erreur' }, { status: 403 });
    const labels: Record<string, string> = {
      revenue_services: 'CA prestations (FCFA)', revenue_products: 'CA produits (FCFA)', discounts: 'Remises (FCFA)', revenue_net: 'CA net (FCFA)',
      cogs: 'Coût des marchandises (FCFA)', gross_margin_products: 'Marge produits (FCFA)', expenses: 'Dépenses (FCFA)', estimated_result: 'Résultat estimé (FCFA)',
      cash_in: 'Encaissements (FCFA)', refunds: 'Remboursements (FCFA)', deposits_held: 'Acomptes détenus (FCFA)', appointments_total: 'Rendez-vous',
      appointments_completed: 'Rendez-vous terminés', appointments_cancelled: 'Annulations', appointments_no_show: 'Absences',
      cancellation_rate: "Taux d'annulation (%)", no_show_rate: "Taux d'absence (%)", new_customers: 'Nouvelles clientes',
      orders_completed: 'Commandes/ventes finalisées', average_ticket: 'Panier moyen (FCFA)',
    };
    const d = data as Record<string, unknown>;
    csv = toCsv(['Indicateur', 'Valeur'], [['Période', `${from} → ${to}`], ...Object.entries(labels).map(([k, l]) => [l, d[k]])]);
  } else if (type === 'series') {
    const grain = ['day', 'week', 'month'].includes(sp.get('grain') ?? '') ? sp.get('grain')! : 'day';
    const { data, error } = await sb.rpc('analytics_revenue_series', { ...p, p_granularity: grain });
    if (error) return NextResponse.json({ error: 'Erreur' }, { status: 403 });
    csv = toCsv(['Période', 'CA prestations', 'CA produits', 'Encaissements', 'Dépenses'],
      (data as { bucket: string; services: number; products: number; cash_in: number; expenses: number }[]).map((r) => [r.bucket, r.services, r.products, r.cash_in, r.expenses]));
  } else if (type === 'services') {
    const { data, error } = await sb.rpc('analytics_top_services', { ...p, p_limit: 50 });
    if (error) return NextResponse.json({ error: 'Erreur' }, { status: 403 });
    csv = toCsv(['Prestation', 'Nombre', 'CA (FCFA)'], (data as { label: string; quantity: number; revenue: number }[]).map((r) => [r.label, r.quantity, r.revenue]));
  } else if (type === 'products') {
    const { data, error } = await sb.rpc('analytics_top_products', { ...p, p_limit: 50 });
    if (error) return NextResponse.json({ error: 'Erreur' }, { status: 403 });
    csv = toCsv(['Produit', 'Quantité', 'CA (FCFA)', 'Marge (FCFA)'], (data as { label: string; quantity: number; revenue: number; margin: number }[]).map((r) => [r.label, r.quantity, r.revenue, r.margin]));
  } else if (type === 'employees') {
    const { data, error } = await sb.rpc('analytics_employee_performance', p);
    if (error) return NextResponse.json({ error: 'Erreur' }, { status: 403 });
    csv = toCsv(['Employée', 'Rendez-vous', 'Terminés', 'Absences', 'CA (FCFA)'],
      (data as { display_name: string; appointments: number; completed: number; no_show: number; revenue: number }[]).map((r) => [r.display_name, r.appointments, r.completed, r.no_show, r.revenue]));
  } else {
    const { data, error } = await sb.rpc('analytics_stock_rotation', p);
    if (error) return NextResponse.json({ error: 'Erreur' }, { status: 403 });
    csv = toCsv(['Produit', 'Vendus', 'En stock', 'Seuil', 'Couverture (jours)'],
      (data as { label: string; sold: number; stock_quantity: number; alert_threshold: number; days_of_cover: number | null }[]).map((r) => [r.label, r.sold, r.stock_quantity, r.alert_threshold, r.days_of_cover]));
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dada-beauty-${type}-${from}_${to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
