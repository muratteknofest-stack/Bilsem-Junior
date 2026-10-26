// This identifier is public configuration, not a credential. Changing the
// production database requires a reviewed code change as well as new settings.
export const PRODUCTION_SUPABASE_ORIGIN = 'https://vtcsoqohkiagbwatlabk.supabase.co';

/** @param {Record<string, string | undefined>} env */
export function vercelEnvironment(env) {
  if (env.VERCEL !== '1' && !env.VERCEL_ENV) return null;
  if (!['production', 'preview', 'development'].includes(env.VERCEL_ENV || '')) {
    throw new Error('Vercel ortamı doğrulanamadı. VERCEL_ENV ayarını kontrol edin.');
  }
  return env.VERCEL_ENV;
}

/**
 * Check before constructing a client, starting connectivity checks or emitting
 * proxy routes. Preview URLs must be canonical Supabase project URLs, so a
 * custom hostname cannot conceal the production project.
 * @param {string} value
 * @param {Record<string, string | undefined>} env
 */
export function checkedSupabaseOrigin(value, env = {}) {
  const target = vercelEnvironment(env);
  let url;
  try {
    url = new URL(value);
    const local = !target && env.NODE_ENV !== 'production' && url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((!local && url.protocol !== 'https:') || url.username || url.password || (!local && url.port)
      || url.pathname !== '/' || url.search || url.hash || value.trim() !== value) throw Error();
  } catch { throw new Error('Supabase bağlantı adresi güvenli bir servis kökü olmalıdır.'); }
  if (target === 'production' && url.origin !== PRODUCTION_SUPABASE_ORIGIN) {
    throw new Error('Production Supabase projesi beklenen hedefle eşleşmiyor.');
  }
  if (target && target !== 'production' && (url.origin === PRODUCTION_SUPABASE_ORIGIN
    || !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url.origin))) {
    throw new Error('Preview/development için üretimden ayrı bir Supabase projesi gereklidir.');
  }
  return url.origin;
}

/** Configuration sanity check only: JWT metadata here never authenticates a user.
 * @param {string} key
 * @param {string} origin
 */
export function checkLegacyKeyProject(key, origin) {
  if (!key.startsWith('eyJ')) return;
  try {
    const parts = key.split('.');
    const claims = JSON.parse(Buffer.from(parts[1] || '', 'base64url').toString('utf8'));
    if (parts.length !== 3 || typeof claims.ref !== 'string'
      || new URL(origin).hostname !== `${claims.ref}.supabase.co`) throw Error();
  } catch { throw new Error('Supabase anahtarı seçilen projeyle eşleşmiyor.'); }
}

/** @param {Record<string, string | undefined>} env
 * @param {{ requireServerKey?: boolean }} options
 */
export function checkedDeploymentDatabase(env, { requireServerKey = false } = {}) {
  const serverOrigin = checkedSupabaseOrigin(env.SUPABASE_URL || '', env);
  const publicOrigin = checkedSupabaseOrigin(env.VITE_SUPABASE_URL || '', env);
  if (serverOrigin !== publicOrigin) throw new Error('Sunucu ve istemci Supabase projeleri eşleşmiyor.');
  if (vercelEnvironment(env) && !env.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase açık istemci anahtarı eksik.');
  if (requireServerKey && !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase sunucu anahtarı eksik.');
  checkLegacyKeyProject(env.SUPABASE_SERVICE_ROLE_KEY || '', serverOrigin);
  checkLegacyKeyProject(env.VITE_SUPABASE_PUBLISHABLE_KEY || '', publicOrigin);
  return { serverOrigin, publicOrigin };
}
