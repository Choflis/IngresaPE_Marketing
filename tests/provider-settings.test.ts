import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  getProviderSettings,
  saveProviderSettings,
  publicProviderStatus,
} from '../src/server/provider-settings';
let dir: string;
const original = {
  storage: process.env.STORAGE_DIR,
  key: process.env.FAL_KEY,
  avatar: process.env.FAL_MODEL,
};
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'ingresape-settings-'));
  process.env.STORAGE_DIR = dir;
  delete process.env.FAL_KEY;
  delete process.env.FAL_MODEL;
});
afterEach(() => {
  for (const [k, v] of Object.entries({
    STORAGE_DIR: original.storage,
    FAL_KEY: original.key,
    FAL_MODEL: original.avatar,
  })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(dir, { recursive: true, force: true });
});
describe('configuración privada dinámica', () => {
  it('usa .env como alternativa', () => {
    process.env.FAL_KEY = 'env-key-for-test-only';
    expect(getProviderSettings().apiKey).toBe('env-key-for-test-only');
  });
  it('comparte configuración sin reiniciar y protege permisos', () => {
    saveProviderSettings({
      apiKey: 'private-key-for-test-only',
      model: 'fal-ai/longcat-video/distilled/text-to-video/480p',
    });
    expect(getProviderSettings().model).toContain('text-to-video');
    expect(statSync(path.join(dir, 'config', 'fal.json')).mode & 0o777).toBe(0o600);
  });
  it('el estado público no incluye claves ni tokens', () => {
    saveProviderSettings({ apiKey: 'private-key-for-test-only' });
    expect(JSON.stringify(publicProviderStatus())).not.toContain('private-key');
    expect(publicProviderStatus().configured).toBe(true);
  });
  it('rechaza una configuración inválida sin reemplazar la válida', () => {
    saveProviderSettings({ apiKey: 'private-key-for-test-only' });
    expect(() => saveProviderSettings({ apiKey: 'x' })).toThrow();
    expect(getProviderSettings().apiKey).toBe('private-key-for-test-only');
  });
});
