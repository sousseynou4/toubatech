#!/usr/bin/env node
/**
 * Création contrôlée du compte PROPRIÉTAIRE (aucun mot de passe codé en dur).
 *
 *   node --env-file=.env.local scripts/create-owner.mjs --email proprietaire@exemple.sn --name "Prénom Nom"
 *   (ou : npm run create-owner -- --email … --name …  avec les variables déjà exportées)
 *
 * Options :
 *   --role owner|super_admin   (défaut : owner)
 *   --link                     génère un lien de définition du mot de passe à transmettre
 *                              soi-même (au lieu d'envoyer un email d'invitation)
 *
 * Requiert NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SITE_URL.
 * À exécuter uniquement depuis un poste de confiance : la clé service_role contourne la RLS.
 */
import { createClient } from '@supabase/supabase-js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const email = arg('email')?.trim().toLowerCase();
const name = arg('name')?.trim() ?? '';
const role = arg('role') ?? 'owner';
const linkOnly = process.argv.includes('--link');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error('✘ --email valide requis'); process.exit(1); }
if (!['owner', 'super_admin'].includes(role)) { console.error('✘ --role doit être owner ou super_admin'); process.exit(1); }
if (!url || !key) { console.error('✘ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis'); process.exit(1); }
if (!site.startsWith('https://') && !site.startsWith('http://localhost')) { console.error('✘ NEXT_PUBLIC_SITE_URL requis (https://…)'); process.exit(1); }

const redirectTo = `${site}/admin/connexion/confirmer?next=/admin/connexion/nouveau-mot-de-passe`;
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser() {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u || data.users.length < 200) return u ?? null;
  }
  return null;
}

let user = await findUser();
let link = null;

if (!user && !linkOnly) {
  const { data, error } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: name } });
  if (error) { console.error('✘ Invitation impossible :', error.message); process.exit(1); }
  user = data.user;
  console.log(`✔ Invitation envoyée à ${email} (vérifiez la configuration SMTP de Supabase).`);
} else {
  const linkType = user ? 'recovery' : 'invite';
  const { data, error } = await sb.auth.admin.generateLink({ type: linkType, email, options: { redirectTo, data: { full_name: name } } });
  if (error) { console.error('✘ Génération du lien impossible :', error.message); process.exit(1); }
  user = data.user;
  // Lien vers le site (jeton haché vérifié côté serveur), plutôt que le lien brut de Supabase dont la session
  // arrive dans le fragment d'URL. Même format que src/lib/auth-links.ts.
  const hashed = data.properties?.hashed_token;
  if (hashed) {
    const u = new URL('/admin/connexion/confirmer', site);
    u.searchParams.set('token_hash', hashed);
    u.searchParams.set('type', linkType);
    u.searchParams.set('next', '/admin/connexion/nouveau-mot-de-passe');
    link = u.toString();
  }
}

const { error: pErr } = await sb.from('profiles').upsert({ id: user.id, full_name: name || email, role, is_active: true }, { onConflict: 'id' });
if (pErr) { console.error('✘ Profil non créé :', pErr.message); process.exit(1); }
console.log(`✔ Profil « ${role} » attribué à ${email}.`);
if (link) {
  console.log('\nLien à usage unique pour définir le mot de passe (à transmettre de manière privée, expire rapidement) :');
  console.log(link);
}
