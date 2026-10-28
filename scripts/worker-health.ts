import { readFile } from 'node:fs/promises';
import { pool, query } from '../src/lib/db';
try {
  const id = (await readFile('/tmp/ingresape-worker-id', 'utf8')).trim();
  const [row] = await query(
    "SELECT EXISTS(SELECT 1 FROM worker_heartbeats WHERE worker_id=$1 AND last_seen_at>now()-interval '20 seconds') healthy",
    [id],
  );
  if (!row.healthy) process.exitCode = 1;
  else console.log('Worker saludable.');
} catch {
  process.exitCode = 1;
} finally {
  await pool.end();
}
