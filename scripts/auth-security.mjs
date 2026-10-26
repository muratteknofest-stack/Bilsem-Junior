import { pathToFileURL } from 'node:url';
import { checkedDeploymentDatabase } from '../shared/supabase-environment.mjs';

/** Unknown/missing values fail closed. No setting or credential is echoed. */
export function assessAuthSecurity(publicSettings, managementSettings) {
  return [
    { code: 'DIRECT_SIGNUP_DISABLED', passed: publicSettings?.disable_signup === true },
    { code: 'EMAIL_CONFIRMATION_REQUIRED', passed: publicSettings?.mailer_autoconfirm === false },
    { code: 'EMAIL_PROVIDER_ENABLED', passed: publicSettings?.external?.email === true },
    { code: 'ANONYMOUS_SIGNIN_DISABLED', passed: publicSettings?.external?.anonymous_users === false },
    { code: 'LEAKED_PASSWORD_PROTECTION_ENABLED', passed: managementSettings?.password_hibp_enabled === true },
  ];
}

async function readSettings(url, headers, fetcher) {
  try {
    const response = await fetcher(url, { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok || !/\bapplication\/json\b/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel(); throw new Error('AUTH_SETTINGS_UNAVAILABLE');
    }
    // Management responses may contain SMTP secrets. Read only in memory and
    // never return the full object or put it in errors/logs.
    return await response.json();
  } catch {
    throw new Error('AUTH_SETTINGS_UNAVAILABLE');
  }
}

export async function checkAuthSecurity(env = process.env, fetcher = fetch) {
  const { publicOrigin } = checkedDeploymentDatabase(env);
  const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!publicKey) throw new Error('PUBLIC_AUTH_CONFIGURATION_MISSING');
  if (!publicKey.startsWith('sb_publishable_')) {
    let role;
    try { role = JSON.parse(Buffer.from(publicKey.split('.')[1] || '', 'base64url').toString('utf8')).role; } catch {}
    if (role !== 'anon') throw new Error('PUBLIC_AUTH_KEY_INVALID');
  }
  const publicSettings = await readSettings(new URL('/auth/v1/settings', publicOrigin), { apikey: publicKey }, fetcher);
  let managementSettings;
  if (env.SUPABASE_ACCESS_TOKEN) {
    const ref = new URL(publicOrigin).hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1];
    if (!ref) throw new Error('AUTH_MANAGEMENT_PROJECT_INVALID');
    managementSettings = await readSettings(new URL(`/v1/projects/${ref}/config/auth`, 'https://api.supabase.com'),
      { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` }, fetcher);
  }
  const checks = assessAuthSecurity(publicSettings, managementSettings);
  return { passed: checks.every(check => check.passed), checks,
    leakedPasswordProtectionVerified: managementSettings?.password_hibp_enabled === true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await checkAuthSecurity();
    for (const check of result.checks) console.log(`${check.passed ? 'PASS' : 'FAIL_OR_UNVERIFIED'} ${check.code}`);
    if (!result.leakedPasswordProtectionVerified) console.log('Leaked-password protection needs authenticated provider verification.');
    process.exitCode = result.passed ? 0 : 1;
  } catch {
    console.error('Auth security verification could not complete. Check the server-side configuration and provider access.');
    process.exitCode = 1;
  }
}
