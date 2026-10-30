import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import sharp from 'sharp';
import { muxNarration } from './mux-audio';
import type { VideoProps } from '../video/QuestionVideo';
let bundled: Promise<string> | undefined;
export async function durationOf(file: string) {
  const { stdout } = await promisify(execFile)('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  const n = Number(stdout.trim());
  if (!Number.isFinite(n) || n <= 0 || n > 300)
    throw new Error('Duración de video inválida (máximo 5 minutos).');
  return n;
}
export async function renderVideo(
  props: VideoProps,
  output: string,
  clipPath?: string,
  narrationPath?: string,
) {
  bundled ??= bundle({
    entryPoint: path.resolve('src/video/Root.tsx'),
    publicDir: path.resolve('public'),
    webpackOverride: (c) => c,
  });
  const serveUrl = await bundled;
  // Serve one provider file over loopback, only for this render. Not a public media endpoint.
  const bytes = clipPath ? await readFile(clipPath) : null;
  const server = bytes
    ? createServer((req, res) => {
        if (req.url !== '/clip.mp4') {
          res.writeHead(404).end();
          return;
        }
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
        if (match) {
          const start = Number(match[1]),
            end = match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
          if (start >= bytes.length || end < start) {
            res.writeHead(416).end();
            return;
          }
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
            'Content-Length': end - start + 1,
          });
          res.end(bytes.subarray(start, end + 1));
        } else {
          res.writeHead(200, { 'Content-Length': bytes.length });
          res.end(bytes);
        }
      })
    : null;
  try {
    let input = props;
    if (server) {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const addr = server.address() as { port: number };
      input = { ...props, clipUrl: `http://127.0.0.1:${addr.port}/clip.mp4` };
    }
    const composition = await selectComposition({
      serveUrl,
      id: 'QuestionVideo',
      inputProps: input,
    });
    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: narrationPath ? `${output}.silent.mp4` : output,
      inputProps: input,
      concurrency: Number(process.env.RENDER_CONCURRENCY ?? 1),
      chromiumOptions: { gl: 'angle', disableWebSecurity: false },
      timeoutInMilliseconds: 120000,
    });
    if (narrationPath)
      await muxNarration(`${output}.silent.mp4`, narrationPath, output, props.durationSeconds);
    await stat(output);
  } finally {
    server?.close();
  }
}
const escape = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
function lines(s: string, max = 39) {
  const words = s.split(/\s+/);
  const result: string[] = [];
  for (const w of words) {
    if (!result.length || result[result.length - 1].length + w.length + 1 > max) result.push(w);
    else result[result.length - 1] += ` ${w}`;
  }
  return result;
}
export async function renderImage(p: VideoProps, output: string, page = 0) {
  const title =
    page === 1
      ? 'UNA PISTA PARA RESOLVER'
      : page === 2
        ? 'ENTIENDE LA RESPUESTA'
        : p.course.toUpperCase();
  const body =
    page === 1
      ? 'Lee con atención, identifica el concepto y compara cada alternativa.'
      : page === 2
        ? p.explanation
        : p.statement;
  const wrapped = lines(body, 38);
  let y = 260;
  const content = wrapped
    .map((line) => {
      const t = `<tspan x="80" y="${y}">${escape(line)}</tspan>`;
      y += 54;
      return t;
    })
    .join('');
  y += 25;
  let choices = '';
  if (page === 0)
    for (const c of p.choices) {
      const optionLines = lines(c.text, 50);
      const height = optionLines.length * 36 + 30;
      choices += `<rect x="80" y="${y}" width="920" height="${height}" rx="12" fill="#161E2D"/><text x="105" y="${y + 40}" font-family="DejaVu Sans" font-size="27" font-weight="bold" fill="${p.accent}">${escape(c.label)}</text><text font-family="DejaVu Sans" font-size="27" fill="#F5F6FA">${optionLines.map((l, i) => `<tspan x="160" y="${y + 40 + i * 36}">${escape(l)}</tspan>`).join('')}</text>`;
      y += height + 15;
    }
  if (y > 1130)
    throw new Error('El texto no cabe en la publicación. Reduce la pregunta o las alternativas.');
  const svg = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg"><rect width="1080" height="1350" fill="#090D16"/><rect x="80" y="82" width="42" height="5" rx="2" fill="${p.accent}"/><text x="80" y="157" fill="${p.accent}" font-size="26" font-family="DejaVu Sans">${escape(title)}</text><text font-family="DejaVu Sans" font-size="42" font-weight="bold" fill="#F5F6FA">${content}</text>${choices}<rect x="0" y="1220" width="1080" height="130" fill="${p.accent}"/><text x="80" y="1295" fill="white" font-size="30" font-family="DejaVu Sans">Practica para la UNSA en ingresa.pe</text><text x="80" y="1170" fill="#A7B0C2" font-size="23" font-family="DejaVu Sans">${escape(p.area)} · ${page + 1}${page > 0 ? ' / 3' : ''}</text></svg>`;
  const logo = await sharp('public/brand/logo.png').resize({ width: 230 }).png().toBuffer();
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, left: 770, top: 70 }])
    .png()
    .toFile(output);
}
