import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export async function muxNarration(video: string, audio: string, output: string, seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 6 || seconds > 60)
    throw new Error('Duración de montaje inválida.');
  await promisify(execFile)(
    'ffmpeg',
    [
      '-v',
      'error',
      '-nostdin',
      '-y',
      '-i',
      video,
      '-i',
      audio,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-af',
      `apad,atrim=duration=${seconds}`,
      '-t',
      String(seconds),
      '-movflags',
      '+faststart',
      output,
    ],
    { timeout: 120000 },
  );
}
