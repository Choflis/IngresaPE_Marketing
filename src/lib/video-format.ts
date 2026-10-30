import type { Choice } from './types';

export const compositionKeys = ['dino', 'challenge', 'las-fijas', 'daily', 'carousel'] as const;
export type CompositionKey = (typeof compositionKeys)[number];
export const LAS_FIJAS = { duration: 30, questionAt: 2, answerAt: 10, outroAt: 27 } as const;

export function assertValidChoices(choices: Choice[]) {
  if (choices.length < 2 || choices.length > 5)
    throw new Error('Usa entre dos y cinco alternativas.');
  const normalized = choices.map((c) =>
    c.text.normalize('NFKC').trim().toLocaleLowerCase('es').replace(/\s+/g, ' '),
  );
  if (
    new Set(choices.map((c) => c.label)).size !== choices.length ||
    new Set(normalized).size !== choices.length
  )
    throw new Error('Hay alternativas repetidas. Revisa las letras y el contenido.');
  const correct = choices.filter((c) => c.correct);
  if (correct.length !== 1) throw new Error('Debe existir exactamente una alternativa correcta.');
  return correct[0];
}

export function lasFijasPhase(
  seconds: number,
  timing: { questionAt: number; answerAt: number; outroAt: number } = LAS_FIJAS,
): 'intro' | 'question' | 'answer' | 'outro' {
  return seconds < timing.questionAt
    ? 'intro'
    : seconds < timing.answerAt
      ? 'question'
      : seconds < timing.outroAt
        ? 'answer'
        : 'outro';
}

export function assertLasFijasLayout(q: {
  statement: string;
  explanation: string;
  choices: Choice[];
}) {
  assertValidChoices(q.choices);
  if (q.statement.length > 200)
    throw new Error(
      'La pregunta de Las fijas admite hasta 200 caracteres para conservar la legibilidad.',
    );
  if (q.explanation.length > 180)
    throw new Error('La explicación de Las fijas admite hasta 180 caracteres.');
  if (
    q.choices.some((c) => c.text.length > 50) ||
    q.statement.length + q.choices.reduce((n, c) => n + c.text.length, 0) > 420
  )
    throw new Error(
      'Las alternativas no caben en Las fijas. Usa hasta 50 caracteres por alternativa y 420 entre pregunta y alternativas.',
    );
  const fontSize = q.statement.length > 130 || q.choices.length > 3 ? 24 : 28;
  const questionHeight = upperLineCount(q.statement, fontSize, 350) * fontSize * 1.25;
  // Use the narrowest text column: the revealed row also contains the check.
  const choicesHeight =
    q.choices.reduce(
      (height, c) => height + Math.max(32, upperLineCount(c.text, 23, 250) * 23 * 1.25) + 28,
      0,
    ) +
    (q.choices.length - 1) * 9;
  const cardHeight = 42 + questionHeight + 18 + choicesHeight;
  const explanationHeight = 66.4 + upperLineCount(q.explanation, 23, 612) * 23 * 1.3;
  if (cardHeight > 515 || explanationHeight > 170)
    throw new Error(
      'El contenido no cabe en el espacio de Las fijas con texto legible. Acorta la pregunta, las alternativas o la explicación, o elige otro formato.',
    );
}

// Conservative Arial advance bounds (in em), including wide Latin glyphs and
// unknown Unicode. Word wrapping matters: a character count alone misses tall
// five-choice cards. Bounds intentionally reject borderline content.
function upperLineCount(text: string, size: number, width: number) {
  function advance(char: string) {
    if (char === ' ') return size * 0.32;
    if (/[ilI.,:;!|'`]/.test(char)) return size * 0.35;
    if (/[MW@%mw]/.test(char)) return size * 1.08;
    if (/[A-ZÁÉÍÓÚÜÑ]/.test(char)) return size * 0.85;
    if (/[a-záéíóúüñ0-9¿?()\-]/.test(char)) return size * 0.68;
    return size * (char.codePointAt(0)! > 0xffff ? 2.2 : 1.15);
  }
  let lines = 1,
    used = 0;
  for (const word of text.trim().split(/\s+/)) {
    const wordWidth = [...word].reduce((sum, c) => sum + advance(c), 0);
    if (wordWidth <= width) {
      const prefix = used > 0 ? advance(' ') : 0;
      if (used + prefix + wordWidth > width) {
        lines++;
        used = wordWidth;
      } else used += prefix + wordWidth;
    } else {
      if (used > 0) {
        lines++;
        used = 0;
      }
      for (const char of word) {
        const next = advance(char);
        if (used + next > width && used > 0) {
          lines++;
          used = 0;
        }
        used += next;
      }
    }
  }
  return lines;
}
