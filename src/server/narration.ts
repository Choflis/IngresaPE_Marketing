import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  buildNarrationScript,
  narrationSegments,
  planNarration,
  type NarrationSegment,
} from '../lib/narration';
import type { Choice } from '../lib/types';
import { jobVoiceSchema, voicePreview, type JobVoice } from '../lib/voices';
import { generateSpeech, narrationStyle, NarrationError } from './gemini-tts';
import { durationOf } from './render';

async function atomicWrite(file: string, bytes: string | Buffer) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes, { mode: 0o600 });
  await rename(temporary, file);
}
async function exists(file: string) {
  try {
    return (await stat(file)).size > 44;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw e;
  }
}

// Called under the worker's per-job advisory lock. A pending receipt survives a crash;
// its request cannot be repeated without knowing whether Gemini already generated it.
async function segmentAudio(
  text: string,
  voice: JobVoice,
  directory: string,
  segment: NarrationSegment,
) {
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ text, voice, narrationStyle, version: 1 }))
    .digest('hex')
    .slice(0, 24);
  const file = path.join(directory, `speech-${segment}-${fingerprint}.wav`);
  if (await exists(file)) return file;
  const receipt = `${file}.json`;
  let previous: { state: string } | undefined;
  try {
    previous = JSON.parse(await readFile(receipt, 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
      throw new NarrationError(
        'No se pudo verificar el registro de voz. Revisa este trabajo antes de generar otra narración.',
        'uncertain',
      );
  }
  if (previous && previous.state !== 'rejected')
    throw new NarrationError(
      'Existe una solicitud de voz sin confirmación o falta su archivo. Revisa este trabajo; no se enviará otra solicitud automáticamente.',
      'uncertain',
    );
  await atomicWrite(
    receipt,
    JSON.stringify({ state: 'pending', voice, text, createdAt: new Date().toISOString() }),
  );
  try {
    const audio = await generateSpeech(text, voice);
    await atomicWrite(file, audio);
    await atomicWrite(receipt, JSON.stringify({ state: 'completed', voice, text }));
    return file;
  } catch (e) {
    if (e instanceof NarrationError && ['rejected', 'configuration'].includes(e.kind))
      await atomicWrite(receipt, JSON.stringify({ state: 'rejected', voice, text }));
    throw e;
  }
}

export async function prepareNarration(
  question: { statement: string; explanation: string; choices: Choice[] },
  selection: JobVoice,
  directory: string,
  durationSeconds: number,
  isCancelled: () => Promise<boolean> = async () => false,
) {
  const voice = jobVoiceSchema.parse(selection);
  const script = buildNarrationScript(question);
  await mkdir(directory, { recursive: true });
  const files = {} as Record<NarrationSegment, string>;
  const durations = {} as Record<NarrationSegment, number>;
  for (const segment of narrationSegments) {
    if (await isCancelled()) return null;
    const preview = path.resolve('public', `.${voicePreview(voice.name)}`);
    files[segment] =
      segment === 'intro' && (await exists(preview))
        ? preview
        : await segmentAudio(script[segment], voice, directory, segment);
    try {
      durations[segment] = await durationOf(files[segment]);
    } catch {
      throw new NarrationError(
        'No se pudo comprobar el audio generado. Conservamos los archivos para revisar este trabajo.',
        'uncertain',
      );
    }
  }
  let plan;
  try {
    plan = planNarration(durations, durationSeconds);
  } catch (e) {
    throw new NarrationError((e as Error).message, 'too_long');
  }
  if (await isCancelled()) return null;
  const audioPath = path.join(directory, 'narration.wav');
  const staging = path.join(directory, `narration-${randomUUID()}.wav`);
  const filters = narrationSegments.map(
    (s, i) =>
      `[${i}:a]aresample=24000,atempo=${plan.speed},adelay=${Math.round((plan.cues[s].startFrame / 30) * 24000)}S:all=1[s${i}]`,
  );
  filters.push(
    `${narrationSegments.map((_, i) => `[s${i}]`).join('')}amix=inputs=4:normalize=0,apad,atrim=duration=${durationSeconds}[voice]`,
  );
  await promisify(execFile)(
    'ffmpeg',
    [
      '-v',
      'error',
      '-nostdin',
      ...narrationSegments.flatMap((s) => ['-i', files[s]]),
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[voice]',
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      staging,
    ],
    { timeout: 120000 },
  );
  await rename(staging, audioPath);
  await atomicWrite(
    path.join(directory, 'narration.json'),
    JSON.stringify({ voice, script, plan, durations }, null, 2),
  );
  return { audioPath, timing: plan.timing };
}
