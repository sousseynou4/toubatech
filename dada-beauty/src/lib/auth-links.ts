/**
 * Liens d'accès à l'espace équipe (invitation, réinitialisation du mot de passe).
 *
 * Le lien pointe vers le site lui-même (/admin/connexion/confirmer) avec le jeton haché : le serveur vérifie
 * le jeton (verifyOtp) et pose la session dans les cookies. Contrairement au lien brut de Supabase, qui
 * renvoie la session dans le fragment d'URL (#access_token=…, invisible du serveur), ce lien fonctionne
 * quel que soit le navigateur, et affiche le domaine du salon quand on le transmet sur WhatsApp.
 */
export const PASSWORD_PAGE = '/admin/connexion/nouveau-mot-de-passe';

export type AccessLinkType = 'invite' | 'recovery';

export function accessLink(siteUrl: string, hashedToken: string, type: AccessLinkType, next: string = PASSWORD_PAGE): string {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(hashedToken)) throw new Error('INVALID_TOKEN_HASH');
  const u = new URL('/admin/connexion/confirmer', siteUrl);
  u.searchParams.set('token_hash', hashedToken);
  u.searchParams.set('type', type);
  u.searchParams.set('next', next.startsWith('/admin') ? next : PASSWORD_PAGE);
  return u.toString();
}
