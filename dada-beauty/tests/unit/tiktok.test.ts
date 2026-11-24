import { describe, expect, it } from 'vitest';
import { isShortTikTokLink, isTikTokHost, parseTikTokProfile, parseTikTokUrl, tiktokPlayerUrl, tiktokProfileEmbedUrl } from '@/lib/tiktok';

describe('tiktok', () => {
  it('extrait identifiant et compte d\'un lien de vidéo', () => {
    expect(parseTikTokUrl('https://www.tiktok.com/@aidasamb949/video/7312345678901234567?is_from_webapp=1&sender_device=pc')).toEqual({
      videoId: '7312345678901234567', handle: 'aidasamb949', url: 'https://www.tiktok.com/@aidasamb949/video/7312345678901234567',
    });
    expect(parseTikTokUrl('tiktok.com/@dada.beauty/photo/7312345678901234567')?.videoId).toBe('7312345678901234567');
    expect(parseTikTokUrl('https://www.tiktok.com/embed/v2/7312345678901234567')?.handle).toBeNull();
  });

  it('refuse les liens qui ne désignent pas une vidéo TikTok', () => {
    expect(parseTikTokUrl('https://www.tiktok.com/@aidasamb949')).toBeNull();
    expect(parseTikTokUrl('https://evil.example/@a/video/7312345678901234567')).toBeNull();
    expect(parseTikTokUrl('https://www.tiktok.com.evil.example/@ab/video/7312345678901234567')).toBeNull();
    expect(parseTikTokUrl('javascript:alert(1)')).toBeNull();
    expect(parseTikTokUrl('https://www.tiktok.com/@ab/video/123')).toBeNull();
  });

  it('reconnaît les liens courts de l\'application', () => {
    expect(isShortTikTokLink('https://vm.tiktok.com/ZMabc123/')).toBe(true);
    expect(isShortTikTokLink('https://www.tiktok.com/t/ZTabc123/')).toBe(true);
    expect(isShortTikTokLink('https://www.tiktok.com/@a/video/7312345678901234567')).toBe(false);
    expect(isTikTokHost('vt.tiktok.com')).toBe(true);
    expect(isTikTokHost('tiktok.com.evil.example')).toBe(false);
  });

  it('construit l\'URL du lecteur officiel et refuse un identifiant invalide', () => {
    expect(tiktokPlayerUrl('7312345678901234567')).toBe('https://www.tiktok.com/player/v1/7312345678901234567?rel=0&music_info=1&description=1');
    expect(() => tiktokPlayerUrl('../x')).toThrow();
  });

  it('reconnaît un lien de profil et construit le cadre officiel du profil', () => {
    expect(parseTikTokProfile('https://www.tiktok.com/@aidasamb949?_r=1&_t=ZS-9BckN4syTK8')).toBe('aidasamb949');
    expect(parseTikTokProfile('tiktok.com/@dada.beauty/')).toBe('dada.beauty');
    expect(parseTikTokProfile('https://www.tiktok.com/@aidasamb949/video/7651784115951324436')).toBeNull();
    expect(parseTikTokProfile('https://evil.example/@aidasamb949')).toBeNull();
    expect(parseTikTokProfile(null)).toBeNull();
    expect(tiktokProfileEmbedUrl('aidasamb949')).toBe('https://www.tiktok.com/embed/@aidasamb949');
    expect(() => tiktokProfileEmbedUrl('a/../b')).toThrow();
  });
});
