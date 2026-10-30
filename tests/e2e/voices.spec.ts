import 'dotenv/config';
import { test, expect } from '@playwright/test';

test('ofrece solo las cuatro voces elegidas y pausa una muestra al escuchar otra', async ({
  page,
}) => {
  const auth = await page.request.post('/api/login', {
    headers: { Origin: process.env.APP_URL ?? 'http://localhost:3000' },
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  expect(auth.ok()).toBeTruthy();
  await page.goto('/#voices');
  const catalog = page.getByRole('region', { name: 'Voces para tu dinosaurio' });
  await expect(catalog.locator('audio')).toHaveCount(4);
  for (const name of ['Puck', 'Sadachbia', 'Achird', 'Fenrir']) {
    await expect(catalog.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(catalog.getByLabel(`Escuchar ${name}`, { exact: true })).toHaveAttribute(
      'controls',
    );
    await expect(catalog.getByLabel(`Escuchar ${name}`, { exact: true })).toHaveAttribute(
      'src',
      `/previews/gemini/${name.toLowerCase()}.wav`,
    );
  }
  await expect(catalog).toContainText('Esta es una fija para la UNSA');
  await expect(catalog.getByText(/Kokoro|Jorge|Santa|Camila/)).toHaveCount(0);
  await catalog.getByRole('heading', { name: 'Puck', exact: true }).click();
  const first = catalog.getByLabel('Escuchar Puck', { exact: true });
  const second = catalog.getByLabel('Escuchar Sadachbia', { exact: true });
  await first.evaluate((element: HTMLAudioElement) => element.play());
  await expect
    .poll(() => first.evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(false);
  await second.evaluate((element: HTMLAudioElement) => element.play());
  await expect.poll(() => first.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await expect
    .poll(() => second.evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
