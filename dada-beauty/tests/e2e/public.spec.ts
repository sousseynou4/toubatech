import { expect, test } from '@playwright/test';

/**
 * Parcours publics. Ces tests tournent sans base de données (CI) : ils
 * vérifient le rendu, la navigation, le responsive, l'accessibilité de base
 * et le comportement honnête quand les données ne sont pas configurées.
 */
const PAGES = ['/', '/prestations', '/galerie', '/boutique', '/a-propos', '/contact', '/reserver', '/evenements', '/suivi', '/panier', '/mentions-legales', '/confidentialite', '/conditions'];

for (const path of PAGES) {
  test(`${path} : rendu sans débordement horizontal`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });
}

test('accueil : CTA de réservation et WhatsApp officiel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Réserver un rendez-vous/ }).first()).toBeVisible();
  const wa = page.getByRole('link', { name: 'Nous écrire sur WhatsApp' });
  await expect(wa).toHaveAttribute('href', /wa\.me\/221778088893/);
  await expect(page).toHaveTitle(/Dada Beauty/);
  await expect(page.getByText('Dada Beauty Plus')).toHaveCount(0);
});

test('navigation principale (menu mobile ou barre desktop)', async ({ page }) => {
  const isMobile = (page.viewportSize()?.width ?? 1440) < 1024; // menu hamburger sous 1024 px
  await page.goto('/');
  if (isMobile) {
    await page.waitForLoadState('networkidle'); // attendre l'hydratation React
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect(async () => {
      await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass();
    await menu.getByRole('link', { name: 'Nos prestations' }).click();
  } else {
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Nos prestations' }).click();
  }
  await expect(page).toHaveURL(/\/prestations$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('prestations');
});

test('réservation : message honnête et repli WhatsApp si non configurée', async ({ page }) => {
  await page.goto('/reserver');
  await expect(page.getByText(/sera disponible dès que les prestations, tarifs et horaires auront été configurés/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Réserver sur WhatsApp/ })).toHaveAttribute('href', /wa\.me/);
});

test('panier vide', async ({ page }) => {
  await page.goto('/panier');
  await expect(page.getByText('Votre panier est vide')).toBeVisible();
});

test('suivi : onglets rendez-vous / commande', async ({ page }) => {
  await page.goto('/suivi');
  await page.getByRole('tab', { name: /Commande/ }).click();
  await expect(page.getByLabel('Référence de commande')).toBeVisible();
});

test('devis : validation côté navigateur des champs requis', async ({ page }) => {
  await page.goto('/evenements');
  await page.getByRole('button', { name: /Envoyer ma demande de devis/ }).click();
  await expect(page.getByLabel('Nom et prénom')).toHaveJSProperty('validity.valueMissing', true);
});

test('espace équipe protégé', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/connexion/);
  await expect(page.getByRole('heading', { name: 'Espace équipe' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('en-têtes de sécurité et SEO technique', async ({ request }) => {
  const res = await request.get('/');
  expect(res.headers()['x-frame-options']).toBe('DENY');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  expect(res.headers()['x-powered-by']).toBeUndefined();
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /admin');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/prestations');
  const ld = await (await request.get('/')).text();
  expect(ld).toContain('"@type":"BeautySalon"');
});

test('webhook de paiement : refusé tant que le fournisseur n\'est pas configuré', async ({ request }) => {
  const res = await request.post('/api/paiements/webhook/wave', { data: { id: 'evt', type: 'checkout.session.completed' } });
  expect(res.status()).toBe(503);
  const unknown = await request.post('/api/paiements/webhook/paypal', { data: {} });
  expect(unknown.status()).toBe(404);
  const init = await request.post('/api/paiements/initier', { data: { provider: 'wave', type: 'order', reference: 'CMD-XXXXXX', secret: '771112233' } });
  expect(init.status()).toBe(503);
});
