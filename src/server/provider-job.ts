import path from 'node:path';
import { stat } from 'node:fs/promises';
import { query } from '../lib/db';
import { falGenerationSchema } from '../lib/fal-contract';
import { submitFal, pollFal, cancelFal, FalApiError, providerError } from './fal';
import { setJobState as setState, isJobCancelled as cancelled } from './job-state';
import { downloadProviderOutput, storageRoot } from './storage';

export async function providerClip(jobId: string, input: unknown, dir: string) {
  let [request] = await query('SELECT * FROM provider_requests WHERE job_id=$1', [jobId]);
  if (!request) {
    const generation = falGenerationSchema.safeParse(input);
    if (!generation.success) {
      await setState(
        jobId,
        'failed',
        'Falta una configuración válida de fal.ai en este trabajo. Crea un lote nuevo.',
      );
      return null;
    }
    const [inserted] = await query(
      "INSERT INTO provider_requests(job_id,state) VALUES($1,'submitting') ON CONFLICT(job_id) DO NOTHING RETURNING *",
      [jobId],
    );
    if (!inserted) throw new Error('Otra ejecución está confirmando esta solicitud.');
    try {
      if (await cancelled(jobId)) return null;
      const task = await submitFal(generation.data);
      await query(
        "UPDATE provider_requests SET remote_task_id=$2,state='submitted',updated_at=now() WHERE job_id=$1",
        [jobId, task.id],
      );
      [request] = await query('SELECT * FROM provider_requests WHERE job_id=$1', [jobId]);
      if (await cancelled(jobId)) {
        try {
          await cancelFal(task.id);
        } catch {}
        return null;
      }
    } catch (e) {
      const definitive =
        e instanceof FalApiError && e.status >= 400 && e.status < 500 && e.status !== 408;
      await query('UPDATE provider_requests SET state=$2,updated_at=now() WHERE job_id=$1', [
        jobId,
        definitive ? 'failed' : 'uncertain',
      ]);
      await setState(jobId, definitive ? 'failed' : 'needs_attention', providerError(e));
      return null;
    }
  }
  if (['submitting', 'uncertain'].includes(request.state)) {
    await setState(
      jobId,
      'needs_attention',
      'Solicitud sin confirmación. Revisa fal.ai y vincula su request ID; no se volverá a generar automáticamente.',
    );
    return null;
  }
  if (request.state === 'failed') {
    await setState(
      jobId,
      'failed',
      'fal.ai rechazó o no completó esta generación. Crea otro lote solo si deseas una generación nueva.',
    );
    return null;
  }
  const clip = path.join(dir, 'provider.mp4');
  if (request.state === 'succeeded' && request.output_path) {
    try {
      if ((await stat(clip)).size > 0) return clip;
    } catch {
      /* Fetch the same result again. */
    }
  }
  await setState(jobId, 'generating');
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    if (await cancelled(jobId)) return null;
    const task = await pollFal(request.remote_task_id);
    if (task.status === 'SUCCEEDED') {
      if (!task.output?.[0]) throw new Error('fal.ai terminó sin un archivo de video.');
      await downloadProviderOutput(task.output[0], clip);
      await query(
        "UPDATE provider_requests SET state='succeeded',output_path=$2,updated_at=now() WHERE job_id=$1",
        [jobId, path.relative(storageRoot(), clip)],
      );
      return clip;
    }
    if (task.status === 'FAILED') {
      await query(
        "UPDATE provider_requests SET state='failed',failure_code=$2,updated_at=now() WHERE job_id=$1",
        [jobId, task.failureCode ?? 'inference_error'],
      );
      await setState(
        jobId,
        'failed',
        'fal.ai no pudo completar esta generación. Revisa su request ID en el portal.',
      );
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('fal.ai sigue procesando. Puedes reanudar la consulta sin generar de nuevo.');
}
