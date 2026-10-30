import { describe, expect, it } from 'vitest';
import { buildNarrationScript, planNarration } from '../src/lib/narration';
import { voiceSelectionSchema } from '../src/lib/voices';
import { lasFijasSample } from '../src/lib/reference-question';
import { lasFijasPhase } from '../src/lib/video-format';

describe('guion y sincronización de narración', () => {
  it('lee alternativas una vez y revela la clave revisada B con su explicación', () => {
    const script = buildNarrationScript(lasFijasSample);
    expect(script.intro).toBe('¡Esta es una fija para la UNSA!');
    expect(script.question.match(/Alternativa [ABCD]/g)).toHaveLength(4);
    expect(script.question).not.toContain('correcta');
    expect(script.answer).toContain('La respuesta correcta es B: 96 soles.');
    expect(script.answer).toContain('Los porcentajes se aplican sobre precios distintos.');
    expect(script.answer).toContain('por');
    expect(() => buildNarrationScript({ ...lasFijasSample, choices: [] })).toThrow();
    expect(() =>
      buildNarrationScript({
        ...lasFijasSample,
        choices: [lasFijasSample.choices[0], lasFijasSample.choices[0]],
      }),
    ).toThrow(/repet/);
  });
  it('ordena segmentos sin pisarse, deja pensar y conserva exactamente 30 segundos', () => {
    const p = planNarration({ intro: 3.28, question: 9, answer: 8, outro: 2.3 }, 30);
    expect(p.speed).toBe(1);
    expect(p.totalFrames).toBe(900);
    expect(p.cues.question.startFrame).toBe(103);
    expect(
      p.cues.answer.startFrame - (p.cues.question.startFrame + p.cues.question.durationFrames),
    ).toBeGreaterThanOrEqual(60);
    expect(p.cues.answer.startFrame + p.cues.answer.durationFrames).toBeLessThan(
      p.cues.outro.startFrame,
    );
    expect(p.cues.outro.startFrame + p.cues.outro.durationFrames).toBeLessThanOrEqual(900);
    expect(lasFijasPhase(p.timing.answerAt - 1 / 30, p.timing)).toBe('question');
    expect(lasFijasPhase(p.timing.answerAt, p.timing)).toBe('answer');
    expect(lasFijasPhase(p.timing.outroAt, p.timing)).toBe('outro');
  });
  it('limita la aceleración y rechaza una voz larga sin cortarla', () => {
    const p = planNarration({ intro: 3, question: 13, answer: 12, outro: 3 }, 30);
    expect(p.speed).toBeGreaterThan(1);
    expect(p.speed).toBeLessThanOrEqual(1.25);
    expect(() => planNarration({ intro: 3, question: 20, answer: 20, outro: 3 }, 30)).toThrow(
      /acorta/i,
    );
    for (const n of [0, -1, NaN, Infinity])
      expect(() => planNarration({ intro: n, question: 5, answer: 5, outro: 2 }, 30)).toThrow();
  });
  it('solo admite las cuatro voces elegidas', () => {
    for (const name of ['Puck', 'Sadachbia', 'Achird', 'Fenrir'])
      expect(voiceSelectionSchema.parse({ provider: 'gemini', name }).name).toBe(name);
    expect(() => voiceSelectionSchema.parse({ provider: 'runway', name: 'Adrian' })).toThrow();
  });
});
