import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateSpeech } from '../src/server/gemini-tts';
import { GEMINI_TTS_MODEL } from '../src/lib/voices';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('contrato Gemini TTS', () => {
  it('usa modelo y voz elegidos y convierte PCM en WAV reproducible', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'private-test-key');
    const pcm = Buffer.alloc(48000, 1);
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
      );
      expect(new Headers(init.headers).get('x-goog-api-key')).toBe('private-test-key');
      expect(JSON.parse(init.body as string).generationConfig).toMatchObject({
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
      });
      expect(init.body).toContain('Texto exacto:');
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/L16;codec=pcm;rate=24000',
                    data: pcm.toString('base64'),
                  },
                },
              ],
            },
          },
        ],
      });
    });
    vi.stubGlobal('fetch', fetcher);
    const wav = await generateSpeech('Una pregunta de prueba.', {
      provider: 'gemini',
      name: 'Fenrir',
      model: GEMINI_TTS_MODEL,
    });
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.subarray(44)).toEqual(pcm);
  });
  it('informa cuota y no reintenta ni expone la clave', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'private-test-key');
    const fetcher = vi.fn(async () =>
      Response.json({ error: { message: 'private-test-key' } }, { status: 429 }),
    );
    vi.stubGlobal('fetch', fetcher);
    await expect(
      generateSpeech('Hola', { provider: 'gemini', name: 'Puck', model: GEMINI_TTS_MODEL }),
    ).rejects.toThrow(/cuota/i);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rechaza respuestas sin audio o incompletas y distingue fallos sin confirmación', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'private-test-key');
    vi.stubGlobal('fetch', async () =>
      Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] }),
    );
    await expect(
      generateSpeech('Hola', { provider: 'gemini', name: 'Puck', model: GEMINI_TTS_MODEL }),
    ).rejects.toMatchObject({ kind: 'uncertain' });
    vi.stubGlobal('fetch', async () => {
      throw new Error('secret network diagnostic');
    });
    await expect(
      generateSpeech('Hola', { provider: 'gemini', name: 'Puck', model: GEMINI_TTS_MODEL }),
    ).rejects.toMatchObject({ kind: 'uncertain' });
  });
  it('considera HTTP 408 como solicitud sin confirmación, nunca como rechazo reintentable', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'private-test-key');
    vi.stubGlobal('fetch', async () => new Response('', { status: 408 }));
    await expect(
      generateSpeech('Hola', { provider: 'gemini', name: 'Puck', model: GEMINI_TTS_MODEL }),
    ).rejects.toMatchObject({ kind: 'uncertain' });
  });
});
