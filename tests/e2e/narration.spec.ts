import 'dotenv/config';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const auth = await page.request.post('/api/login', {
    headers: { Origin: process.env.APP_URL ?? 'http://localhost:3000' },
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  expect(auth.ok()).toBeTruthy();
});

test('elige una voz, conserva la selección y la envía con el lote sin hacer una generación', async ({
  page,
}) => {
  await page.goto('/#create');
  await page.locator('.question-option').first().click();
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await page.getByRole('button', { name: /Las fijas/ }).click();
  await page.getByRole('button', { name: 'Revisar contenido' }).click();
  await page.getByRole('button', { name: 'Preparar producción' }).click();
  const voices = page.getByLabel('Voz del dinosaurio', { exact: true });
  await expect(voices).toHaveValue('Puck');
  await expect(voices.locator('option')).toHaveCount(5);
  await voices.selectOption('Fenrir');
  await expect(page.getByLabel('Escuchar voz seleccionada')).toHaveAttribute(
    'src',
    '/previews/gemini/fenrir.wav',
  );
  await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await page.getByRole('button', { name: 'Preparar producción' }).click();
  await expect(voices).toHaveValue('Fenrir');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '/tmp/ingresape-narration-creator-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  let payload: Record<string, unknown> | undefined;
  await page.route('**/api/batches', async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { id: 'test-narration-no-generation' } });
  });
  await page.getByRole('button', { name: 'Generar 1 video', exact: true }).click();
  await expect
    .poll(() => payload)
    .toMatchObject({ voice: { provider: 'gemini', name: 'Fenrir' }, provider: 'demo' });
});

test('sin clave ofrece video sin voz y explica cómo habilitar la narración', async ({ page }) => {
  await page.route('**/api/studio', async (route) => {
    const response = await route.fetch(),
      data = await response.json();
    data.narration = { ...data.narration, configured: false };
    await route.fulfill({ response, json: data });
  });
  await page.goto('/#create');
  await page.locator('.question-option').first().click();
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await page.getByRole('button', { name: 'Revisar contenido' }).click();
  await page.getByRole('button', { name: 'Preparar producción' }).click();
  await expect(page.getByLabel('Voz del dinosaurio', { exact: true })).toHaveValue('');
  await expect(page.getByText(/Configura GEMINI_API_KEY en el servidor/)).toBeVisible();
  await expect(page.getByRole('option', { name: /Puck/ })).toBeDisabled();
});
