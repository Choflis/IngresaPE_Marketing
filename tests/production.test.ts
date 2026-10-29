import { describe, it, expect } from 'vitest';
import { canSubmitProvider, canRetryJob } from '../src/server/policy';
describe('protección frente a doble generación pagada', () => {
  it('solo envía cuando no existe solicitud previa', () => {
    expect(canSubmitProvider(null)).toBe(true);
    for (const state of ['submitting', 'uncertain', 'submitted', 'succeeded', 'failed'])
      expect(canSubmitProvider({ state })).toBe(false);
  });
  it('rechaza reintento automático de solicitud ambigua', () => {
    expect(canRetryJob('fal', { state: 'uncertain', remote_task_id: null })).toBe(false);
  });
  it('permite recuperar el polling de una tarea conocida', () => {
    expect(canRetryJob('fal', { state: 'submitted', remote_task_id: 'known' })).toBe(true);
  });
  it('rechaza reintentar una generación remota fallida cobrable', () => {
    expect(canRetryJob('fal', { state: 'failed', remote_task_id: 'known' })).toBe(false);
  });
  it('permite reintentar montaje sin otro gasto', () => {
    expect(canRetryJob('fal', { state: 'succeeded', remote_task_id: 'known' })).toBe(true);
    expect(canRetryJob('demo', null)).toBe(true);
  });
});
