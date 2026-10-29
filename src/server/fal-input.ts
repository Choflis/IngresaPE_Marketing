import { randomInt } from 'node:crypto';
import sharp from 'sharp';
import { buildFalGeneration, FAL_IMAGE_MODEL, type FalModel } from '../lib/fal-contract';

export async function generationFor(seconds: number, model: FalModel) {
  let imageUrl: string | undefined;
  if (model === FAL_IMAGE_MODEL) {
    const image = await sharp('public/brand/mascot-las-fijas.webp')
      .resize({ width: 480, height: 854, fit: 'contain', background: '#ffffff' })
      .webp({ quality: 90 })
      .toBuffer();
    imageUrl = `data:image/webp;base64,${image.toString('base64')}`;
  }
  return buildFalGeneration({ seconds, model, imageUrl, seed: randomInt(2147483647) });
}
