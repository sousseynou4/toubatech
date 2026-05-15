import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase';
import { STATUS_ORDER } from '@/lib/labels';

export const runtime = 'nodejs';

/**
 * PATCH /api/admin/diagnostics/[id]
 * Body: { status?: DiagnosticStatus, technicianNotes?: string }
 *
 * Protected by middleware (matches /api/admin/diagnostics/:path*).
 *
 * Only specific fields are updateable — anything else in the payload
 * is silently ignored (defense-in-depth against mass-assignment).
 */
const updateSchema = z
  .object({
    status: z.enum(STATUS_ORDER as [string, ...string[]]).optional(),
    technicianNotes: z.string().max(5000).optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.technicianNotes !== undefined,
    { message: 'At least one field must be provided' }
  );

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();
  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    updatePayload.status = parsed.data.status;
  }
  if (parsed.data.technicianNotes !== undefined) {
    updatePayload.technician_notes = parsed.data.technicianNotes;
  }

  const { data, error } = await supabase
    .from('diagnostics')
    .update(updatePayload)
    .eq('id', id)
    .select('id, reference, status, technician_notes, updated_at')
    .single();

  if (error) {
    console.error('[admin/diagnostics] update error:', error);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, diagnostic: data }, { status: 200 });
}
