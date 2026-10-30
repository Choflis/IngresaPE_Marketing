import type { Choice } from './types';
import { assertValidChoices } from './video-format';

export const narrationSegments = ['intro', 'question', 'answer', 'outro'] as const;
export type NarrationSegment = (typeof narrationSegments)[number];
export type NarrationTiming = { questionAt: number; answerAt: number; outroAt: number };
export type NarrationPlan = {
  totalFrames: number;
  speed: number;
  timing: NarrationTiming;
  cues: Record<NarrationSegment, { startFrame: number; durationFrames: number }>;
};
export function buildNarrationScript(q: {
  statement: string;
  explanation: string;
  choices: Choice[];
}) {
  const correct = assertValidChoices(q.choices);
  const spoken = (text: string) =>
    text
      .replace(/S\/\s*(\d+(?:[.,]\d+)?)/g, '$1 soles')
      .replace(/%/g, ' por ciento')
      .replace(/×/g, ' por ')
      .replace(/=/g, ' igual a ')
      .replace(/\s+/g, ' ')
      .trim();
  return {
    intro: '¡Esta es una fija para la UNSA!',
    question: spoken(
      `${q.statement} ${q.choices.map((c) => `Alternativa ${c.label}: ${c.text}.`).join(' ')}`,
    ),
    answer: spoken(`La respuesta correcta es ${correct.label}: ${correct.text}. ${q.explanation}`),
    outro: '¡Practica en ingresa punto pe!',
  };
}

export function planNarration(
  durations: Record<NarrationSegment, number>,
  totalSeconds: number,
): NarrationPlan {
  if (
    !Number.isFinite(totalSeconds) ||
    totalSeconds < 6 ||
    totalSeconds > 60 ||
    narrationSegments.some((s) => !Number.isFinite(durations[s]) || durations[s] <= 0)
  )
    throw new Error('Duración de narración inválida.');
  const totalFrames = Math.round(totalSeconds * 30);
  const gap = 4,
    think = 60,
    tail = 5;
  // Round each segment up to a complete visual frame. Never trim spoken content.
  for (let rate = 1000; rate <= 1250; rate++) {
    const speed = rate / 1000;
    const lengths = Object.fromEntries(
      narrationSegments.map((s) => [s, Math.ceil((durations[s] / speed) * 30)]),
    ) as Record<NarrationSegment, number>;
    if (
      Object.values(lengths).reduce((sum, n) => sum + n, 0) + gap * 3 + think + tail >
      totalFrames
    )
      continue;
    const starts = {
      intro: 0,
      question: lengths.intro + gap,
      answer: lengths.intro + lengths.question + gap * 2 + think,
      outro: totalFrames - lengths.outro - tail,
    };
    return {
      totalFrames,
      speed,
      timing: {
        questionAt: starts.question / 30,
        answerAt: starts.answer / 30,
        outroAt: starts.outro / 30,
      },
      cues: Object.fromEntries(
        narrationSegments.map((s) => [s, { startFrame: starts[s], durationFrames: lengths[s] }]),
      ) as NarrationPlan['cues'],
    };
  }
  throw new Error(
    `La narración no cabe en ${totalSeconds} segundos con un ritmo natural. Acorta la pregunta, las alternativas o la explicación antes de generar otro lote.`,
  );
}
