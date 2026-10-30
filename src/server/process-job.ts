import path from 'node:path';
import { query, transaction } from '../lib/db';
import { getQuestionVersion } from './catalog';
import { providerClip } from './provider-job';
import { setJobState as setState, isJobCancelled as cancelled } from './job-state';
import { jobDirectory, saveOutput } from './storage';
import { durationOf, renderImage, renderVideo } from './render';
import type { VideoProps } from '../video/QuestionVideo';
import { assertValidChoices } from '../lib/video-format';
import { prepareNarration } from './narration';
import { NarrationError } from './gemini-tts';
export async function processJob(id: string) {
  // Session advisory lock prevents duplicate processing across worker processes, including recovered leases.
  const c = await import('../lib/db').then((m) => m.pool.connect());
  try {
    const lock = await c.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) locked', [
      `job:${id}`,
    ]);
    if (!lock.rows[0].locked) return;
    const [j] = await query(
      `SELECT j.*,b.owner_id,t.kind,t.name template_name,tv.accent,tv.duration_seconds,tv.composition FROM video_jobs j JOIN batches b ON b.id=j.batch_id JOIN template_versions tv ON tv.id=j.template_version_id JOIN templates t ON t.id=tv.template_id WHERE j.id=$1`,
      [id],
    );
    if (!j || ['completed', 'cancelled', 'needs_attention', 'failed'].includes(j.status)) return;
    if (j.provider !== 'demo' && j.provider !== 'fal') {
      await setState(
        id,
        'needs_attention',
        'Este trabajo usa un proveedor retirado. Crea un lote nuevo con fal.ai.',
      );
      return;
    }
    await query('UPDATE video_jobs SET attempts=attempts+1,updated_at=now() WHERE id=$1', [id]);
    const q = await getQuestionVersion(j.question_version_id);
    assertValidChoices(q.choices);
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
      challenge: j.composition === 'challenge',
      composition: j.composition,
    };
    let first: string | null = null;
    if (j.kind === 'video') {
      if (await cancelled(id)) return;
      let narration: Awaited<ReturnType<typeof prepareNarration>> = null;
      if (j.voice) {
        await setState(id, 'rendering');
        narration = await prepareNarration(q, j.voice, dir, j.duration_seconds, () =>
          cancelled(id),
        );
        if (!narration || (await cancelled(id))) return;
        props.narrationTiming = narration.timing;
      }
      let clip: string | undefined;
      if (j.provider === 'fal') {
        clip = (await providerClip(id, j.generation_config, dir)) ?? undefined;
        if (!clip) return;
        const duration = await durationOf(clip);
        if (duration < j.duration_seconds - 0.2) {
          await setState(
            id,
            'failed',
            'El clip de fal.ai es más corto que la duración solicitada. El archivo se conserva; no se enviará otra generación automáticamente.',
          );
          return;
        }
        props.clipDurationSeconds = Math.min(duration, j.duration_seconds);
      }
      if (await cancelled(id)) return;
      await setState(id, 'rendering');
      const file = path.join(dir, 'video.mp4');
      await renderVideo(props, file, clip, narration?.audioPath);
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
    if (e instanceof NarrationError) {
      await setState(id, e.kind === 'uncertain' ? 'needs_attention' : 'failed', e.message);
      return;
    }
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
      message.startsWith('fal.ai')
        ? message
        : 'No se pudo terminar el montaje o consultar el proveedor tras tres intentos. Puedes reintentar sin cambiar el contenido.',
    );
    console.error('Trabajo fallido', id, e instanceof Error ? e.name : 'Error');
  } finally {
    await c.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [`job:${id}`]);
    c.release();
  }
}
