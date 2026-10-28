import RunwayML from '@runwayml/sdk';
import { getProviderSettings } from './provider-settings';
export function runwayClient(apiKey = getProviderSettings().apiKey) {
  if (!apiKey) throw new Error('Falta RUNWAYML_API_SECRET.');
  return new RunwayML({ apiKey, maxRetries: 0, timeout: 45000 });
}
export async function submitAvatar(text: string) {
  return runwayClient().avatarVideos.create({
    model: 'gwm1_avatars',
    avatar: { type: 'custom', avatarId: getProviderSettings().avatarId! },
    speech: { type: 'text', text },
  });
}
export async function pollRunway(id: string) {
  return runwayClient().tasks.retrieve(id);
}
export async function cancelRunway(id: string) {
  await runwayClient().tasks.delete(id);
}
export function providerError(e: unknown) {
  if (e instanceof RunwayML.APIError)
    return `Runway respondió HTTP ${e.status ?? 'desconocido'}. Revisa el saldo y las credenciales en el portal.`;
  return 'No se pudo confirmar la respuesta de Runway. Revisa la tarea en el portal antes de volver a generar.';
}
