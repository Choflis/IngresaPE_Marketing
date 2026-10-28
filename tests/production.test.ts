import { describe, it, expect } from 'vitest';
import { canSubmitProvider, canRetryJob } from '../src/server/policy';
describe('protección frente a doble generación pagada', () => {
  it('solo envía cuando no existe solicitud previa', () => {
    expect(canSubmitProvider(null)).toBe(true);
    for (const state of ['submitting', 'uncertain', 'submitted', 'succeeded', 'failed'])
      expect(canSubmitProvider({ state })).toBe(false);
  });
  it('rechaza reintento automático de solicitud ambigua', () => {
    expect(canRetryJob('runway', { state: 'uncertain', remote_task_id: null })).toBe(false);
  });
  it('permite recuperar el polling de una tarea conocida', () => {
    expect(canRetryJob('runway', { state: 'submitted', remote_task_id: 'known' })).toBe(true);
  });
  it('rechaza reintentar una generación remota fallida cobrable', () => {
    expect(canRetryJob('runway', { state: 'failed', remote_task_id: 'known' })).toBe(false);
  });
  it('permite reintentar montaje sin otro gasto', () => {
    expect(canRetryJob('runway', { state: 'succeeded', remote_task_id: 'known' })).toBe(true);
    expect(canRetryJob('demo', null)).toBe(true);
  });
});
