export class RequestDeadlineError extends Error {
  constructor() { super('Sunucudan yanıt alınamadı. Bağlantını kontrol edip yeniden dene.'); this.name = 'RequestDeadlineError'; }
}

/** A stalled token, response or response body must release the UI request gate. */
export async function withRequestDeadline<T>(action: (signal: AbortSignal) => Promise<T>, milliseconds = 20_000, upstream?: AbortSignal | null): Promise<T> {
  if (upstream?.aborted) throw upstream.reason ?? new DOMException('İstek iptal edildi.', 'AbortError');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_resolve, reject) => {
    if (!upstream) return;
    onAbort = () => { controller.abort(); reject(upstream.reason ?? new DOMException('İstek iptal edildi.', 'AbortError')); };
    upstream.addEventListener('abort', onAbort, { once: true });
  });
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new RequestDeadlineError());
      controller.abort();
    }, milliseconds);
  });
  try { return await Promise.race([action(controller.signal), deadline, cancelled]); }
  finally { clearTimeout(timer); if (onAbort) upstream?.removeEventListener('abort', onAbort); }
}
