/** Store links must never become arbitrary redirects from billing responses. */
export function safePlayStoreUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === 'https://play.google.com' && !url.username && !url.password && !url.hash
      && url.pathname === '/store/apps/details' && [...url.searchParams.keys()].length === 1
      && /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(url.searchParams.get('id') || '');
  } catch { return false; }
}
