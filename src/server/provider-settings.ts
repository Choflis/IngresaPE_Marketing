import 'dotenv/config';
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { FAL_IMAGE_MODEL, falModelSchema } from '../lib/fal-contract';
const schema = z.object({
  apiKey: z.string().trim().min(16).max(4096).regex(/^\S+$/, 'La clave no puede incluir espacios.'),
  model: falModelSchema.default(FAL_IMAGE_MODEL),
  savedAt: z.string().optional(),
});
export type ProviderSettings = z.infer<typeof schema>;
const configPath = () => path.resolve(process.env.STORAGE_DIR ?? './storage', 'config', 'fal.json');
export function getProviderSettings(): Partial<ProviderSettings> & Pick<ProviderSettings, 'model'> {
  try {
    return schema.parse(JSON.parse(readFileSync(configPath(), 'utf8')));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
      throw new Error('No se pudo leer la configuración privada de fal.ai.');
    const model = falModelSchema.parse(process.env.FAL_MODEL || FAL_IMAGE_MODEL);
    return process.env.FAL_KEY ? schema.parse({ apiKey: process.env.FAL_KEY, model }) : { model };
  }
}
export function saveProviderSettings(input: unknown) {
  const value = schema.parse(input);
  const file = configPath();
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = path.join(path.dirname(file), `.fal-${randomUUID()}.tmp`);
  writeFileSync(temp, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
  renameSync(temp, file);
}
export function publicProviderStatus() {
  const s = getProviderSettings();
  return {
    configured: Boolean(s.apiKey),
    model: s.model,
    resolution: '480p' as const,
    fps: 15 as const,
    savedAt: s.savedAt ?? null,
    monthlyBudgetCents: Number(process.env.FAL_MONTHLY_BUDGET_CENTS ?? 1000),
  };
}
