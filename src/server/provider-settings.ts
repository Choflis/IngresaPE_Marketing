import 'dotenv/config';
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
const schema = z.object({
  apiKey: z.string().trim().min(16).max(4096),
  avatarId: z.string().uuid().optional(),
  avatarStatus: z.enum(['creating', 'processing', 'ready', 'uncertain']).optional(),
  verifiedAt: z.string().optional(),
  credits: z.number().nullable().optional(),
});
export type ProviderSettings = z.infer<typeof schema>;
const configPath = () =>
  path.resolve(process.env.STORAGE_DIR ?? './storage', 'config', 'runway.json');
export function getProviderSettings(): Partial<ProviderSettings> {
  try {
    return schema.parse(JSON.parse(readFileSync(configPath(), 'utf8')));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
      throw new Error('No se pudo leer la configuración privada de Runway.');
    return {
      apiKey: process.env.RUNWAYML_API_SECRET || undefined,
      avatarId: process.env.RUNWAY_AVATAR_ID || undefined,
    };
  }
}
export function saveProviderSettings(input: unknown) {
  const value = schema.parse(input);
  const file = configPath();
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = path.join(path.dirname(file), `.runway-${randomUUID()}.tmp`);
  writeFileSync(temp, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
  renameSync(temp, file);
}
export function publicProviderStatus() {
  const s = getProviderSettings();
  return {
    configured: Boolean(s.apiKey),
    avatarConfigured:
      Boolean(s.avatarId) &&
      !['creating', 'processing', 'uncertain'].includes(s.avatarStatus ?? ''),
    avatarStatus: s.avatarStatus ?? (s.avatarId ? 'ready' : 'missing'),
    verifiedAt: s.verifiedAt ?? null,
    credits: s.credits ?? null,
    monthlyBudgetCents: Number(process.env.RUNWAY_MONTHLY_BUDGET_CENTS ?? 1000),
  };
}
