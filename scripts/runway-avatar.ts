import 'dotenv/config';
import sharp from 'sharp';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { runwayClient, providerError } from '../src/server/runway';
if (!process.env.RUNWAYML_API_SECRET) {
  console.error('PENDIENTE: configura RUNWAYML_API_SECRET en .env.');
  process.exitCode = 2;
} else {
  try {
    const client = runwayClient();
    const source = process.argv[2] ?? 'public/brand/mascot.webp';
    const image = await sharp(path.resolve(source))
      .resize({ width: 1280, withoutEnlargement: true })
      .png()
      .toBuffer();
    const avatar = await client.avatars.create({
      name: 'Dino · Ingresa PE',
      personality:
        'Eres el dinosaurio educativo de Ingresa PE. Explicas conceptos para postulantes a la UNSA con español peruano claro, amigable y preciso. Mantén la identidad del personaje y gesticula con naturalidad.',
      referenceImage: `data:image/png;base64,${image.toString('base64')}`,
      voice: { type: 'runway-live-preset', presetId: 'adrian' },
      imageProcessing: 'optimize',
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
    console.log('Avatar registrado. Añade a .env: RUNWAY_AVATAR_ID=' + avatar.id);
    console.log('Estado:', avatar.status);
    console.log('Espera a que esté READY en el portal antes de generar.');
  } catch (e) {
    console.error(providerError(e));
    process.exitCode = 1;
  }
}
