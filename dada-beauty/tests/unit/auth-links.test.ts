import { describe, expect, it } from 'vitest';
import { accessLink, PASSWORD_PAGE } from '@/lib/auth-links';

describe('liens d\'accès à l\'espace équipe', () => {
  it('pointe vers la page de confirmation du site avec le jeton haché', () => {
    const u = new URL(accessLink('https://dada-beauty-five.vercel.app', 'a1b2c3d4e5f6a7b8c9d0', 'invite'));
    expect(u.origin + u.pathname).toBe('https://dada-beauty-five.vercel.app/admin/connexion/confirmer');
    expect(u.searchParams.get('token_hash')).toBe('a1b2c3d4e5f6a7b8c9d0');
    expect(u.searchParams.get('type')).toBe('invite');
    expect(u.searchParams.get('next')).toBe(PASSWORD_PAGE);
  });

  it('ne redirige jamais hors de l\'espace équipe et refuse un jeton malformé', () => {
    expect(new URL(accessLink('http://localhost:3000', 'pkce_0123456789abcdef', 'recovery', 'https://evil.example')).searchParams.get('next')).toBe(PASSWORD_PAGE);
    expect(() => accessLink('http://localhost:3000', 'a b&c=d', 'invite')).toThrow();
  });
});
