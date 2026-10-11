const apiBaseUrl = String(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
export function apiUrl(path: string): string {
  return apiBaseUrl && path.startsWith('/api/') ? `${apiBaseUrl}${path}` : path;
}
export { apiBaseUrl };
