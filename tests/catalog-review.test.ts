import { describe, expect, it } from 'vitest';
import { catalogTemplates } from '../src/lib/template-catalog';
import { reviewProduction } from '../src/lib/production-review';
import type { Template } from '../src/lib/types';

const template: Template = {
  id: 1,
  version_id: 11,
  name: 'Mi formato',
  description: 'Pregunta y explicación',
  kind: 'video',
  accent: '#C80727',
  duration_seconds: 30,
  version: 1,
  composition: 'las-fijas',
};
describe('catálogo sin copias repetidas', () => {
  it('agrupa solo variantes idénticas sin borrar datos ni ocultar una descripción distinta', () => {
    const items = [
      template,
      { ...template, id: 2, version_id: 22 },
      { ...template, id: 3, version_id: 33, description: 'Otra estructura editorial' },
    ];
    expect(catalogTemplates(items).map((t) => t.version_id)).toEqual([11, 33]);
    expect(items).toHaveLength(3);
    expect(catalogTemplates(items, 22).map((t) => t.version_id)).toEqual([22, 33]);
    expect(
      catalogTemplates([template, { ...template, id: 4, version_id: 44, duration_seconds: 15 }]),
    ).toHaveLength(2);
  });
});
describe('revisión recuperable antes de producir', () => {
  it('presenta un error para datos legados repetidos sin lanzar durante render ni reservar', () => {
    const q = {
      id: 'legacy',
      statement: '¿Cuál es el precio final?',
      explanation: 'Aplicamos los porcentajes sucesivos.',
      choices: [
        { label: 'A', text: 'S/96', correct: false },
        { label: 'B', text: 's/96', correct: true },
      ],
    };
    const result = reviewProduction([q], 'las-fijas', 'fal');
    expect(result.errors).toEqual([
      { id: 'legacy', message: 'Hay alternativas repetidas. Revisa las letras y el contenido.' },
    ]);
    expect(result.costCents).toBe(0);
  });
});
