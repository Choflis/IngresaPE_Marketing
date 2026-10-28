import path from 'node:path';
import { stat } from 'node:fs/promises';
import RunwayML from '@runwayml/sdk';
import { query, transaction } from '../lib/db';
import { narrationFor } from '../lib/validation';
import { getQuestionVersion } from './catalog';
import { submitAvatar, pollRunway, cancelRunway, providerError } from './runway';
import { jobDirectory, saveOutput, downloadProviderOutput } from './storage';
import { durationOf, renderImage, renderVideo } from './render';
import type { VideoProps } from '../video/QuestionVideo';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function setState(id: string, status: string, error: string | null = null) {
  await query(
    "UPDATE video_jobs SET status=$2,error_message=$3,updated_at=now() WHERE id=$1 AND status<>'cancelled'",
    [id, status, error],
  );
  await query('INSERT INTO job_events(job_id,message) VALUES($1,$2)', [id, error ?? status]);
}
async function cancelled(id: string) {
  return (
    (await query('SELECT status FROM video_jobs WHERE id=$1', [id]))[0]?.status === 'cancelled'
  );
}
async function providerClip(jobId: string, text: string, dir: string) {
  let [request] = await query('SELECT * FROM provider_requests WHERE job_id=$1', [jobId]);
  if (!request) {
    const [inserted] = await query(
      "INSERT INTO provider_requests(job_id,state) VALUES($1,'submitting') ON CONFLICT(job_id) DO NOTHING RETURNING *",
      [jobId],
    );
    if (!inserted) throw new Error('Otra ejecución está confirmando esta solicitud.');
    try {
      if (await cancelled(jobId)) return null;
      const task = await submitAvatar(text);
      await query(
        "UPDATE provider_requests SET remote_task_id=$2,state='submitted',updated_at=now() WHERE job_id=$1",
        [jobId, task.id],
      );
      [request] = await query('SELECT * FROM provider_requests WHERE job_id=$1', [jobId]);
      if (await cancelled(jobId)) {
        try {
          await cancelRunway(task.id);
        } catch {}
        return null;
      }
    } catch (e) {
      const definitive =
        e instanceof RunwayML.APIError &&
        e.status !== undefined &&
        e.status >= 400 &&
        e.status < 500 &&
        e.status !== 408;
      const state = definitive ? 'failed' : 'uncertain';
      await query('UPDATE provider_requests SET state=$2,updated_at=now() WHERE job_id=$1', [
        jobId,
        state,
      ]);
      await setState(jobId, definitive ? 'failed' : 'needs_attention', providerError(e));
      return null;
    }
  }
  if (['submitting', 'uncertain'].includes(request.state)) {
    await setState(
      jobId,
      'needs_attention',
      'Solicitud sin confirmación. Revisa Runway y vincula su task ID; no se volverá a generar automáticamente.',
    );
    return null;
  }
  if (request.state === 'failed') {
    await setState(
      jobId,
      'failed',
      'La generación fue rechazada o falló en Runway. Crea un lote nuevo si deseas volver a generarla.',
    );
    return null;
  }
  const clip = path.join(dir, 'provider.mp4');
  if (request.state === 'succeeded' && request.output_path) {
    try {
      if ((await stat(clip)).size > 0) return clip;
    } catch {
      /* Re-download from the known task. */
    }
  }
  await setState(jobId, 'generating');
  const deadline = Date.now() + 20 * 60 * 1000;
  for (let n = 0; n < 240 && Date.now() < deadline; n++) {
    if (await cancelled(jobId)) return null;
    const task = await pollRunway(request.remote_task_id);
    if (task.status === 'SUCCEEDED') {
      if (!task.output?.[0]) throw new Error('Runway terminó sin archivo de salida.');
      await downloadProviderOutput(task.output[0], clip);
      await query(
        "UPDATE provider_requests SET state='succeeded',output_path=$2,updated_at=now() WHERE job_id=$1",
        [jobId, path.relative(path.resolve(process.env.STORAGE_DIR ?? './storage'), clip)],
      );
      return clip;
    }
    if (['FAILED', 'CANCELED', 'CANCELLED'].includes(task.status)) {
      await query(
        "UPDATE provider_requests SET state='failed',failure_code=$2,updated_at=now() WHERE job_id=$1",
        [jobId, 'failureCode' in task ? String(task.failureCode) : task.status],
      );
      await setState(
        jobId,
        'failed',
        'Runway no pudo completar esta generación. Consulta su task ID en el portal.',
      );
      return null;
    }
    await sleep(5000);
  }
  throw new Error('Runway sigue procesando. Se puede reanudar la consulta sin generar de nuevo.');
}
export async function processJob(id: string) {
  // Session advisory lock prevents duplicate processing across worker processes, including recovered leases.
  const c = await import('../lib/db').then((m) => m.pool.connect());
  try {
    const lock = await c.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) locked', [
      `job:${id}`,
    ]);
    if (!lock.rows[0].locked) return;
    const [j] = await query(
      `SELECT j.*,b.owner_id,t.kind,t.name template_name,tv.accent,tv.duration_seconds FROM video_jobs j JOIN batches b ON b.id=j.batch_id JOIN template_versions tv ON tv.id=j.template_version_id JOIN templates t ON t.id=tv.template_id WHERE j.id=$1`,
      [id],
    );
    if (!j || ['completed', 'cancelled', 'needs_attention', 'failed'].includes(j.status)) return;
    await query('UPDATE video_jobs SET attempts=attempts+1,updated_at=now() WHERE id=$1', [id]);
    const q = await getQuestionVersion(j.question_version_id);
    const dir = await jobDirectory(id);
    const props: VideoProps = {
      statement: q.statement,
      explanation: q.explanation,
      choices: q.choices,
      course: q.course,
      area: q.areas.map((a) => a.name).join(' / '),
      accent: j.accent.trim(),
      demo: j.provider === 'demo',
      durationSeconds: j.duration_seconds,
      challenge: j.template_name === 'Reto de admisión',
    };
    let first: string | null = null;
    if (j.kind === 'video') {
      let clip: string | undefined;
      if (j.provider === 'runway') {
        clip = (await providerClip(id, narrationFor(q), dir)) ?? undefined;
        if (!clip) return;
        props.durationSeconds = await durationOf(clip);
      }
      if (await cancelled(id)) return;
      await setState(id, 'rendering');
      const file = path.join(dir, 'video.mp4');
      await renderVideo(props, file, clip);
      first = await saveOutput(
        j.owner_id,
        id,
        file,
        'video/mp4',
        `${q.course} · ${j.template_name}.mp4`,
      );
    } else {
      await setState(id, 'rendering');
      for (let i = 0; i < (j.kind === 'carousel' ? 3 : 1); i++) {
        if (await cancelled(id)) return;
        const file = path.join(dir, `publicacion-${i + 1}.png`);
        await renderImage(props, file, i);
        const asset = await saveOutput(
          j.owner_id,
          id,
          file,
          'image/png',
          `${q.course} · ${i + 1}.png`,
          i,
        );
        first ??= asset;
      }
    }
    await transaction(async (tx) => {
      await tx.query(
        "UPDATE video_jobs SET status='completed',output_asset_id=$2,error_message=null,updated_at=now() WHERE id=$1 AND status<>'cancelled'",
        [id, first],
      );
    });
  } catch (e) {
    // Technical failures only retry the same task/clip. Submission ambiguity is handled above.
    if (await cancelled(id)) return;
    const [{ attempts }] = await query('SELECT attempts FROM video_jobs WHERE id=$1', [id]);
    if (attempts < 3) {
      await setState(
        id,
        'queued',
        'Se reintentará la consulta o el montaje sin enviar una generación nueva.',
      );
      throw new Error('Se reintentará este trabajo sin nueva generación.');
    }
    const message = e instanceof Error ? e.message : 'Fallo de producción.';
    await setState(
      id,
      'failed',
      message.startsWith('Runway')
        ? message
        : 'No se pudo terminar el montaje o consultar el proveedor tras tres intentos. Puedes reintentar sin cambiar el contenido.',
    );
    console.error('Trabajo fallido', id, e instanceof Error ? e.name : 'Error');
  } finally {
    await c.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [`job:${id}`]);
    c.release();
  }
}
