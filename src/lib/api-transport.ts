import type { HttpOptions, HttpResponse } from '@capacitor/core';

interface TransportOptions {
  baseUrl: string;
  pageOrigin: string;
  nativeRequest?: (options: HttpOptions) => Promise<HttpResponse>;
  browserFetch: typeof fetch;
  timeoutMs?: number;
}

/** Only the configured API receives account tokens, on both web and Android. */
export function apiRequestUrl(input: RequestInfo | URL, baseUrl: string, pageOrigin: string): string {
  const raw = input instanceof Request ? input.url : String(input);
  const base = new URL(baseUrl || pageOrigin);
  const url = new URL(raw, base);
  if (url.origin !== base.origin || !url.pathname.startsWith('/api/') || url.username || url.password || url.hash) {
    throw new Error('İstek adresi doğrulanamadı.');
  }
  return url.href;
}

/** Native networking is explicit; browser CORS and server bearer checks stay intact. */
export function createApiTransport(options: TransportOptions) {
  return async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = apiRequestUrl(input, options.baseUrl, options.pageOrigin);
    if (!options.nativeRequest) {
      const target = options.baseUrl ? (input instanceof Request ? new Request(url, input) : url) : input;
      return options.browserFetch(target, {
        ...init, credentials: options.baseUrl ? 'omit' : 'same-origin',
      });
    }
    if (new URL(url).protocol !== 'https:') throw new Error('Güvenli sunucu bağlantısı gerekli.');
    const request = new Request(input instanceof Request ? new Request(url, input) : url, init);
    const signal = init.signal || request.signal;
    if (signal.aborted) throw signal.reason ?? new DOMException('İstek iptal edildi.', 'AbortError');
    const headers = new Headers(request.headers);
    // Native requests identify themselves naturally; never impersonate a web origin.
    for (const name of ['origin', 'referer', 'cookie', 'host']) headers.delete(name);
    for (const name of [...headers.keys()]) if (name.startsWith('sec-fetch-')) headers.delete(name);
    const method = request.method;
    let data: unknown;
    if (!['GET', 'HEAD'].includes(method) && request.body !== null) {
      const text = await request.text();
      if (text) {
        if (!headers.get('content-type')?.includes('application/json')) throw new Error('Bu işlem JSON biçiminde gönderilmelidir.');
        data = JSON.parse(text);
      }
    }
    // No automatic retries: an interrupted registration/answer may already be saved.
    return new Promise<Response>((resolve, reject) => {
      let settled = false;
      const finish = (action: () => void) => {
        if (settled) return;
        settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort); action();
      };
      const abort = () => finish(() => reject(signal.reason ?? new DOMException('İstek iptal edildi.', 'AbortError')));
      const timer = setTimeout(() => finish(() => reject(new DOMException('Sunucu yanıtı gecikti. Bağlantınızı kontrol edin.', 'TimeoutError'))), options.timeoutMs ?? 45000);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) { abort(); return; }
      Promise.resolve().then(() => {
        if (settled) return;
        return options.nativeRequest!({
          url, method, headers: Object.fromEntries(headers), data,
          connectTimeout: 10000, readTimeout: 45000, disableRedirects: true, responseType: 'text',
        });
      }).then(result => {
        if (settled || !result) return;
        try {
          if (result.url && new URL(result.url).origin !== new URL(url).origin) throw new Error('Sunucu yönlendirmesi doğrulanamadı.');
          const responseHeaders = new Headers(result.headers);
          responseHeaders.delete('content-encoding'); responseHeaders.delete('content-length');
          const body = ['HEAD'].includes(method) || [204, 205, 304].includes(result.status) ? null
            : typeof result.data === 'string' ? result.data : JSON.stringify(result.data ?? null);
          const response = new Response(body, { status: result.status, headers: responseHeaders });
          finish(() => resolve(response));
        } catch (error) { finish(() => reject(error)); }
      }, () => finish(() => reject(new TypeError('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'))));
    });
  };
}
