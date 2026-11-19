import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { paymentSchema } from '@/lib/invoice';

export const runtime = 'nodejs';

// ── PATCH : enregistrer le paiement (seule modification permise après émission) ──
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ error: { code: 'validation_failed', issues: parsed.error.issues } }, { status: 400 });
  }

  const { error } = await getServerSupabase().from('invoices').update(parsed.data).eq('id', params.id);
  if (error) {
    console.error('[admin/invoices PATCH] error:', error);
    return NextResponse.json({ error: { code: 'update_failed', message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
