import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
test('acceso privado y flujo real de imágenes y videos por lote', async ({ page, request }) => {
  const testQuestion = `¿Cuánto es cuatro más cinco? Prueba ${randomUUID().slice(0, 8)}`;
  expect((await request.get('/api/studio')).status()).toBe(401);
  await page.goto('/');
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('Correo electrónico').fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar al estudio' }).click();
  await expect(page.getByRole('heading', { name: /Hoy es un buen día/ })).toBeVisible();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });
  const studio = await (await page.request.get('/api/studio')).json();
  expect(studio.areas).toHaveLength(3);
  // CSRF protection: an authenticated session is not enough for foreign origins.
  expect(
    (
      await page.request.post('/api/templates', {
        headers: { Origin: 'https://example.com' },
        data: {},
      })
    ).status(),
  ).toBe(403);
  await page.getByRole('button', { name: 'Banco de preguntas', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva pregunta', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Pregunta', { exact: true }).fill(testQuestion);
  await dialog
    .getByLabel('Curso', { exact: true })
    .selectOption(String(studio.courses.find((c: { name: string }) => c.name === 'Aritmética').id));
  await dialog.getByLabel('Tema', { exact: true }).fill('Operaciones de prueba');
  await dialog.getByLabel('Ingenierías', { exact: true }).check();
  await dialog.getByLabel('Alternativa A', { exact: true }).fill('Nueve');
  await dialog.getByLabel('Alternativa B', { exact: true }).fill('Ocho');
  await dialog.getByLabel('Alternativa C', { exact: true }).fill('Diez');
  await dialog.getByLabel('Alternativa D', { exact: true }).fill('Siete');
  await dialog
    .getByLabel('Explicación de la respuesta')
    .fill('Al sumar cuatro unidades y cinco unidades se obtienen nueve unidades.');
  await dialog.getByText('He revisado la respuesta').click();
  await dialog.getByRole('button', { name: 'Guardar pregunta' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: testQuestion })).toBeVisible();
  await page.getByRole('button', { name: 'Crear contenido', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Vamos a crear.' })).toBeVisible();
  await expect(page.locator('.question-option').first()).toBeVisible();
  await page.locator('.question-option').first().click();
  await page.screenshot({ path: 'docs/screenshots/creator.png', fullPage: true });
  await page.getByRole('button', { name: /Pregunta del día/ }).click();
  await page.getByRole('button', { name: /Producir 1 publicaciones/ }).click();
  await expect(page.getByRole('heading', { name: /Hoy es un buen día/ })).toBeVisible();
  const headers = {
    Origin: process.env.APP_URL ?? 'http://localhost:3000',
    'Idempotency-Key': randomUUID(),
  };
  // Create a short version for a fast real MP4 render in this test.
  const t = await page.request.post('/api/templates', {
    headers,
    data: {
      name: 'Prueba MP4 corta',
      description: 'Prueba automatizada',
      kind: 'video',
      accent: '#C80727',
      durationSeconds: 6,
    },
  });
  expect(t.ok()).toBeTruthy();
  const latest = await (await page.request.get('/api/studio')).json();
  const tv = latest.templates.find((t: { name: string }) => t.name === 'Prueba MP4 corta');
  const batch = await page.request.post('/api/batches', {
    headers: { ...headers, 'Idempotency-Key': randomUUID() },
    data: {
      questionIds: latest.questions.slice(0, 2).map((q: { id: string }) => q.id),
      templateVersionId: tv.version_id,
      provider: 'demo',
      name: 'E2E · dos videos simultáneos',
    },
  });
  expect(batch.status()).toBe(201);
  const batchId = (await batch.json()).id;
  await expect
    .poll(
      async () => {
        const r = await (await page.request.get('/api/studio')).json();
        const jobs = r.jobs.filter((j: { batch_id: string }) => j.batch_id === batchId);
        if (jobs.some((j: { status: string }) => j.status === 'failed'))
          throw new Error(jobs.map((j: { error_message: string }) => j.error_message).join(';'));
        return jobs.filter((j: { status: string }) => j.status === 'completed').length;
      },
      { timeout: 170000, intervals: [2000, 3000, 5000] },
    )
    .toBe(2);
  const completed = await (await page.request.get('/api/studio')).json();
  const j = completed.jobs.find((j: { batch_id: string }) => j.batch_id === batchId);
  const media = await page.request.get(`/api/media/${j.output_asset_id}`, {
    headers: { Range: 'bytes=0-100' },
  });
  expect(media.status()).toBe(206);
  expect(media.headers()['content-type']).toBe('video/mp4');
  expect((await media.body()).length).toBe(101);
  expect((await request.get(`/api/media/${j.output_asset_id}`)).status()).toBe(401);
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await expect(page.locator('.asset-card').first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.asset-card').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/login/);
  expect((await page.request.get('/api/studio')).status()).toBe(401);
});
