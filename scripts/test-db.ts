import 'dotenv/config';
import { Client } from 'pg';
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
const env = { ...process.env, DATABASE_URL: url.href, TEST_DATABASE_URL: url.href };
for (const args of [
  ['run', 'db:migrate'],
  ['exec', 'vitest', 'run', 'tests/database.test.ts'],
]) {
  const r = spawnSync('npm', args, { env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
