import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { catalogTemplates } from '../../src/lib/template-catalog';

test.beforeEach(async ({ page }) => {
  const auth = await page.request.post('/api/login', {
    headers: { Origin: process.env.APP_URL ?? 'http://localhost:3000' },
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  expect(auth.ok()).toBeTruthy();
});

test('el inicio muestra el catálogo completo y entra al creador con Las fijas seleccionada', async ({
  page,
}) => {
  const data = await (await page.request.get('/api/studio')).json();
  await page.goto('/');
  const catalog = page.getByRole('region', { name: 'Catálogo de formatos' });
  await expect(catalog.locator('.catalog-card')).toHaveCount(
    catalogTemplates(data.templates).length,
  );
  await page.screenshot({
    path: 'docs/screenshots/format-catalog.png',
    fullPage: true,
    animations: 'disabled',
  });
  await catalog.getByRole('button', { name: 'Ver formato Las fijas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Las fijas', exact: true })).toBeVisible();
  await expect(page.getByText('30 segundos', { exact: true }).first()).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/las-fijas-detail.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Crear con este formato' }).click();
  await page.locator('.question-option').first().click();
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await expect(page.getByRole('button', { name: /Las fijas/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Voces', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'La voz de tu contenido.' })).toBeVisible();
  await expect(page.locator('audio[data-reference]')).toHaveAttribute(
    'src',
    '/api/references/las-fijas/audio',
  );
  await page.screenshot({
    path: 'docs/screenshots/voices.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Volver al creador' }).click();
  await expect(page.locator('.question-option[aria-pressed=true]')).toHaveCount(0); // format step is still visible
  await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await expect(page.locator('.question-option[aria-pressed=true]')).toHaveCount(1);
});

test('filtra por tipo y conserva la navegación en móvil sin desbordamiento', async ({ page }) => {
  await page.goto('/');
  const catalog = page.getByRole('region', { name: 'Catálogo de formatos' });
  await catalog.getByRole('button', { name: 'Imágenes', exact: true }).click();
  await expect(catalog.locator('.catalog-card[data-kind=video]')).toHaveCount(0);
  await expect(catalog.locator('.catalog-card[data-kind=image]').first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/screenshots/catalog-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await catalog.getByRole('button', { name: 'Todos', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('button', { name: 'Voces', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'La voz de tu contenido.' })).toBeVisible();
});

test('la referencia está protegida y permite reproducir audio por rangos', async ({
  page,
  playwright,
}) => {
  const audio = await page.request.get('/api/references/las-fijas/audio', {
    headers: { Range: 'bytes=0-99' },
  });
  expect(audio.status()).toBe(206);
  expect((await audio.body()).byteLength).toBe(100);
  const guest = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  try {
    expect((await guest.get('/api/references/las-fijas/audio')).status()).toBe(401);
  } finally {
    await guest.dispose();
  }
});

test('una pregunta legada repetida muestra el problema y bloquea producción sin romper el creador', async ({
  page,
}) => {
  await page.route('**/api/studio', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.fal = { ...data.fal, configured: true };
    data.questions[0] = {
      ...data.questions[0],
      statement: '¿Cuál es el precio final?',
      explanation: 'Aplicamos porcentajes sucesivos.',
      approved: true,
      choices: [
        { label: 'A', text: 'S/96', correct: false },
        { label: 'B', text: 's/96', correct: true },
      ],
    };
    await route.fulfill({ response, json: data });
  });
  await page.goto('/#create');
  await page.locator('.question-option').first().click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Revisa el contenido seleccionado' }),
  ).toContainText('alternativas repetidas');
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await page.getByRole('button', { name: 'Revisar contenido' }).click();
  await page.getByRole('button', { name: 'Preparar producción' }).click();
  await expect(page.getByRole('heading', { name: 'Todo listo para producir' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generar 1 video', exact: true })).toBeDisabled();
});

test('el formato funciona sin el video original y muestra el costo de fal antes de producir', async ({
  page,
}) => {
  let submissions = 0;
  await page.route('**/api/batches', async (route) => {
    submissions++;
    await route.abort();
  });
  await page.route('**/api/studio', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.referenceVideoAvailable = false;
    data.fal = { ...data.fal, configured: true };
    await route.fulfill({ response, json: data });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver formato Las fijas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tu video de referencia' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Crear con este formato' }).click();
  await page.locator('.question-option').first().click();
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await page.getByRole('button', { name: 'Revisar contenido' }).click();
  await page.getByRole('button', { name: 'Preparar producción' }).click();
  await page.getByRole('button', { name: /fal.ai · Anima tu dinosaurio/ }).click();
  await expect(page.locator('.production-voice')).toContainText('Voz del dinosaurio');
  await expect(page.getByLabel('Voz del dinosaurio', { exact: true })).toHaveValue('Puck');
  await expect(page.locator('.cost-summary')).toContainText('0.15');
  await expect(page.getByRole('button', { name: 'Generar 1 video', exact: true })).toBeEnabled();
  expect(submissions).toBe(0);
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Anima con fal.ai' })).toBeVisible();
  await page.unroute('**/api/studio');
  await page.reload();
  await expect(page.getByLabel('API key de fal.ai')).toHaveValue('');
  await page.screenshot({
    path: 'docs/screenshots/fal-settings.png',
    fullPage: true,
    animations: 'disabled',
  });
});
