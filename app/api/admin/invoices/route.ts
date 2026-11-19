import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { BUSINESS, FULL_ADDRESS, LEGAL, SITE_URL } from '@/lib/site';
import {
  invoiceInputSchema,
  invoiceTotal,
  paymentsOf,
  remainingCents,
  OPERATION_LABELS,
  type InvoicePayment,
  type InvoiceRow,
} from '@/lib/invoice';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f-]{36}$/i;

/** Identité du vendeur figée sur la facture (si l'adresse change plus tard, la facture reste juste). */
function sellerSnapshot(): InvoiceRow['seller'] {
  return {
    tradeName: BUSINESS.name,
    legalName: LEGAL.ownerWithStatus,
    status: LEGAL.status,
    address: FULL_ADDRESS,
    siret: LEGAL.siret,
    phone: BUSINESS.telephoneDisplay,
    email: BUSINESS.email,
    website: SITE_URL.replace(/^https?:\/\//, ''),
  };
}

// ── POST : émettre une facture, ou un avoir si { credit_note_for: <id> } ──
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json' } }, { status: 400 });
  }

  const supabase = getServerSupabase();
  let record: Record<string, unknown>;

  if (typeof body.credit_note_for === 'string') {
    if (!UUID.test(body.credit_note_for)) {
      return NextResponse.json({ error: { code: 'invalid_id' } }, { status: 400 });
    }
    const { data: original } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', body.credit_note_for)
      .single<InvoiceRow>();
    if (!original || original.kind !== 'invoice') {
      return NextResponse.json({ error: { code: 'not_found', message: 'Facture introuvable.' } }, { status: 404 });
    }
    // L'avoir reprend la facture à l'identique, montants en négatif.
    const lines = original.lines.map((l) => ({ ...l, unit_price_cents: -l.unit_price_cents }));
    const { id, number, issue_date, created_at, paid_at, payment_method, warranty, ...rest } = original;
    record = {
      ...rest,
      kind: 'credit_note',
      credit_note_for: id,
      lines,
      total_cents: invoiceTotal(lines),
      notes: `Avoir annulant la facture n° ${number}.`,
      seller: sellerSnapshot(),
      vat_mention: LEGAL.vat,
    };
  } else {
    const parsed = invoiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'validation_failed', message: parsed.error.issues[0]?.message, issues: parsed.error.issues } },
        { status: 400 }
      );
    }
    const d = parsed.data;
    record = {
      ...d, // initial_payment éventuel : enregistré par la base dans la même transaction
      kind: 'invoice',
      // Totaux toujours recalculés côté serveur.
      total_cents: invoiceTotal(d.lines),
      seller: sellerSnapshot(),
      vat_mention: LEGAL.vat,
    };
  }

  const { data: number, error } = await supabase.rpc('create_invoice', { p: record });
  if (error) {
    console.error('[admin/invoices POST] error:', error);
    const duplicate = error.code === '23505';
    return NextResponse.json(
      {
        error: {
          code: duplicate ? 'duplicate' : 'insert_failed',
          message: duplicate ? 'Un avoir existe déjà pour cette facture.' : error.message,
        },
      },
      { status: duplicate ? 409 : 500 }
    );
  }

  return NextResponse.json({ ok: true, number }, { status: 201 });
}

// ── GET : export CSV (livre des recettes / comptable) ─────────────────────
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 });
  }

  const { data, error } = await getServerSupabase()
    .from('invoices')
    .select('number, kind, issue_date, service_date, due_date, customer_name, customer_company, operation_type, total_cents, paid_at, payment_method, invoice_payments(paid_at, amount_cents, method)')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin/invoices GET] error:', error);
    return NextResponse.json({ error: { code: 'fetch_failed' } }, { status: 500 });
  }

  // Texte saisi par des clients (formulaire de diagnostic) : neutraliser les formules Excel.
  const cell = (v: string | null) => `"${(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const amount = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

  const header = ['N°', 'Type', 'Date émission', 'Date prestation', 'Échéance', 'Client', 'Nature', 'Montant (€)', 'Réglé (€)', 'Reste dû (€)', 'Règlements (date, mode, montant)'];
  const rows = ((data ?? []) as unknown as (InvoiceRow & { invoice_payments: InvoicePayment[] })[]).map((r) => {
    const payments = paymentsOf(r);
    const remaining = remainingCents(r);
    return [
      cell(r.number),
      cell(r.kind === 'credit_note' ? 'Avoir' : 'Facture'),
      cell(r.issue_date),
      cell(r.service_date),
      cell(r.due_date),
      cell(r.customer_company ? `${r.customer_company} (${r.customer_name})` : r.customer_name),
      cell(OPERATION_LABELS[r.operation_type] ?? r.operation_type),
      amount(r.total_cents),
      amount(Math.abs(r.total_cents) - remaining),
      // Avoir : reste à rembourser, pas une dette du client.
      r.kind === 'credit_note' ? '' : amount(remaining),
      cell(payments.map((p) => `${p.paid_at} ${p.method} ${amount(p.amount_cents)}`).join(' | ')),
    ].join(';');
  });

  // BOM + « ; » : s'ouvre directement dans Excel en français.
  const csv = '﻿' + [header.map(cell).join(';'), ...rows].join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="factures-toubatech-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
