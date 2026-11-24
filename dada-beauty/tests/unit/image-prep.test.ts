import { describe, expect, it } from 'vitest';
import { batchBySize, fitWithin, MAX_IMAGE_BYTES, perImageBudget, REQUEST_IMAGE_BUDGET, shrinkFormImages, shrinkImage } from '@/lib/image-prep';

describe('préparation des photos', () => {
  it('répartit le budget d\'une requête entre les photos, avec un plafond par photo', () => {
    expect(perImageBudget(1)).toBe(MAX_IMAGE_BYTES);
    expect(perImageBudget(5)).toBe(700_000);
    expect(perImageBudget(0)).toBe(MAX_IMAGE_BYTES);
    expect(perImageBudget(5) * 5).toBeLessThanOrEqual(REQUEST_IMAGE_BUDGET);
  });

  it('regroupe les photos en lots qui tiennent dans une requête', () => {
    const f = (size: number) => ({ size });
    expect(batchBySize([f(1e6), f(1e6), f(1e6), f(1e6)]).map((b) => b.length)).toEqual([3, 1]);
    expect(batchBySize([f(5e6), f(1e5)]).map((b) => b.length)).toEqual([1, 1]);
    expect(batchBySize([])).toEqual([]);
    for (const b of batchBySize(Array.from({ length: 10 }, () => f(1.4e6)))) {
      expect(b.reduce((t, x) => t + x.size, 0)).toBeLessThanOrEqual(REQUEST_IMAGE_BUDGET);
    }
  });

  it('réduit les dimensions en gardant les proportions, sans agrandir', () => {
    expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3000, 4000, 2048)).toEqual({ width: 1536, height: 2048 });
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it('hors navigateur, laisse les fichiers et le formulaire intacts', async () => {
    const file = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });
    expect(await shrinkImage(file, 5)).toBe(file);
    const form = new FormData();
    form.append('alt', 'x');
    form.append('files', file);
    const out = await shrinkFormImages(form, 'files');
    expect(out.get('alt')).toBe('x');
    expect(out.getAll('files')).toHaveLength(1);
    const empty = new FormData();
    expect(await shrinkFormImages(empty, 'files')).toBe(empty);
  });
});
