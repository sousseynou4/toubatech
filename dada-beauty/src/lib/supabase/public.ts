import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/lib/env';

/**
 * Client anonyme sans cookies (lecture du catalogue public, RPC publiques).
 * Soumis à la RLS « anon ».
 */
export function createPublicClient() {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
