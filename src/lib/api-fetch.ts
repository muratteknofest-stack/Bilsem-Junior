import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { apiBaseUrl } from './api-url';
import { createApiTransport, apiRequestUrl } from './api-transport';

const pageOrigin = typeof window === 'undefined' ? 'https://localhost' : window.location.origin;
export function validateApiRequest(input: RequestInfo | URL) {
  return apiRequestUrl(input, apiBaseUrl, pageOrigin);
}
export const apiFetch = createApiTransport({
  baseUrl: apiBaseUrl, pageOrigin,
  browserFetch: (...args) => fetch(...args),
  nativeRequest: Capacitor.isNativePlatform() ? options => CapacitorHttp.request(options) : undefined,
});
