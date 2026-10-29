type ProviderRequest = { state: string; remote_task_id?: string | null };
export function canSubmitProvider(request: ProviderRequest | null) {
  return request === null;
}
export function canRetryJob(provider: string, request: ProviderRequest | null) {
  if (provider === 'demo') return true;
  if (provider !== 'fal') return false;
  if (!request) return true;
  return Boolean(request.remote_task_id) && ['submitted', 'succeeded'].includes(request.state);
}
