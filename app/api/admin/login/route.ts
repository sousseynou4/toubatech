import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  createSessionToken,
  requireAdminEnv,
  verifyMasterPassword,
} from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/admin/login
 * Body: { password: string }
 *
 * On success, sets an HTTP-only signed cookie and returns 200.
 * On failure, intentionally waits a small random delay before responding
 * to make brute-force attempts uneconomical.
 */
export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_payload' },
      { status: 400 }
    );
  }

  const submitted = typeof body.password === 'string' ? body.password : '';

  let env;
  try {
    env = requireAdminEnv();
  } catch (err) {
    console.error('[admin/login] misconfiguration:', err);
    return NextResponse.json(
      { error: 'server_misconfigured' },
      { status: 500 }
    );
  }

  const ok = submitted.length > 0 && verifyMasterPassword(submitted, env.password);

  if (!ok) {
    // Slight random delay (200-500ms) to discourage automated brute force.
    await new Promise((resolve) =>
      setTimeout(resolve, 200 + Math.floor(Math.random() * 300))
    );
    return NextResponse.json(
      { error: 'invalid_credentials' },
      { status: 401 }
    );
  }

  const token = await createSessionToken(env.secret);
  const response = NextResponse.json({ ok: true }, { status: 200 });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });

  return response;
}
