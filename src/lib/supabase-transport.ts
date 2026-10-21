import { withRequestDeadline } from './request-deadline';

interface SupabaseTransportOptions {
  supabaseUrl: string;
  apiBaseUrl: string;
  pageOrigin: string;
  relayFetch: typeof fetch;
  timeoutMs?: number;
}

/**
 * Keep the real project URL (session storage, issuer and recovery links), while
 * Auth/PostgREST HTTP requests use the app's fixed Vercel reverse proxy.
 * There is no direct-request retry: a token rotation may already be committed.
 */
export function createSupabaseTransport(options: SupabaseTransportOptions): typeof fetch {
  const project = new URL(options.supabaseUrl);
  const api = new URL(options.apiBaseUrl || options.pageOrigin);
  if (project.protocol !== 'https:' || project.username || project.password || project.pathname !== '/' || project.search || project.hash) {
    throw new Error('Supabase bağlantı adresi doğrulanamadı.');
  }
  if (api.username || api.password || api.pathname !== '/' || api.search || api.hash ||
      (api.protocol !== 'https:' && !(['localhost', '127.0.0.1'].includes(api.hostname) && api.protocol === 'http:'))) {
    throw new Error('Uygulama bağlantı adresi doğrulanamadı.');
  }

  return async (input, init) => {
    const request = new Request(input, init);
    const original = new URL(request.url);
    if (original.origin !== project.origin || original.username || original.password || original.hash ||
        !/^\/(?:auth|rest)\/v1\//.test(original.pathname)) {
      throw new Error('Supabase isteği doğrulanamadı.');
    }
    if (request.signal.aborted) throw request.signal.reason ?? new DOMException('İstek iptal edildi.', 'AbortError');
    const target = new URL('/api/supabase' + original.pathname + original.search, api);
    const headers = new Headers(request.headers);
    // Session credentials travel only in SDK bearer headers, never site cookies.
    for (const name of ['cookie', 'host', 'origin', 'referer', 'sb-forwarded-for']) headers.delete(name);

    return withRequestDeadline(async deadline => {
      const cancellation = new AbortController();
      const abortOriginal = () => cancellation.abort(request.signal.reason);
      const abortDeadline = () => cancellation.abort(deadline.reason);
      request.signal.addEventListener('abort', abortOriginal, { once: true });
      deadline.addEventListener('abort', abortDeadline, { once: true });
      let rejectAbort: () => void = () => {};
      const aborted = new Promise<never>((_resolve, reject) => {
        rejectAbort = () => reject(cancellation.signal.reason ?? new DOMException('İstek iptal edildi.', 'AbortError'));
        cancellation.signal.addEventListener('abort', rejectAbort, { once: true });
      });
      if (request.signal.aborted) abortOriginal();
      if (deadline.aborted) abortDeadline();
      try {
        // Own the cancellation relationship directly. A temporary intermediate
        // Request can be collected while its dependent AbortSignal is in use.
        // Buffer small Auth/PostgREST bodies inside the same bounded request;
        // this also avoids streaming-request differences across WebViews.
        const requestBody = ['GET', 'HEAD'].includes(request.method) ? undefined
          : await Promise.race([request.arrayBuffer(), aborted]);
        const forwarded = new Request(target, {
          method: request.method, body: requestBody, headers,
          credentials: 'omit', redirect: 'error', cache: 'no-store', signal: cancellation.signal,
        });
        // Await response bodies too: auth/profile JSON can stall after headers.
        const response = await Promise.race([options.relayFetch(forwarded), aborted]);
        if (request.method === 'HEAD' || [204, 205, 304].includes(response.status)) return response;
        const body = await Promise.race([response.arrayBuffer(), aborted]);
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete('content-encoding'); responseHeaders.delete('content-length');
        return new Response(body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
      } finally {
        request.signal.removeEventListener('abort', abortOriginal);
        deadline.removeEventListener('abort', abortDeadline);
        cancellation.signal.removeEventListener('abort', rejectAbort);
      }
    }, options.timeoutMs ?? 10000);
  };
}
