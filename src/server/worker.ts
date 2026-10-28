import 'dotenv/config';
import { PgBoss } from 'pg-boss';
import { randomUUID } from 'node:crypto';
import { pool, query } from '../lib/db';
import { processJob } from './process-job';
const workerId = randomUUID();
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8)
  throw new Error('WORKER_CONCURRENCY debe estar entre 1 y 8.');
const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, max: 5 });
boss.on('error', (e) => console.error('Error de cola', e.message));
await boss.start();
await boss.createQueue('studio-produce', {
  policy: 'exclusive',
  retryLimit: 2,
  retryDelay: 10,
  expireInSeconds: 60,
  deleteAfterSeconds: 86400,
});
await boss.updateQueue('studio-produce', { retryLimit: 2, retryDelay: 10, expireInSeconds: 60 });
await boss.work<{ jobId: string }>(
  'studio-produce',
  { localConcurrency: concurrency, pollingIntervalSeconds: 1 },
  async (jobs) => {
    for (const job of jobs) {
      const heartbeat = setInterval(() => {
        boss
          .touch('studio-produce', job.id)
          .catch(() => console.error('No se pudo renovar la tarea', job.id));
      }, 20000);
      try {
        await processJob(job.data.jobId);
      } finally {
        clearInterval(heartbeat);
      }
    }
  },
);
let dispatching = false;
async function dispatch() {
  if (dispatching) return;
  dispatching = true;
  try {
    await query(
      'INSERT INTO worker_heartbeats(worker_id) VALUES($1) ON CONFLICT(worker_id) DO UPDATE SET last_seen_at=now()',
      [workerId],
    );
    // Jobs are also the outbox: crash between DB commit and dispatch cannot lose a batch.
    const rows = await query(
      "SELECT id FROM video_jobs WHERE status IN ('queued','generating','rendering') ORDER BY created_at LIMIT 200",
    );
    for (const row of rows)
      await boss.send('studio-produce', { jobId: row.id }, { singletonKey: row.id });
  } catch (e) {
    console.error('No se pudo despachar la cola', e instanceof Error ? e.message : 'Error');
  } finally {
    dispatching = false;
  }
}
await dispatch();
const timer = setInterval(dispatch, 5000);
console.log(
  `Worker listo. Concurrencia: ${concurrency}. Modo demo disponible; Runway: ${process.env.RUNWAYML_API_SECRET ? 'configurado' : 'pendiente de credenciales'}.`,
);
async function shutdown() {
  clearInterval(timer);
  await boss.stop({ graceful: true, timeout: 30000 });
  await query('DELETE FROM worker_heartbeats WHERE worker_id=$1', [workerId]);
  await pool.end();
  process.exit(0);
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
