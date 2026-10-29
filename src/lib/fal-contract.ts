import { z } from 'zod';

export const FAL_IMAGE_MODEL = 'fal-ai/longcat-video/distilled/image-to-video/480p';
export const FAL_TEXT_MODEL = 'fal-ai/longcat-video/distilled/text-to-video/480p';
export const falModelSchema = z.enum([FAL_IMAGE_MODEL, FAL_TEXT_MODEL]);
export type FalModel = z.infer<typeof falModelSchema>;
export const FAL_FPS = 15;
export const FAL_USD_PER_SECOND = 0.005;
const characterPrompt =
  'The same friendly red 3D cartoon dinosaur mascot, full body visible, large dark eyes and cream belly, gently gesturing as an educational presenter. Preserve the character identity, proportions and colors. Fixed camera, plain white background, subtle natural movement. No zoom, no cuts, no text, no numbers, no subtitles, no logos, no speech.';

export const falGenerationSchema = z
  .object({
    model: falModelSchema,
    input: z.object({
      prompt: z.string().min(1).max(2000),
      image_url: z.string().startsWith('data:image/').max(2_000_000).optional(),
      aspect_ratio: z.literal('9:16').optional(),
      num_frames: z.number().int().min(90).max(900),
      fps: z.literal(15),
      seed: z.number().int().min(0).max(2147483647),
      num_inference_steps: z.literal(12),
      enable_prompt_expansion: z.literal(false),
      enable_safety_checker: z.literal(true),
      video_output_type: z.literal('X264 (.mp4)'),
      video_quality: z.literal('high'),
    }),
  })
  .superRefine((v, ctx) => {
    if (v.model === FAL_IMAGE_MODEL && !v.input.image_url)
      ctx.addIssue({ code: 'custom', message: 'Falta la imagen de referencia del dinosaurio.' });
    if (v.model === FAL_TEXT_MODEL && (!v.input.aspect_ratio || v.input.image_url))
      ctx.addIssue({
        code: 'custom',
        message: 'El modelo desde texto requiere formato vertical y no recibe una imagen.',
      });
  });
export type FalGeneration = z.infer<typeof falGenerationSchema>;

export function buildFalGeneration({
  seconds,
  model,
  imageUrl,
  seed,
}: {
  seconds: number;
  model: FalModel;
  imageUrl?: string;
  seed: number;
}): FalGeneration {
  z.number().min(6).max(60).parse(seconds);
  return falGenerationSchema.parse({
    model,
    input: {
      prompt: characterPrompt,
      ...(model === FAL_IMAGE_MODEL ? { image_url: imageUrl } : { aspect_ratio: '9:16' }),
      num_frames: Math.ceil(seconds * FAL_FPS),
      fps: FAL_FPS,
      seed,
      num_inference_steps: 12,
      enable_prompt_expansion: false,
      enable_safety_checker: true,
      video_output_type: 'X264 (.mp4)',
      video_quality: 'high',
    },
  });
}

export function estimateFalCostCents(seconds: number) {
  z.number().positive().max(60).parse(seconds);
  // Billable seconds are frames / 15, even when the final local render uses 30fps.
  return Math.ceil((Math.ceil(seconds * FAL_FPS) / FAL_FPS) * FAL_USD_PER_SECOND * 100);
}
