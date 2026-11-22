import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rafraîchit la session Supabase et protège /admin.
 * La vraie barrière reste la RLS + les vérifications de permission en base :
 * ce proxy n'est qu'une première ligne (redirection vers la connexion).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;
  const isLogin = pathname === '/admin/connexion' || pathname.startsWith('/admin/connexion/');

  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (pathname.startsWith('/admin') && !isLogin && !signedIn) {
    const login = request.nextUrl.clone();
    login.pathname = '/admin/connexion';
    login.search = pathname !== '/admin' ? `?redirect=${encodeURIComponent(pathname)}` : '';
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
