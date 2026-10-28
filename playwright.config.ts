import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  use: {
    actionTimeout: 15000,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
    channel: 'chromium',
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 1100 },
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
});
