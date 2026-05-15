import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { diagnosticSchema, generateReference } from '@/lib/validation';
import { getServerSupabase } from '@/lib/supabase';
import { sendDiagnosticEmails } from '@/lib/email';

// Force the Node.js runtime — Edge runtime doesn't support some deps yet
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Corps de requête invalide.' } },
      { status: 400 }
    );
  }

  // ── Validate payload ─────────────────────────────────────────
  let data;
  try {
    data = diagnosticSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Certains champs sont invalides.',
            issues: err.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
        },
        { status: 400 }
      );
    }
    throw err;
  }

  // ── Persist to Supabase ──────────────────────────────────────
  const reference = generateReference();
  const supabase = getServerSupabase();

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;
  const userAgent = request.headers.get('user-agent') || null;

  const { error: dbError, data: inserted } = await supabase
    .from('diagnostics')
    .insert({
      reference,
      device: data.device,
      brand: data.brand,
      model: data.model,
      problems: data.problems,
      problem_details: data.problemDetails ?? '',
      incident: data.incident,
      incident_details: data.incidentDetails ?? '',
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      pickup: data.pickup,
      preferred_date: data.preferredDate || null,
      preferred_time: data.preferredTime || null,
      consent_given: data.consent,
      source: 'web',
      ip_address: ip,
      user_agent: userAgent,
    })
    .select('id, reference')
    .single();

  if (dbError) {
    console.error('[diagnostic] Supabase insert error:', dbError);
    return NextResponse.json(
      {
        error: {
          code: 'persistence_failed',
          message:
            'Nous n\'avons pas pu enregistrer votre demande. Veuillez réessayer dans un instant.',
        },
      },
      { status: 500 }
    );
  }

  // ── Send emails (non-blocking errors, demand already saved) ──
  const emailResult = await sendDiagnosticEmails({ reference, data });

  if (emailResult.errors.length > 0) {
    // Don't fail the request — the diagnostic IS saved.
    // Surface this in logs for monitoring.
    console.warn(
      `[diagnostic] ${reference} — email partial failure:`,
      emailResult.errors
    );
  }

  return NextResponse.json(
    {
      reference,
      id: inserted.id,
      status: 'received',
      emailSent: emailResult.customerEmailId !== null,
    },
    { status: 200 }
  );
}
