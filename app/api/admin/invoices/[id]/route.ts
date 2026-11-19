import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { paymentSchema } from '@/lib/invoice';

export const runtime = 'nodejs';

// ── POST : enregistrer un règlement (total ou partiel) ; la base refuse de dépasser le reste dû ──
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return NextResponse.json({ error: { code: 'invalid_id' } }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json' } }, { status: 400 });
  }

  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'validation_failed', message: parsed.error.issues[0]?.message, issues: parsed.error.issues } },
      { status: 400 }
    );
  }

  const { error } = await getServerSupabase().rpc('add_invoice_payment', {
    p_invoice: params.id,
    p_paid_at: parsed.data.paid_at,
    p_amount: parsed.data.amount_cents,
    p_method: parsed.data.payment_method,
  });
  if (error) {
    console.error('[admin/invoices payment] error:', error);
    // Les refus métier (montant trop élevé, facture annulée) viennent de la base, en français.
    return NextResponse.json({ error: { code: 'payment_failed', message: error.message } }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
