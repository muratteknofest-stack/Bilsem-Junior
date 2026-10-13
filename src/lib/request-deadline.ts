export class RequestDeadlineError extends Error {
  constructor() { super('Sunucudan yanıt alınamadı. Bağlantını kontrol edip yeniden dene.'); this.name = 'RequestDeadlineError'; }
}

/** A stalled token, response or response body must release the UI request gate. */
export async function withRequestDeadline<T>(action: (signal: AbortSignal) => Promise<T>, milliseconds = 20_000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new RequestDeadlineError());
      controller.abort();
    }, milliseconds);
  });
  try { return await Promise.race([action(controller.signal), deadline]); }
  finally { clearTimeout(timer); }
}
