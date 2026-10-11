import { auth } from './supabase';

import { apiBaseUrl, apiUrl } from './api-url';
export { apiUrl } from './api-url';
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Bu işlem için giriş yapmalısınız.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const url = typeof input === 'string' ? apiUrl(input) : input;
  return fetch(url, { ...init, headers, credentials: apiBaseUrl ? 'omit' : 'same-origin' });
}

