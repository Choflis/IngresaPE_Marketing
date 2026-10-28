import { z } from 'zod';
export const questionInput = z
  .object({
    statement: z.string().trim().min(10).max(700),
    explanation: z.string().trim().min(5).max(1200),
    courseId: z.coerce.number().int().positive(),
    topic: z.string().trim().min(2).max(100),
    areaIds: z
      .array(z.number().int().positive())
      .min(1)
      .max(3)
      .transform((v) => [...new Set(v)]),
    difficulty: z.enum(['basica', 'intermedia', 'avanzada']),
    approved: z.boolean().default(false),
    choices: z
      .array(
        z.object({
          label: z.enum(['A', 'B', 'C', 'D', 'E']),
          text: z.string().trim().min(1).max(250),
          correct: z.boolean(),
        }),
      )
      .min(2)
      .max(5),
    source: z.string().trim().max(200).default('Contenido propio de práctica'),
  })
  .superRefine((v, ctx) => {
    if (v.choices.filter((c) => c.correct).length !== 1)
      ctx.addIssue({
        code: 'custom',
        message: 'Debe existir exactamente una alternativa correcta.',
      });
    if (new Set(v.choices.map((c) => c.label)).size !== v.choices.length)
      ctx.addIssue({ code: 'custom', message: 'Las letras de alternativas deben ser únicas.' });
  });
export const batchInput = z.object({
  questionIds: z
    .array(z.string().uuid())
    .min(1)
    .max(25)
    .transform((v) => [...new Set(v)]),
  templateVersionId: z.number().int().positive(),
  provider: z.enum(['demo', 'runway']),
  name: z.string().trim().max(100).default('Nueva producción'),
});
export const templateInput = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(300),
  kind: z.enum(['video', 'image', 'carousel']),
  accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  durationSeconds: z.number().int().min(6).max(60),
});
// Conservative reservation, not an invoice: TTS + estimated speaking time + margin.
export function estimateCostCents(text: string) {
  return Math.ceil(
    (Math.ceil(text.length / 50) + Math.ceil(Math.max(6, text.length / 9) / 3)) * 1.5 + 2,
  );
}
export function narrationFor(q: {
  statement: string;
  explanation: string;
  choices: { label: string; text: string; correct: boolean }[];
}) {
  const c = q.choices.find((c) => c.correct)!;
  return `${q.statement} La respuesta correcta es la alternativa ${c.label}: ${c.text}. ${q.explanation}`;
}
export function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}
export function assertRenderable(q: {
  statement: string;
  explanation: string;
  choices: { text: string }[];
}) {
  if (
    q.statement.length > 240 ||
    q.explanation.length > 400 ||
    q.statement.length + q.choices.reduce((n, c) => n + c.text.length, 0) > 650
  )
    throw new Error(
      'El contenido es demasiado extenso para este formato. Usa hasta 240 caracteres de pregunta, 400 de explicación y 650 entre pregunta y alternativas.',
    );
}
