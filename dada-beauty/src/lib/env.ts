/** Lecture centralisée des variables d'environnement publiques. */
export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && !env.supabaseUrl.includes('VOTRE-PROJET'));
}
