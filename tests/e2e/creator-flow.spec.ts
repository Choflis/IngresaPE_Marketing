import 'dotenv/config';
import { test, expect } from '@playwright/test';
test('el creador guía por pasos y conserva la selección al volver', async ({ page }) => {
  const auth = await page.request.post('/api/login', {
    headers: { Origin: process.env.APP_URL ?? 'http://localhost:3000' },
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  expect(auth.ok()).toBeTruthy();
  await page.goto('/#create');
  await expect(page.getByRole('heading', { name: 'Prepara tu próxima clase.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar a formato' })).toBeDisabled();
  await page.screenshot({
    path: 'docs/screenshots/academic-creator.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('.question-option').first().click();
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await expect(page.getByRole('heading', { name: 'Elige cómo enseñar' })).toBeVisible();
  await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await expect(page.locator('.question-option[aria-pressed=true]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await page.getByRole('button', { name: /Pregunta del día/ }).click();
  await page.getByRole('button', { name: 'Revisar contenido' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa antes de compartir' })).toBeVisible();
  await expect(page.getByText('Respuesta correcta', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar producción' }).click();
  await expect(page.getByRole('heading', { name: 'Todo listo para producir' })).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/academic-review.png',
    fullPage: true,
    animations: 'disabled',
  });
  await expect(page.getByRole('button', { name: /Generar 1 publicación/ })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /Generar 1 publicación/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'docs/screenshots/academic-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('conectar un proveedor no descarta el lote en preparación', async ({ page }) => {
  await page.request.post('/api/login', {
    headers: { Origin: process.env.APP_URL ?? 'http://localhost:3000' },
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  await page.goto('/#create');
  await page.locator('.question-option').first().click();
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await page.getByRole('button', { name: 'Revisar contenido' }).click();
  await page.getByRole('button', { name: 'Preparar producción' }).click();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await expect(page.getByLabel('API key de Runway')).toHaveAttribute('type', 'password');
  await expect(page.getByLabel('API key de Runway')).toHaveValue('');
  const before = await (await page.request.get('/api/studio')).json();
  const invalid = await page.request.post('/api/runway/connect', {
    headers: { Origin: process.env.APP_URL ?? 'http://localhost:3000' },
    data: { apiKey: 'x' },
  });
  expect(invalid.status()).toBe(400);
  const after = await (await page.request.get('/api/studio')).json();
  expect(after.runway.configured).toBe(before.runway.configured);
  expect(Object.keys(after.runway)).not.toContain('apiKey');
  await page.getByRole('button', { name: 'Crear contenido', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Todo listo para producir' })).toBeVisible();
  await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await expect(page.locator('.question-option[aria-pressed=true]')).toHaveCount(1);
});

test('explica el bloqueo de Runway y permite producir un video local desde el creador', async ({
  page,
}) => {
  await page.request.post('/api/login', {
    headers: { Origin: process.env.APP_URL ?? 'http://localhost:3000' },
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  await page.route('**/api/studio', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.runway = { ...data.runway, configured: true, avatarConfigured: false, credits: 0 };
    await route.fulfill({ response, json: data });
  });
  await page.goto('/#create');
  await page.locator('.question-option').first().click();
  await page.getByRole('button', { name: 'Continuar a formato' }).click();
  await page.getByRole('button', { name: /Dino responde/ }).click();
  await page.getByRole('button', { name: 'Revisar contenido' }).click();
  await page.getByRole('button', { name: 'Preparar producción' }).click();
  await expect(
    page.getByText('Runway conectado: faltan saldo de API y preparar el dinosaurio.', {
      exact: true,
    }),
  ).toBeVisible();
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/batches') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Generar 1 video', exact: true }).click();
  const batch = await response;
  expect(batch.status()).toBe(201);
  const batchId = (await batch.json()).id;
  await expect
    .poll(
      async () => {
        const data = await (await page.request.get('/api/studio')).json();
        const job = data.jobs.find((j: { batch_id: string }) => j.batch_id === batchId);
        if (job?.status === 'failed') throw new Error(job.error_message);
        return job?.status;
      },
      { timeout: 170000, intervals: [2000, 4000] },
    )
    .toBe('completed');
});
