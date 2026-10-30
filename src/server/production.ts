import { query, transaction } from '../lib/db';
import { batchInput, assertRenderable } from '../lib/validation';
import { HttpError } from '../lib/auth';
import { getQuestionVersion } from './catalog';
import { publicProviderStatus } from './provider-settings';
import type { Job } from '../lib/types';
import { assertLasFijasLayout, assertValidChoices } from '../lib/video-format';
import { estimateFalCostCents } from '../lib/fal-contract';
import { generationFor } from './fal-input';
import { getProviderSettings } from './provider-settings';
import { GEMINI_TTS_MODEL } from '../lib/voices';
export async function createBatch(input: unknown, ownerId: string, key: string) {
  const v = batchInput.parse(input);
  return transaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`production:${ownerId}`]);
    const exists = (
      await c.query('SELECT id FROM batches WHERE owner_id=$1 AND idempotency_key=$2', [
        ownerId,
        key,
      ])
    ).rows[0];
    if (exists) return exists;
    const t = (
      await c.query(
        'SELECT t.kind,tv.composition,tv.duration_seconds FROM template_versions tv JOIN templates t ON t.id=tv.template_id WHERE tv.id=$1',
        [v.templateVersionId],
      )
    ).rows[0];
    if (!t) throw new HttpError(400, 'Formato inexistente.');
    if (v.voice && t.kind !== 'video')
      throw new HttpError(400, 'La narración solo está disponible para formatos de video.');
    if (v.voice && !process.env.GEMINI_API_KEY?.trim())
      throw new HttpError(
        400,
        'Configura GEMINI_API_KEY en el servidor para generar videos con voz.',
      );
    const voice = v.voice ? { ...v.voice, model: GEMINI_TTS_MODEL } : null;
    const provider = t.kind === 'video' ? v.provider : 'demo';
    const settings = getProviderSettings();
    if (provider === 'fal' && !publicProviderStatus().configured)
      throw new HttpError(
        400,
        'Conecta tu API key de fal.ai desde Configuración antes de generar.',
      );
    const versions = (
      await c.query(
        `SELECT DISTINCT ON(question_id) id,question_id,approved FROM question_versions WHERE question_id=ANY($1::uuid[]) ORDER BY question_id,version DESC`,
        [v.questionIds],
      )
    ).rows;
    if (versions.length !== v.questionIds.length || versions.some((q) => !q.approved))
      throw new HttpError(400, 'Selecciona preguntas existentes con explicación aprobada.');
    const entries = [];
    for (const ver of versions) {
      const q = await getQuestionVersion(ver.id, c);
      try {
        assertRenderable(q);
        assertValidChoices(q.choices);
        if (t.composition === 'las-fijas') assertLasFijasLayout(q);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      const cost = provider === 'fal' ? estimateFalCostCents(t.duration_seconds) : 0;
      entries.push({ id: ver.id, cost });
    }
    if (provider === 'fal') {
      const [{ used }] = (
        await c.query(
          `SELECT COALESCE(sum(j.estimated_cost_cents),0)::int used FROM video_jobs j JOIN batches b ON b.id=j.batch_id WHERE b.owner_id=$1 AND j.provider='fal' AND j.created_at>=date_trunc('month',now()) AND (j.status<>'cancelled' OR EXISTS(SELECT 1 FROM provider_requests WHERE job_id=j.id))`,
          [ownerId],
        )
      ).rows;
      const budget = Number(process.env.FAL_MONTHLY_BUDGET_CENTS ?? 1000);
      if (!Number.isSafeInteger(budget) || budget < 1)
        throw new HttpError(400, 'Límite de presupuesto fal.ai inválido.');
      if (used + entries.reduce((a, e) => a + e.cost, 0) > budget)
        throw new HttpError(400, 'El lote supera el presupuesto mensual reservado de fal.ai.');
    }
    const batch = (
      await c.query(
        'INSERT INTO batches(owner_id,name,idempotency_key) VALUES($1,$2,$3) RETURNING id',
        [ownerId, v.name, key],
      )
    ).rows[0];
    for (const e of entries)
      await c.query(
        'INSERT INTO video_jobs(batch_id,question_version_id,template_version_id,provider,estimated_cost_cents,generation_config,voice) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          batch.id,
          e.id,
          v.templateVersionId,
          provider,
          e.cost,
          provider === 'fal' ? await generationFor(t.duration_seconds, settings.model) : null,
          voice,
        ],
      );
    return batch;
  });
}
export async function getJobs(ownerId: string) {
  return query<Job>(
    `SELECT j.id,j.batch_id,j.provider,j.status,j.estimated_cost_cents,j.output_asset_id,j.error_message,j.created_at,j.updated_at,b.name batch_name,v.statement,t.name template_name,t.kind,p.remote_task_id,
COALESCE((SELECT json_agg(json_build_object('id',a.id,'slug',a.slug,'name',a.name,'color',a.color)) FROM question_areas qa JOIN areas a ON a.id=qa.area_id WHERE qa.question_id=v.question_id),'[]') areas
FROM video_jobs j JOIN batches b ON b.id=j.batch_id JOIN question_versions v ON v.id=j.question_version_id JOIN template_versions tv ON tv.id=j.template_version_id JOIN templates t ON t.id=tv.template_id LEFT JOIN provider_requests p ON p.job_id=j.id WHERE b.owner_id=$1 ORDER BY j.created_at DESC LIMIT 300`,
    [ownerId],
  );
}
