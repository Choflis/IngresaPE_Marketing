import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { HttpError } from '../lib/auth';

// Call only after authenticating and resolving an allowed file path.
export async function privateFileResponse(
  req: Request,
  file: string,
  mime: string,
  downloadName?: string,
) {
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    throw new HttpError(404, 'El archivo no está disponible.');
  }
  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Cache-Control': 'private, no-store',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
  };
  if (downloadName) headers['Content-Disposition'] = `attachment; filename="${downloadName}"`;
  const range = req.headers.get('range');
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    const start = match ? Number(match[1]) : -1;
    const end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (
      !match ||
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= size ||
      end < start
    )
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    headers['Content-Length'] = String(end - start + 1);
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
      status: 206,
      headers,
    });
  }
  headers['Content-Length'] = String(size);
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers });
}
