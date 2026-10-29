import { describe, it, expect } from 'vitest';
import { questionInput, batchInput, assertRenderable } from '../src/lib/validation';
const valid = {
  statement: '¿Cuánto es dos más dos?',
  explanation: 'Dos más dos es cuatro.',
  courseId: 1,
  topic: 'Operaciones',
  areaIds: [1],
  difficulty: 'basica',
  choices: [
    { label: 'A', text: 'Cuatro', correct: true },
    { label: 'B', text: 'Cinco', correct: false },
  ],
  approved: true,
};
describe('contrato de contenido', () => {
  it('rechaza contenido demasiado extenso para un formato corto', () => {
    expect(() =>
      assertRenderable({ statement: 'x'.repeat(300), explanation: 'Texto', choices: [] }),
    ).toThrow(/extenso/);
  });
  it('acepta una pregunta revisada con una alternativa correcta', () =>
    expect(questionInput.parse(valid).choices).toHaveLength(2));
  it('rechaza varias alternativas correctas', () =>
    expect(() =>
      questionInput.parse({
        ...valid,
        choices: valid.choices.map((c) => ({ ...c, correct: true })),
      }),
    ).toThrow());
  it('rechaza preguntas sin áreas', () =>
    expect(() => questionInput.parse({ ...valid, areaIds: [] })).toThrow());
  it('rechaza etiquetas repetidas', () =>
    expect(() =>
      questionInput.parse({ ...valid, choices: [valid.choices[0], valid.choices[0]] }),
    ).toThrow());
  it('limita el lote y elimina ids duplicados', () => {
    expect(() =>
      batchInput.parse({
        questionIds: Array.from({ length: 26 }, (_, i) => String(i)),
        templateVersionId: 1,
        provider: 'demo',
      }),
    ).toThrow();
  });
});
