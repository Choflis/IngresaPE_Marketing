import 'dotenv/config';
import sharp from 'sharp';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { runwayClient, providerError } from '../src/server/runway';
import { getProviderSettings, saveProviderSettings } from '../src/server/provider-settings';
import { withProviderLock } from '../src/server/provider-lock';
import { pool } from '../src/lib/db';
try {
  await withProviderLock(async () => {
    const settings = getProviderSettings();
    if (!settings.apiKey) {
      console.error('PENDIENTE: conecta Runway desde Configuración.');
      process.exitCode = 2;
    } else if (settings.avatarId) {
      console.log('Ya hay un dinosaurio configurado:', settings.avatarId);
      console.log('Consulta su estado desde Configuración. No se creó otro avatar.');
    } else if (['creating', 'uncertain'].includes(settings.avatarStatus ?? '')) {
      console.error(
        'Revisa el avatar en Runway y conecta su ID en Configuración antes de volver a crear.',
      );
      process.exitCode = 2;
    } else {
      try {
        const client = runwayClient(settings.apiKey);
        const source = process.argv[2] ?? 'public/brand/mascot.webp';
        const image = await sharp(path.resolve(source))
          .resize({ width: 1280, withoutEnlargement: true })
          .png()
          .toBuffer();
        saveProviderSettings({ ...settings, avatarStatus: 'creating' });
        const avatar = await client.avatars.create({
          name: 'Dino · Ingresa PE',
          personality:
            'Eres el dinosaurio educativo de Ingresa PE. Explicas conceptos para postulantes a la UNSA con español peruano claro, amigable y preciso. Mantén la identidad del personaje y gesticula con naturalidad.',
          referenceImage: `data:image/png;base64,${image.toString('base64')}`,
          voice: { type: 'runway-live-preset', presetId: 'adrian' },
          imageProcessing: 'optimize',
        });
        saveProviderSettings({
          ...settings,
          avatarId: avatar.id,
          avatarStatus: avatar.status === 'READY' ? 'ready' : 'processing',
        });
        await mkdir('storage/provider-tests', { recursive: true });
        await writeFile(
          'storage/provider-tests/avatar.json',
          JSON.stringify(
            { id: avatar.id, status: avatar.status, createdAt: new Date().toISOString() },
            null,
            2,
          ),
        );
        console.log('Avatar guardado en la configuración privada:', avatar.id);
        console.log('Estado:', avatar.status);
        console.log('Espera a que esté READY en el portal antes de generar.');
      } catch (e) {
        if (getProviderSettings().avatarStatus === 'creating')
          saveProviderSettings({ ...settings, avatarStatus: 'uncertain' });
        console.error(providerError(e));
        process.exitCode = 1;
      }
    }
  });
} finally {
  await pool.end();
}
