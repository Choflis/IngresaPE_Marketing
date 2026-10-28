import 'dotenv/config';
import { Client } from 'pg';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const url = new URL(process.env.DATABASE_URL!);
url.pathname = '/ingresape_studio_test';
const admin = new URL(url);
admin.pathname = '/postgres';
const c = new Client({ connectionString: admin.href });
await c.connect();
if (!(await c.query("SELECT 1 FROM pg_database WHERE datname='ingresape_studio_test'")).rowCount)
  await c.query('CREATE DATABASE ingresape_studio_test');
await c.end();
const testStorage = mkdtempSync(path.join(tmpdir(), 'ingresape-db-test-'));
const env = {
  ...process.env,
  STORAGE_DIR: testStorage,
  DATABASE_URL: url.href,
  TEST_DATABASE_URL: url.href,
};
let exitCode = 0;
for (const args of [
  ['run', 'db:migrate'],
  ['exec', 'vitest', 'run', 'tests/database.test.ts'],
]) {
  const r = spawnSync('npm', args, { env, stdio: 'inherit' });
  if (r.status !== 0) {
    exitCode = r.status ?? 1;
    break;
  }
}

rmSync(testStorage, { recursive: true, force: true });
process.exitCode = exitCode;
