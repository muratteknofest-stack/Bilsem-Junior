import { auth } from './supabase';

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export function apiUrl(path: string): string {
  return apiBaseUrl && path.startsWith('/api/') ? `${apiBaseUrl}${path}` : path;
}
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Bu işlem için giriş yapmalısınız.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const url = typeof input === 'string' ? apiUrl(input) : input;
  return fetch(url, { ...init, headers, credentials: apiBaseUrl ? 'omit' : 'same-origin' });
}
