import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the SERVICE_ROLE key.
 * NEVER import this in a Client Component or expose the key in any way
 * that reaches the browser bundle.
 *
 * The service-role key bypasses Row Level Security, which is exactly
 * what we want for trusted server-side inserts (form submissions).
 */
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. ` +
        `Add it to .env.local (or your hosting environment).`
    );
  }
  return value;
}

export function getServerSupabase() {
  return createClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
