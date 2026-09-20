import { getToken } from 'firebase/app-check';
import { appCheck, auth } from './firebase';

const env = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : ((process.env as Record<string, string | undefined>) || {});
const apiBaseUrl = String(env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function resolveApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!apiBaseUrl || typeof input !== 'string' || !input.startsWith('/api/')) return input;
  return `${apiBaseUrl}${input}`;
}

async function appCheckHeaders(init: RequestInit): Promise<Headers> {
  const headers = new Headers(init.headers);
  if (appCheck) {
    const appCheckToken = await getToken(appCheck);
    headers.set('X-Firebase-AppCheck', appCheckToken.token);
  }
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return headers;
}

export async function appCheckedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = await appCheckHeaders(init);

  return fetch(resolveApiUrl(input), {
    ...init,
    headers,
    credentials: apiBaseUrl ? 'omit' : 'same-origin',
  });
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Bu işlem için giriş yapmalısınız.');

  const headers = await appCheckHeaders(init);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);

  return fetch(resolveApiUrl(input), {
    ...init,
    headers,
    credentials: apiBaseUrl ? 'omit' : 'same-origin',
  });
}
