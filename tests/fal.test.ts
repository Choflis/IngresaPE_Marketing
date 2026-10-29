import { describe, expect, it } from 'vitest';
import {
  buildFalGeneration,
  estimateFalCostCents,
  FAL_IMAGE_MODEL,
  FAL_TEXT_MODEL,
} from '../src/lib/fal-contract';
import { createFalGateway, FalApiError } from '../src/server/fal';

describe('contrato LongCat Distilled 480p', () => {
  it('envía 450 cuadros a 15fps para30s y conserva la imagen', () => {
    const request = buildFalGeneration({
      seconds: 30,
      model: FAL_IMAGE_MODEL,
      imageUrl: 'data:image/webp;base64,aGVsbG8=',
      seed: 42,
    });
    expect(request.model).toBe('fal-ai/longcat-video/distilled/image-to-video/480p');
    expect(request.input).toMatchObject({
      num_frames: 450,
      fps: 15,
      seed: 42,
      image_url: 'data:image/webp;base64,aGVsbG8=',
      enable_prompt_expansion: false,
    });
    expect(request.input.prompt).not.toContain('Formula 1');
    expect(estimateFalCostCents(30)).toBe(15);
    expect(estimateFalCostCents(15)).toBe(8);
    expect(estimateFalCostCents(10.8)).toBe(6);
  });
  it('admite la variante desde texto en vertical sin fingir una imagen de referencia', () => {
    const request = buildFalGeneration({ seconds: 30, model: FAL_TEXT_MODEL, seed: 9 });
    expect(request.input).toMatchObject({ aspect_ratio: '9:16', num_frames: 450 });
    expect(request.input).not.toHaveProperty('image_url');
    expect(() => buildFalGeneration({ seconds: 30, model: FAL_IMAGE_MODEL, seed: 1 })).toThrow(
      /imagen/i,
    );
  });
});

describe('gateway fal sin reenvíos pagados', () => {
  it('envía una vez, consulta la ruta de aplicación y cancela con PUT', async () => {
    const calls: Request[] = [];
    const transport: typeof fetch = async (url, init) => {
      const request = new Request(url, init);
      calls.push(request);
      if (request.method === 'POST') return Response.json({ request_id: 'known-request-id' });
      if (request.url.endsWith('/status')) return Response.json({ status: 'COMPLETED' });
      if (request.method === 'PUT') return Response.json({ status: 'OK' });
      return Response.json({ video: { url: 'https://v3b.fal.media/files/clip.mp4' } });
    };
    const gateway = createFalGateway('private-test-key-only', transport);
    const input = buildFalGeneration({ seconds: 30, model: FAL_TEXT_MODEL, seed: 1 });
    expect((await gateway.submit(input)).id).toBe('known-request-id');
    expect(await gateway.poll('known-request-id')).toEqual({
      status: 'SUCCEEDED',
      output: ['https://v3b.fal.media/files/clip.mp4'],
    });
    await gateway.cancel('known-request-id');
    expect(calls.map((r) => `${r.method} ${r.url}`)).toEqual([
      'POST https://queue.fal.run/fal-ai/longcat-video/distilled/text-to-video/480p',
      'GET https://queue.fal.run/fal-ai/longcat-video/requests/known-request-id/status',
      'GET https://queue.fal.run/fal-ai/longcat-video/requests/known-request-id',
      'PUT https://queue.fal.run/fal-ai/longcat-video/requests/known-request-id/cancel',
    ]);
    expect(calls[0].headers.get('authorization')).toBe('Key private-test-key-only');
    expect(await calls[0].json()).toMatchObject({ num_frames: 450, fps: 15 });
  });
  it('un fallo de inferencia COMPLETED no se interpreta como éxito', async () => {
    const gateway = createFalGateway('test-key', async () =>
      Response.json({ status: 'COMPLETED', error: 'inference failed', error_type: 'runner_error' }),
    );
    expect(await gateway.poll('request-1')).toMatchObject({ status: 'FAILED' });
  });
  it('no reenvía un POST con HTTP500 ni revela el secreto en su error', async () => {
    let calls = 0;
    const gateway = createFalGateway('never-print-this-key', async () => {
      calls++;
      return new Response('secret upstream details', { status: 500 });
    });
    await expect(
      gateway.submit(buildFalGeneration({ seconds: 6, model: FAL_TEXT_MODEL, seed: 1 })),
    ).rejects.toBeInstanceOf(FalApiError);
    expect(calls).toBe(1);
  });
});
