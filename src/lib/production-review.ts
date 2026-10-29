import { estimateFalCostCents } from './fal-contract';
import type { Choice } from './types';
import { assertRenderable } from './validation';
import { assertLasFijasLayout, assertValidChoices, type CompositionKey } from './video-format';

export function reviewProduction(
  questions: { id: string; statement: string; explanation: string; choices: Choice[] }[],
  composition: CompositionKey,
  provider: 'demo' | 'fal',
  durationSeconds = 30,
) {
  const errors: { id: string; message: string }[] = [];
  let costCents = 0;
  for (const q of questions) {
    try {
      assertRenderable(q);
      assertValidChoices(q.choices);
      if (composition === 'las-fijas') assertLasFijasLayout(q);
      if (provider === 'fal') costCents += estimateFalCostCents(durationSeconds);
    } catch (e) {
      errors.push({ id: q.id, message: (e as Error).message });
    }
  }
  return { errors, costCents };
}
