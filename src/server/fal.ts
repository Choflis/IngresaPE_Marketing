import { z } from 'zod';
import { falGenerationSchema, type FalGeneration } from '../lib/fal-contract';
import { getProviderSettings } from './provider-settings';

const queueBase = 'https://queue.fal.run';
const requestBase = `${queueBase}/fal-ai/longcat-video/requests`;
export const falRequestId = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9_-]+$/);
export class FalApiError extends Error {
  constructor(public status: number) {
    super(
      status === 401 || status === 403
        ? 'fal.ai rechazó la clave o sus permisos. Revisa la conexión en Configuración.'
        : status === 402
          ? 'fal.ai no tiene saldo disponible para esta solicitud. Revisa tu cuenta.'
          : `fal.ai respondió HTTP ${status}. Revisa la solicitud en el portal.`,
    );
    this.name = 'FalApiError';
  }
}
export type FalTask = {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  output?: string[];
  failureCode?: string;
};

export function createFalGateway(apiKey: string, transport: typeof fetch = fetch) {
  async function request(url: string, method = 'GET', input?: unknown) {
    const response = await transport(url, {
      method,
      headers: {
        Authorization: `Key ${apiKey}`,
        ...(input ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
      signal: AbortSignal.timeout(45000),
      redirect: 'error',
    });
    if (!response.ok) throw new FalApiError(response.status);
    return response.json();
  }
  return {
    async submit(generation: FalGeneration) {
      const { model, input } = falGenerationSchema.parse(generation);
      // A single POST. A timeout or malformed response may have incurred a charge.
      const response = z
        .object({ request_id: falRequestId })
        .parse(await request(`${queueBase}/${model}`, 'POST', input));
      return { id: response.request_id };
    },
    async poll(id: string): Promise<FalTask> {
      const url = `${requestBase}/${falRequestId.parse(id)}`;
      const state = z
        .object({
          status: z.enum(['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED']),
          error: z.string().nullable().optional(),
          error_type: z.string().nullable().optional(),
        })
        .parse(await request(`${url}/status`));
      if (state.error || state.error_type)
        return { status: 'FAILED', failureCode: state.error_type ?? 'inference_error' };
      if (state.status !== 'COMPLETED') return { status: state.status };
      try {
        const result = z
          .object({ video: z.object({ url: z.url().startsWith('https://') }) })
          .parse(await request(url));
        return { status: 'SUCCEEDED', output: [result.video.url] };
      } catch (e) {
        if (e instanceof FalApiError && e.status === 422)
          return { status: 'FAILED', failureCode: 'inference_error' };
        throw e;
      }
    },
    async cancel(id: string) {
      await request(`${requestBase}/${falRequestId.parse(id)}/cancel`, 'PUT');
    },
  };
}

function gateway() {
  const key = getProviderSettings().apiKey;
  if (!key) throw new FalApiError(401);
  return createFalGateway(key);
}
export const submitFal = (generation: FalGeneration) => gateway().submit(generation);
export const pollFal = (id: string) => gateway().poll(id);
export const cancelFal = (id: string) => gateway().cancel(id);
export function providerError(e: unknown) {
  return e instanceof FalApiError
    ? e.message
    : 'No se pudo confirmar la respuesta de fal.ai. Revisa la solicitud en el portal antes de volver a generar.';
}
