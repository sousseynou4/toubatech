import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Client service_role — CONTOURNE la RLS. À n'utiliser que côté serveur pour :
 * webhooks de paiement, upload des photos de devis, scripts d'administration.
 * Ne jamais importer depuis un composant client.
 */
export function createServiceClient() {
  if (typeof window !== 'undefined') throw new Error('service client côté navigateur interdit');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) return null;
  return createSupabaseClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
