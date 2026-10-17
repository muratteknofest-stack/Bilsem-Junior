import { auth } from './supabase';

import { apiFetch, validateApiRequest } from './api-fetch';
export { apiUrl } from './api-url';
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  validateApiRequest(input);
  const user = auth.currentUser;
  if (!user) throw new Error('Bu işlem için giriş yapmalısınız.');
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return apiFetch(input, { ...init, headers });
}

