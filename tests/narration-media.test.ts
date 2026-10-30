import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prepareNarration } from '../src/server/narration';
import { muxNarration } from '../src/server/mux-audio';
import { durationOf } from '../src/server/render';
import { GEMINI_TTS_MODEL } from '../src/lib/voices';
import { lasFijasSample } from '../src/lib/reference-question';
import { generateSpeech, NarrationError } from '../src/server/gemini-tts';

vi.mock('../src/server/gemini-tts', async (original) => ({
  ...(await original<typeof import('../src/server/gemini-tts')>()),
  generateSpeech: vi.fn(),
}));
const run = promisify(execFile);
const voice = { provider: 'gemini', name: 'Puck', model: GEMINI_TTS_MODEL } as const;
let directory: string, wav: Buffer;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'ingresape-narration-'));
  await run('ffmpeg', [
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=24000:duration=1',
    '-ac',
    '1',
    path.join(directory, 'fixture.wav'),
  ]);
  wav = await readFile(path.join(directory, 'fixture.wav'));
  vi.mocked(generateSpeech).mockReset().mockResolvedValue(wav);
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('preparación y montaje de voz', () => {
  it('reutiliza los segmentos guardados, mantiene el guion y crea una pista de 30s', async () => {
    const first = await prepareNarration(lasFijasSample, voice, directory, 30);
    expect(first).not.toBeNull();
    expect(await durationOf(first!.audioPath)).toBeCloseTo(30, 2);
    expect(generateSpeech).toHaveBeenCalledTimes(3);
    const texts = vi.mocked(generateSpeech).mock.calls.map(([text]) => text);
    expect(texts[1]).toContain('La respuesta correcta es B: 96 soles.');
    expect(first!.timing.answerAt).toBeGreaterThan(first!.timing.questionAt + 3);
    vi.mocked(generateSpeech).mockClear();
    const second = await prepareNarration(lasFijasSample, voice, directory, 30);
    expect(second!.timing).toEqual(first!.timing);
    expect(generateSpeech).not.toHaveBeenCalled();
  });
  it('no reenvía una solicitud de voz sin confirmación', async () => {
    vi.mocked(generateSpeech).mockRejectedValueOnce(
      new NarrationError('sin confirmación', 'uncertain'),
    );
    await expect(prepareNarration(lasFijasSample, voice, directory, 30)).rejects.toMatchObject({
      kind: 'uncertain',
    });
    vi.mocked(generateSpeech).mockClear();
    await expect(prepareNarration(lasFijasSample, voice, directory, 30)).rejects.toThrow(/confirm/);
    expect(generateSpeech).not.toHaveBeenCalled();
  });
  it('permite reintentar una cuota rechazada y comprueba cancelación antes de otra llamada', async () => {
    vi.mocked(generateSpeech).mockRejectedValueOnce(new NarrationError('cuota', 'rejected'));
    await expect(prepareNarration(lasFijasSample, voice, directory, 30)).rejects.toThrow('cuota');
    const result = await prepareNarration(lasFijasSample, voice, directory, 30, async () => true);
    expect(result).toBeNull();
    expect(generateSpeech).toHaveBeenCalledTimes(1);
    expect(await prepareNarration(lasFijasSample, voice, directory, 30)).not.toBeNull();
  });
  it('rechaza voz demasiado larga conservando segmentos para revisión', async () => {
    await run('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=24000:duration=40',
      '-ac',
      '1',
      path.join(directory, 'long.wav'),
    ]);
    vi.mocked(generateSpeech).mockResolvedValue(await readFile(path.join(directory, 'long.wav')));
    await expect(prepareNarration(lasFijasSample, voice, directory, 30)).rejects.toThrow(/acorta/i);
    expect((await readdir(directory)).filter((f) => f.endsWith('.wav')).length).toBeGreaterThan(3);
  });
  it('une video y audio reales en un MP4 sin perder la duración ni la pista de voz', async () => {
    const audio = await prepareNarration(lasFijasSample, voice, directory, 30);
    const video = path.join(directory, 'silent.mp4'),
      output = path.join(directory, 'final.mp4');
    await run('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=white:s=32x32:r=30:d=30',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      video,
    ]);
    await muxNarration(video, audio!.audioPath, output, 30);
    const { stdout } = await run('ffprobe', [
      '-v',
      'error',
      '-show_streams',
      '-show_format',
      '-of',
      'json',
      output,
    ]);
    const info = JSON.parse(stdout);
    expect(Number(info.format.duration)).toBeCloseTo(30, 1);
    expect(info.streams.map((s: { codec_type: string }) => s.codec_type).sort()).toEqual([
      'audio',
      'video',
    ]);
    expect(
      info.streams.find((s: { codec_type: string }) => s.codec_type === 'audio').codec_name,
    ).toBe('aac');
  });
});
