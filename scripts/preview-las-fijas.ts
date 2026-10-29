import 'dotenv/config';
import path from 'node:path';
import { mkdir, rename, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pool, query } from '../src/lib/db';
import { lasFijasSample } from '../src/lib/reference-question';
import { renderVideo, durationOf } from '../src/server/render';
import { storageRoot } from '../src/server/storage';

try {
  const relative = 'previews/las-fijas-demo-30s.mp4';
  const output = path.join(storageRoot(), relative);
  await mkdir(path.dirname(output), { recursive: true });
  const staging = path.join(path.dirname(output), `las-fijas-${randomUUID()}.mp4`);
  console.log('Renderizando Las fijas: 30 segundos, composición local, sin voz ni costo de API.');
  await renderVideo(
    {
      ...lasFijasSample,
      accent: '#C80727',
      demo: true,
      durationSeconds: 30,
      composition: 'las-fijas',
    },
    staging,
  );
  const duration = await durationOf(staging);
  if (Math.abs(duration - 30) > 0.05)
    throw new Error('El archivo no tiene los 30 segundos esperados.');
  await rename(staging, output);
  const [owner] = await query('SELECT id FROM users WHERE email=$1', [
    process.env.ADMIN_EMAIL?.toLowerCase(),
  ]);
  if (owner) {
    await query(
      `INSERT INTO media_assets(owner_id,original_name,storage_path,mime_type,byte_size)
      VALUES($1,$2,$3,'video/mp4',$4) ON CONFLICT(storage_path) DO UPDATE SET byte_size=excluded.byte_size,original_name=excluded.original_name`,
      [owner.id, 'Las fijas · 30 s · diseño sin voz.mp4', relative, (await stat(output)).size],
    );
    console.log('Vista de diseño guardada en Biblioteca.');
  }
  console.log(`Verificado: ${duration} segundos. Archivo: ${output}`);
} finally {
  await pool.end();
}
