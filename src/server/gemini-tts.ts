import { jobVoiceSchema, type JobVoice } from '../lib/voices';

export class NarrationError extends Error {
  constructor(
    message: string,
    public readonly kind: 'configuration' | 'rejected' | 'uncertain' | 'too_long',
  ) {
    super(message);
    this.name = 'NarrationError';
  }
}
export const narrationStyle =
  'Voz masculina joven, ligeramente aguda, sonriente, cálida y juguetona. Eres un dinosaurio amigable que anima a estudiantes peruanos. Habla español peruano con entusiasmo espontáneo y pausas naturales, como a un amigo. Energía alegre y natural. Pronuncia UNSA como una palabra: unsa.';

function wavFromAudio(data: string, mime: string) {
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length < 100 || bytes.length > 10_000_000) throw new Error('Audio inválido');
  if (
    /^audio\/(wav|x-wav)/i.test(mime) &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WAVE'
  )
    return bytes;
  if (!/^audio\/L16(?:;|$)/i.test(mime) || bytes.length % 2) throw new Error('Audio inválido');
  const rate = Number(/rate=(\d+)/i.exec(mime)?.[1] ?? 24000);
  if (rate !== 24000) throw new Error('Frecuencia inválida');
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(bytes.length + 36, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(bytes.length, 40);
  return Buffer.concat([header, bytes]);
}

export async function generateSpeech(text: string, selection: JobVoice): Promise<Buffer> {
  const voice = jobVoiceSchema.parse(selection);
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key)
    throw new NarrationError(
      'Falta GEMINI_API_KEY en el servidor para generar la narración.',
      'configuration',
    );
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${voice.model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${narrationStyle}\nLee únicamente el texto exacto de abajo. No añadas saludos, instrucciones, comentarios ni música; no resumas ni cambies la respuesta.\n\nTexto exacto:\n${text}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.name } } },
          },
        }),
        signal: AbortSignal.timeout(120000),
      },
    );
  } catch {
    throw new NarrationError(
      'Gemini no confirmó la narración. Revisa este trabajo; no se reenviará automáticamente la solicitud de voz.',
      'uncertain',
    );
  }
  if (!response.ok) {
    const uncertain = response.status === 408 || response.status >= 500;
    const message = uncertain
      ? 'Gemini no confirmó la narración. Revisa este trabajo; no se reenviará automáticamente la solicitud de voz.'
      : response.status === 429
        ? 'Gemini alcanzó su cuota de voz. Espera a que se restablezca y reintenta el trabajo.'
        : [401, 403].includes(response.status)
          ? 'Gemini rechazó la clave de voz o sus permisos. Revisa GEMINI_API_KEY.'
          : `Gemini no pudo generar la voz (HTTP ${response.status}). Revisa el servicio antes de reintentar.`;
    throw new NarrationError(message, uncertain ? 'uncertain' : 'rejected');
  }
  try {
    const value = await response.json();
    const candidate = value.candidates?.[0];
    if (candidate?.finishReason !== 'STOP') throw new Error('Audio incompleto');
    const parts =
      candidate.content?.parts?.filter((p: { inlineData?: unknown }) => p.inlineData) ?? [];
    if (parts.length !== 1) throw new Error('Audio ausente');
    return wavFromAudio(parts[0].inlineData.data, parts[0].inlineData.mimeType);
  } catch {
    throw new NarrationError(
      'Gemini devolvió una narración incompleta o inválida. Revisa el trabajo; no se generará otra voz automáticamente.',
      'uncertain',
    );
  }
}
