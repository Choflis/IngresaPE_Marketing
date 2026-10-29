import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { transaction } from '../lib/db';
export const storageRoot = () => path.resolve(process.env.STORAGE_DIR ?? './storage');
export async function saveOutput(
  ownerId: string,
  jobId: string,
  filePath: string,
  mime: string,
  name: string,
  ordinal = 0,
) {
  const s = await stat(filePath);
  const relative = path.relative(storageRoot(), filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Ruta de archivo inválida.');
  return transaction(async (c) => {
    const existing = (
      await c.query('SELECT asset_id FROM job_assets WHERE job_id=$1 AND ordinal=$2', [
        jobId,
        ordinal,
      ])
    ).rows[0];
    if (existing) return existing.asset_id as string;
    const a = (
      await c.query(
        'INSERT INTO media_assets(owner_id,original_name,storage_path,mime_type,byte_size) VALUES($1,$2,$3,$4,$5) RETURNING id',
        [ownerId, name, relative, mime, s.size],
      )
    ).rows[0];
    await c.query('INSERT INTO job_assets(job_id,asset_id,ordinal) VALUES($1,$2,$3)', [
      jobId,
      a.id,
      ordinal,
    ]);
    return a.id as string;
  });
}
export async function jobDirectory(id: string) {
  const dir = path.join(storageRoot(), 'jobs', id);
  await mkdir(dir, { recursive: true });
  return dir;
}
export async function saveUpload(bytes: Buffer, name: string, mime: string, ownerId: string) {
  const ext = mime === 'image/png' ? '.png' : mime === 'image/jpeg' ? '.jpg' : '.webp';
  const relative = `uploads/${randomUUID()}${ext}`;
  await mkdir(path.join(storageRoot(), 'uploads'), { recursive: true });
  await writeFile(path.join(storageRoot(), relative), bytes, { flag: 'wx' });
  return transaction(
    async (c) =>
      (
        await c.query(
          'INSERT INTO media_assets(owner_id,original_name,storage_path,mime_type,byte_size) VALUES($1,$2,$3,$4,$5) RETURNING id',
          [ownerId, name, relative, mime, bytes.length],
        )
      ).rows[0],
  );
}
export async function downloadProviderOutput(url: string, target: string) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('El proveedor devolvió una URL inválida.');
  const allowed = ['fal.media'];
  if (!allowed.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`)))
    throw new Error('El dominio del archivo no es un CDN de fal.ai autorizado.');
  const response = await fetch(u, { signal: AbortSignal.timeout(120000), redirect: 'error' });
  if (!response.ok || !response.body)
    throw new Error('No se pudo descargar el video del proveedor.');
  const max = 250 * 1024 * 1024;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > max) throw new Error('El video excede el límite de 250 MB.');
    chunks.push(chunk);
  }
  await writeFile(target, Buffer.concat(chunks));
}
