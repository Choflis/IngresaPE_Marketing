import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
vi.mock('../src/server/runway', () => ({
  submitAvatar: vi.fn(),
  pollRunway: vi.fn(),
  providerError: () => 'No se pudo confirmar Runway.',
}));
const enabled = Boolean(process.env.TEST_DATABASE_URL);
describe.skipIf(!enabled)('PostgreSQL real · producción y normalización', () => {
  let db: typeof import('../src/lib/db'),
    catalog: typeof import('../src/server/catalog'),
    production: typeof import('../src/server/production');
  let owner: string, areaId: number, courseId: number, templateId: number;
  beforeAll(async () => {
    const u = new URL(process.env.TEST_DATABASE_URL!);
    if (!u.pathname.endsWith('_test'))
      throw new Error('Las pruebas requieren una base terminada en _test.');
    process.env.DATABASE_URL = u.href;
    db = await import('../src/lib/db');
    catalog = await import('../src/server/catalog');
    production = await import('../src/server/production');
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.query('TRUNCATE users,areas,courses,sources,templates RESTART IDENTITY CASCADE');
    owner = (
      await db.query(
        "INSERT INTO users(email,password_hash) VALUES('test@ingresa.pe',$1) RETURNING id",
        [await bcrypt.hash('test-password-long', 4)],
      )
    )[0].id;
    areaId = (
      await db.query(
        "INSERT INTO areas(slug,name,color) VALUES('biomedicas','Biomédicas','#6DD5AC') RETURNING id",
      )
    )[0].id;
    courseId = (await db.query("INSERT INTO courses(name) VALUES('Biología') RETURNING id"))[0].id;
    const t = (
      await db.query(
        "INSERT INTO templates(name,description,kind) VALUES('Dino responde','Prueba','video') RETURNING id",
      )
    )[0].id;
    templateId = (
      await db.query('INSERT INTO template_versions(template_id) VALUES($1) RETURNING id', [t])
    )[0].id;
  });
  afterAll(async () => {
    await db?.pool.end();
  });
  async function question(approved = true) {
    return catalog.createQuestion({
      statement: '¿Qué orgánulo participa en la respiración celular?',
      explanation: 'La mitocondria participa en la respiración celular.',
      courseId,
      topic: 'La célula',
      areaIds: [areaId],
      difficulty: 'basica',
      choices: [
        { label: 'A', text: 'Mitocondria', correct: true },
        { label: 'B', text: 'Ribosoma', correct: false },
      ],
      approved,
    });
  }
  it('normaliza temas compartidos sin repetirlos', async () => {
    await question();
    await question();
    expect((await db.query('SELECT * FROM topics')).length).toBe(1);
    expect((await db.query('SELECT * FROM question_choices')).length).toBe(4);
  });
  it('revierte toda la pregunta si una FK es inválida', async () => {
    await expect(
      catalog.createQuestion({
        statement: 'Pregunta de prueba suficientemente larga',
        explanation: 'Explicación correcta.',
        courseId,
        topic: 'La célula',
        areaIds: [999],
        difficulty: 'basica',
        choices: [
          { label: 'A', text: 'Uno', correct: true },
          { label: 'B', text: 'Dos', correct: false },
        ],
        approved: true,
      }),
    ).rejects.toThrow();
    expect((await db.query('SELECT * FROM questions')).length).toBe(0);
  });
  it('no duplica lote ni trabajos con solicitudes concurrentes', async () => {
    const q = await question();
    const key = randomUUID();
    const input = { questionIds: [q.id, q.id], templateVersionId: templateId, provider: 'demo' };
    const [a, b] = await Promise.all([
      production.createBatch(input, owner, key),
      production.createBatch(input, owner, key),
    ]);
    expect(a.id).toBe(b.id);
    expect((await db.query('SELECT * FROM video_jobs')).length).toBe(1);
  });
  it('procesa solicitudes concurrentes del tamaño del pool sin agotar conexiones', async () => {
    const q = await question();
    const input = { questionIds: [q.id], templateVersionId: templateId, provider: 'demo' };
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => production.createBatch(input, owner, randomUUID())),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
  });
  it('rechaza una pregunta sin aprobación y no deja lote parcial', async () => {
    const q = await question(false);
    await expect(
      production.createBatch(
        { questionIds: [q.id], templateVersionId: templateId, provider: 'demo' },
        owner,
        randomUUID(),
      ),
    ).rejects.toThrow(/aprobada/);
    expect((await db.query('SELECT * FROM batches')).length).toBe(0);
  });
  it('conserva la versión usada por un lote al aprobar otra', async () => {
    const q = await question(false);
    const old = (await catalog.getQuestions())[0].version_id;
    await catalog.approveQuestion(q.id);
    const next = (await catalog.getQuestions())[0];
    expect(next.version_id).not.toBe(old);
    expect((await db.query('SELECT * FROM question_versions')).length).toBe(2);
    expect(next.approved).toBe(true);
  });
  it('serializa reservas para no superar el presupuesto entre lotes', async () => {
    const q = await question();
    process.env.RUNWAYML_API_SECRET = 'test-key-never-sent';
    process.env.RUNWAY_AVATAR_ID = randomUUID();
    const data = await catalog.getQuestions();
    const { estimateCostCents, narrationFor } = await import('../src/lib/validation');
    process.env.RUNWAY_MONTHLY_BUDGET_CENTS = String(estimateCostCents(narrationFor(data[0])));
    const input = { questionIds: [q.id], templateVersionId: templateId, provider: 'runway' };
    const r = await Promise.allSettled([
      production.createBatch(input, owner, randomUUID()),
      production.createBatch(input, owner, randomUUID()),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(r.filter((x) => x.status === 'rejected')).toHaveLength(1);
    delete process.env.RUNWAYML_API_SECRET;
    delete process.env.RUNWAY_AVATAR_ID;
  });
  it('un timeout de envío requiere revisión y nunca reenvía la generación', async () => {
    const q = await question();
    const b = await production.createBatch(
      { questionIds: [q.id], templateVersionId: templateId, provider: 'demo' },
      owner,
      randomUUID(),
    );
    const [j] = await db.query(
      "UPDATE video_jobs SET provider='runway' WHERE batch_id=$1 RETURNING *",
      [b.id],
    );
    const gateway = await import('../src/server/runway');
    vi.mocked(gateway.submitAvatar).mockRejectedValue(new Error('timeout'));
    const { processJob } = await import('../src/server/process-job');
    await processJob(j.id);
    expect((await db.query('SELECT status FROM video_jobs WHERE id=$1', [j.id]))[0].status).toBe(
      'needs_attention',
    );
    expect(vi.mocked(gateway.submitAvatar)).toHaveBeenCalledTimes(1);
    await processJob(j.id);
    expect(vi.mocked(gateway.submitAvatar)).toHaveBeenCalledTimes(1);
  });
  it('reintenta una consulta transitoria sin crear otro video', async () => {
    const q = await question();
    const b = await production.createBatch(
      { questionIds: [q.id], templateVersionId: templateId, provider: 'demo' },
      owner,
      randomUUID(),
    );
    const [j] = await db.query(
      "UPDATE video_jobs SET provider='runway' WHERE batch_id=$1 RETURNING *",
      [b.id],
    );
    await db.query(
      "INSERT INTO provider_requests(job_id,state,remote_task_id) VALUES($1,'submitted',$2)",
      [j.id, randomUUID()],
    );
    const gateway = await import('../src/server/runway');
    vi.mocked(gateway.pollRunway).mockRejectedValue(new Error('network'));
    const { processJob } = await import('../src/server/process-job');
    await expect(processJob(j.id)).rejects.toThrow(/reintentará/);
    expect((await db.query('SELECT status FROM video_jobs WHERE id=$1', [j.id]))[0].status).toBe(
      'queued',
    );
    expect(vi.mocked(gateway.submitAvatar)).not.toHaveBeenCalled();
  });
  it('mantiene trabajos de más de 60 segundos y recupera un heartbeat perdido', async () => {
    const { PgBoss } = await import('pg-boss');
    const { productionQueueOptions } = await import('../src/server/queue-config');
    const boss = new PgBoss({ connectionString: process.env.TEST_DATABASE_URL! });
    boss.on('error', () => {});
    await boss.start();
    const name = `regression-${randomUUID()}`;
    try {
      await boss.createQueue(name, { ...productionQueueOptions, policy: 'exclusive' });
      const id = await boss.send(name, { test: true });
      await boss.fetch(name);
      await db.query(
        "UPDATE pgboss.job SET started_on=now()-interval '61 seconds',heartbeat_on=now() WHERE id=$1",
        [id],
      );
      await boss.supervise(name);
      expect((await boss.getJobById(name, id!))?.state).toBe('active');
      await db.query(
        "UPDATE pgboss.job SET heartbeat_on=now()-interval '120 seconds' WHERE id=$1",
        [id],
      );
      await db.query(
        "UPDATE pgboss.queue SET monitor_claim_on=now()-interval '120 seconds',monitor_on=now()-interval '120 seconds' WHERE name=$1",
        [name],
      );
      await boss.supervise(name);
      expect((await boss.getJobById(name, id!))?.state).toBe('retry');
    } finally {
      await boss.deleteQueue(name);
      await boss.stop();
    }
  });
  it('recupera una solicitud en envío interrumpido sin crear otra', async () => {
    const q = await question();
    const b = await production.createBatch(
      { questionIds: [q.id], templateVersionId: templateId, provider: 'demo' },
      owner,
      randomUUID(),
    );
    const [j] = await db.query(
      "UPDATE video_jobs SET provider='runway' WHERE batch_id=$1 RETURNING *",
      [b.id],
    );
    await db.query("INSERT INTO provider_requests(job_id,state) VALUES($1,'submitting')", [j.id]);
    const { processJob } = await import('../src/server/process-job');
    await processJob(j.id);
    expect((await db.query('SELECT status FROM video_jobs WHERE id=$1', [j.id]))[0].status).toBe(
      'needs_attention',
    );
    const gateway = await import('../src/server/runway');
    expect(vi.mocked(gateway.submitAvatar)).not.toHaveBeenCalled();
  });
});
