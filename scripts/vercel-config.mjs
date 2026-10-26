import baseConfig from '../config/vercel-base.json' with { type: 'json' };
import { checkedDeploymentDatabase, checkedSupabaseOrigin, PRODUCTION_SUPABASE_ORIGIN, vercelEnvironment } from '../shared/supabase-environment.mjs';

/** Environment-specific edge routes; no credentials are ever added to headers.
 * @param {Record<string, string | undefined>} env
 */
export function createVercelConfig(env = {}) {
  const config = structuredClone(baseConfig);
  const origin = vercelEnvironment(env) ? checkedDeploymentDatabase(env).serverOrigin
    : checkedSupabaseOrigin(env.SUPABASE_URL || env.VITE_SUPABASE_URL || PRODUCTION_SUPABASE_ORIGIN, env);
  for (const service of ['auth', 'rest']) {
    const rule = config.rewrites.find(/** @param {{source:string}} route */ route => route.source === `/api/supabase/${service}/v1/:path*`);
    if (!rule) throw new Error('Supabase proxy yönlendirmesi eksik.');
    rule.destination = `${origin}/${service}/v1/:path*`;
  }
  const policy = config.headers[0].headers.find(/** @param {{key:string}} header */ header => header.key === 'Content-Security-Policy');
  if (!policy || !/connect-src [^;]+/.test(policy.value)) throw new Error('Supabase bağlantı güvenlik politikası eksik.');
  policy.value = policy.value.replace(/connect-src [^;]+/, `connect-src 'self' ${origin} ${origin.replace('https:', 'wss:')}`);
  return config;
}
