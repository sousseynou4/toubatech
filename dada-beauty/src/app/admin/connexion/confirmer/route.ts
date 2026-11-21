import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/** Retour des liens email Supabase (réinitialisation, invitation) : PKCE `code` ou `token_hash`. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = url.searchParams.get('next') ?? '/admin/connexion/nouveau-mot-de-passe';
  const safeNext = next.startsWith('/admin') ? next : '/admin';
  const sb = await createClient();
  if (sb) {
    const code = url.searchParams.get('code');
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type') as EmailOtpType | null;
    const { error } = code
      ? await sb.auth.exchangeCodeForSession(code)
      : tokenHash && type ? await sb.auth.verifyOtp({ token_hash: tokenHash, type }) : { error: new Error('missing') };
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL('/admin/connexion?erreur=lien', url.origin));
}
