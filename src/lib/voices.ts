import { z } from 'zod';

export const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview' as const;
export const voiceNames = ['Puck', 'Sadachbia', 'Achird', 'Fenrir'] as const;
export const voiceCatalog = [
  {
    name: 'Puck',
    character: 'Animada',
    description: 'El primer candidato para un dino juguetón y con energía.',
  },
  {
    name: 'Sadachbia',
    character: 'Vivaz',
    description: 'Otra opción para explorar una interpretación dinámica.',
  },
  {
    name: 'Achird',
    character: 'Amistosa',
    description: 'Un punto de partida para un personaje cercano y amigable.',
  },
  {
    name: 'Fenrir',
    character: 'Entusiasta',
    description: 'Para probar una interpretación con más emoción.',
  },
] as const;
export const voicePreview = (name: (typeof voiceNames)[number]) =>
  `/previews/gemini/${name.toLowerCase()}.wav`;
export const voiceSelectionSchema = z.object({
  provider: z.literal('gemini'),
  name: z.enum(voiceNames),
});
export const jobVoiceSchema = voiceSelectionSchema.extend({ model: z.literal(GEMINI_TTS_MODEL) });
export type VoiceSelection = z.infer<typeof voiceSelectionSchema>;
export type JobVoice = z.infer<typeof jobVoiceSchema>;
