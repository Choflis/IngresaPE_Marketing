import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { assertValidChoices, assertLasFijasLayout, lasFijasPhase } from '../src/lib/video-format';
import { QuestionChoices } from '../src/video/QuestionChoices';
import { lasFijasSample } from '../src/lib/reference-question';

const choices = [
  { label: 'A', text: 'S/100', correct: false },
  { label: 'B', text: 'S/96', correct: true },
  { label: 'C', text: 'S/104', correct: false },
];
const question = {
  statement: 'Un producto de S/100 sube 20% y baja 20%. ¿Precio final?',
  explanation: '100 × 1.20 × 0.80 = 96.',
  choices,
};
describe('formato y respuestas verificadas', () => {
  it('admite el ejemplo revisado con la clave B y su explicación completa', () => {
    expect(() => assertLasFijasLayout(lasFijasSample)).not.toThrow();
  });
  it('rechaza etiquetas duplicadas y alternativas con texto equivalente', () => {
    expect(() => assertValidChoices([choices[0], choices[0], choices[1]])).toThrow(/repet/);
    expect(() => assertValidChoices([choices[0], { ...choices[1], text: ' s/100 ' }])).toThrow(
      /repet/,
    );
  });
  it('rechaza cero o varias claves, sin asumir que A es correcta', () => {
    expect(() => assertValidChoices(choices.map((c) => ({ ...c, correct: false })))).toThrow(
      /correcta/,
    );
    expect(() => assertValidChoices(choices.map((c) => ({ ...c, correct: true })))).toThrow(
      /correcta/,
    );
    expect(assertValidChoices(choices).label).toBe('B');
  });
  it('mantiene la lectura antes de la respuesta y un cierre antes de 30s', () => {
    expect(lasFijasPhase(0)).toBe('intro');
    expect(lasFijasPhase(2)).toBe('question');
    expect(lasFijasPhase(9.99)).toBe('question');
    expect(lasFijasPhase(10)).toBe('answer');
    expect(lasFijasPhase(27)).toBe('outro');
    expect(lasFijasPhase(29.99)).toBe('outro');
  });
  it('rechaza contenido que desbordaría la tarjeta', () => {
    expect(() => assertLasFijasLayout({ ...question, statement: 'x'.repeat(201) })).toThrow(
      /pregunta/i,
    );
    expect(() =>
      assertLasFijasLayout({
        ...question,
        choices: [choices[0], { ...choices[1], text: 'x'.repeat(51) }],
      }),
    ).toThrow(/alternativa/i);
  });
  it('dibuja cada alternativa una vez y solo marca B después de revelar', () => {
    const markup = renderToStaticMarkup(
      React.createElement(QuestionChoices, { choices, reveal: true }),
    );
    expect(markup.match(/data-choice=/g)).toHaveLength(3);
    expect(markup.match(/data-correct="true"/g)).toHaveLength(1);
    expect(markup).toMatch(/data-choice="B" data-correct="true"/);
    const hidden = renderToStaticMarkup(
      React.createElement(QuestionChoices, { choices, reveal: false }),
    );
    expect(hidden).not.toContain('data-correct="true"');
  });
  it('rechaza cinco alternativas largas aunque pasen el límite total de caracteres', () => {
    const q = {
      statement: 'Pregunta '.repeat(18).trim(),
      explanation: 'Explicación breve y revisada.',
      choices: ['A', 'B', 'C', 'D', 'E'].map((label, i) => ({
        label,
        text: `${i} ${'Análisis '.repeat(5)}`.trim().slice(0, 50),
        correct: i === 3,
      })),
    };
    expect(
      q.statement.length + q.choices.reduce((n, c) => n + c.text.length, 0),
    ).toBeLessThanOrEqual(420);
    expect(() => assertLasFijasLayout(q)).toThrow(/espacio|altura|cabe/);
  });
});
