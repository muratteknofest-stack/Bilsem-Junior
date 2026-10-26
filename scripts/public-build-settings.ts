import { checkedSupabaseOrigin } from '../shared/supabase-environment.mjs';
type Settings = Record<string, string | undefined>;

function publicOrigin(value: string, name: string, production: boolean): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && !production && url.protocol === 'http:')) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
    return url.origin;
  } catch { throw new Error(`${name}: geçerli ve güvenli bir servis adresi girin.`); }
}

function publishableKey(key: string): string {
  if (!key || /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return key;
  try {
    const parts = key.split('.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (parts.length === 3 && claims.role === 'anon') return key;
  } catch { /* Secrets and arbitrary credentials must never reach the bundle. */ }
  throw new Error('Tarayıcı için yalnızca Supabase publishable veya anon anahtarı kullanılabilir.');
}

/** Exact names only: prefixes also expose accidental *_SECRET or *_TOKEN settings. */
export function publicBuildSettings(env: Settings, production: boolean, onVercel: boolean, siteOrigin: string) {
  const supabaseUrl = publicOrigin(env.VITE_SUPABASE_URL || '', 'Supabase URL', production);
  if (onVercel || env.VERCEL_ENV) checkedSupabaseOrigin(supabaseUrl, { ...env, ...(onVercel ? { VERCEL: '1' } : {}) });
  return {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey(env.VITE_SUPABASE_PUBLISHABLE_KEY || ''),
    VITE_API_BASE_URL: onVercel ? '' : publicOrigin(env.VITE_API_BASE_URL || '', 'API URL', production),
    VITE_PUBLIC_SITE_URL: publicOrigin(siteOrigin, 'Site URL', production),
  };
}
