import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/keepalive
 *
 * Garde la base Supabase active : le plan gratuit met en pause un projet sans activité
 * pendant environ 7 jours (le formulaire de diagnostic, la boutique et l'admin tombent alors en panne).
 * Appelée chaque jour par la tâche planifiée Vercel déclarée dans vercel.json.
 *
 * Fait une vraie requête en base : un simple test de disponibilité de l'API ne compte pas
 * comme activité pour Supabase.
 *
 * Si la variable CRON_SECRET est définie sur Vercel, Vercel l'envoie dans l'en-tête
 * Authorization et la route refuse tout autre appel.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.from('diagnostics').select('id', { count: 'exact', head: true });

  if (error) {
    console.error('[keepalive] Supabase injoignable :', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
