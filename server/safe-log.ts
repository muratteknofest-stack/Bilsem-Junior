// Never log provider error messages, response bodies, authorization headers or request input.
// Restrict codes to recognized categories rather than accepting arbitrary strings.
export function safeErrorMetadata(error: unknown) {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = typeof value.code === 'string' && (/^(?:[0-9]{5}|P[0-9]{4}|PGRST[0-9]{3}|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|RESOURCE_EXHAUSTED)$/.test(value.code)) ? value.code : 'INTERNAL';
  const status = typeof value.status === 'number' && Number.isInteger(value.status) && value.status >= 400 && value.status <= 599 ? value.status : undefined;
  return { code, ...(status ? { status } : {}) };
}
export function logServerFailure(scope: string, error: unknown, requestId?: string) {
  console.error(scope, { ...safeErrorMetadata(error), ...(requestId ? { requestId } : {}) });
}
