import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

/**
 * Edge middleware — runs BEFORE the page renders.
 * Protects every /admin/* path except /admin/login itself.
 *
 * If the session cookie is missing or invalid, the user is redirected
 * to /admin/login with a `redirect` query param so we can bring them
 * back to where they were trying to go.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public admin paths (always accessible)
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.ADMIN_SESSION_SECRET;

  // Server misconfiguration — refuse access loudly
  if (!secret || secret.length < 32) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('error', 'server_config');
    return NextResponse.redirect(loginUrl);
  }

  const valid = await verifySessionToken(token, secret);
  if (!valid) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    if (pathname !== '/admin') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match /admin and everything below, plus admin API routes
  matcher: ['/admin/:path*', '/api/admin/diagnostics/:path*'],
};
