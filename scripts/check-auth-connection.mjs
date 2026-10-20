import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const url = new URL(process.env.VITE_SUPABASE_URL || '');
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key, 'Public Supabase key is required');
if (!key.startsWith('sb_publishable_')) {
  const claims = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString('utf8'));
  assert.equal(claims.role, 'anon', 'Only a public API key may be used by the browser');
}
if (process.env.SUPABASE_URL) assert.equal(new URL(process.env.SUPABASE_URL).origin, url.origin, 'Server and browser projects must agree');
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
for (const service of ['auth', 'rest']) {
  const rule = config.rewrites.find(item => item.source === `/api/supabase/${service}/v1/:path*`);
  assert.equal(new URL(rule.destination.replace(':path*', '')).origin, url.origin, 'Proxy project and public SDK project must agree');
}
const boundedFetch = (input, init = {}) => fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000), cache: 'no-store' });
const settings = await boundedFetch(new URL('/auth/v1/settings', url), { headers: { apikey: key } });
assert.equal(settings.status, 200, 'Configured public key must reach Auth settings');
assert.match(settings.headers.get('content-type') || '', /json/);
await settings.json();

// Empty credentials validate the password endpoint without attempting any account.
const password = await boundedFetch(new URL('/auth/v1/token?grant_type=password', url), {
  method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: '{}',
});
assert.ok([400, 422].includes(password.status), 'Password endpoint must return a credential validation error, not a network/key error');
const failure = await password.json();
assert.ok(failure && typeof failure === 'object' && (failure.error || failure.msg || failure.message || failure.error_code));

// A real Data API query checks reachability without reading an account's data.
const publicRead = await boundedFetch(new URL('/rest/v1/profiles?select=id&limit=1', url), { headers: { apikey: key } });
assert.ok([200, 401, 403].includes(publicRead.status), 'Profile API must be reachable');
if (publicRead.status === 200) {
  const rows = await publicRead.json();
  assert.ok(Array.isArray(rows) && rows.length === 0, 'Anonymous profile reads must not expose accounts');
}

const client = createClient(url.href, key, {
  global: { fetch: boundedFetch },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const rejected = await client.auth.getUser('not-a-session-token');
assert.ok(rejected.error && [401, 403].includes(rejected.error.status), 'Invalid session must remain rejected');
console.log('Auth connectivity verified: public configuration, password validation, Data API isolation and invalid-session rejection.');
