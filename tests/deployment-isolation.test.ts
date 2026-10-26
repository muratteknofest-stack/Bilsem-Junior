import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { checkedDeploymentDatabase, checkedSupabaseOrigin, PRODUCTION_SUPABASE_ORIGIN, vercelEnvironment } from '../shared/supabase-environment.mjs';
import { createVercelConfig } from '../scripts/vercel-config.mjs';
import { publicBuildSettings } from '../scripts/public-build-settings';
import { getServiceClient } from '../server/supabase-admin';
import { buildContentSecurityPolicy } from '../server/browser-security';
import { createApiApp } from '../server/api-app';

const previewOrigin = 'https://abcdefghijklmnopqrst.supabase.co';
const previewEnv = {
  VERCEL: '1', VERCEL_ENV: 'preview', SUPABASE_URL: previewOrigin, VITE_SUPABASE_URL: previewOrigin,
  SUPABASE_SERVICE_ROLE_KEY: 'fixture-server-key', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
};
const productionEnv = { ...previewEnv, VERCEL_ENV: 'production',
  SUPABASE_URL: PRODUCTION_SUPABASE_ORIGIN, VITE_SUPABASE_URL: PRODUCTION_SUPABASE_ORIGIN };
const legacyKey = (ref: string, role = 'service_role') =>
  `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ ref, role })).toString('base64url')}.fixture-signature`;

function installEnvironment(values: NodeJS.ProcessEnv) {
  const keys = new Set(['VERCEL', 'VERCEL_ENV', 'SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'NODE_ENV']);
  const previous = Object.fromEntries([...keys].map(key => [key, process.env[key]]));
  for (const key of keys) {
    if (values[key] === undefined) delete process.env[key]; else process.env[key] = values[key];
  }
  return () => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  };
}

test('Vercel previews and development reject the production database and missing environment metadata', () => {
  assert.equal(vercelEnvironment({}), null);
  for (const target of ['preview', 'development']) {
    assert.throws(() => checkedDeploymentDatabase({ ...productionEnv, VERCEL_ENV: target }), /ayrı bir Supabase/);
  }
  for (const target of [undefined, 'staging', 'Production']) {
    assert.throws(() => vercelEnvironment({ VERCEL: '1', VERCEL_ENV: target }), /VERCEL_ENV/);
  }
  assert.throws(() => checkedDeploymentDatabase({ ...previewEnv, VERCEL_ENV: 'production' }), /beklenen hedef/);
});

test('nonproduction targets cannot conceal production behind paths, credentials, ports or aliases', () => {
  for (const origin of [
    'http://abcdefghijklmnopqrst.supabase.co', `${previewOrigin}/auth/v1`, `${previewOrigin}?project=other`,
    `${previewOrigin}#fragment`, 'https://fixture-secret@abcdefghijklmnopqrst.supabase.co',
    'https://abcdefghijklmnopqrst.supabase.co:8443', 'https://db.example.test',
    'https://localhost', `${previewOrigin} `, 'https://vtcsoqohkiagbwatlabk.supabase.co.attacker.test',
  ]) assert.throws(() => checkedSupabaseOrigin(origin, previewEnv), error =>
    error instanceof Error && !error.message.includes('fixture-secret'));
  assert.equal(checkedSupabaseOrigin(`${previewOrigin}/`, previewEnv), previewOrigin);
  assert.equal(checkedSupabaseOrigin('http://127.0.0.1:54321', {}), 'http://127.0.0.1:54321');
});

test('server/browser projects and legacy key project references must agree', () => {
  assert.deepEqual(checkedDeploymentDatabase(previewEnv, { requireServerKey: true }),
    { serverOrigin: previewOrigin, publicOrigin: previewOrigin });
  assert.throws(() => checkedDeploymentDatabase({ ...previewEnv, VITE_SUPABASE_URL: 'https://bcdefghijklmnopqrstu.supabase.co' }), /eşleşmiyor/);
  assert.throws(() => checkedDeploymentDatabase({ ...previewEnv, SUPABASE_SERVICE_ROLE_KEY: '' }, { requireServerKey: true }), /anahtarı eksik/);
  assert.throws(() => checkedDeploymentDatabase({ ...previewEnv, VITE_SUPABASE_PUBLISHABLE_KEY: '' }), /istemci anahtarı eksik/);
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
    const credential = legacyKey('vtcsoqohkiagbwatlabk', key.startsWith('VITE_') ? 'anon' : 'service_role');
    assert.throws(() => checkedDeploymentDatabase({ ...previewEnv, [key]: credential }), error =>
      error instanceof Error && /eşleşmiyor/.test(error.message) && !error.message.includes(credential));
  }
  assert.doesNotThrow(() => checkedDeploymentDatabase({ ...previewEnv,
    SUPABASE_SERVICE_ROLE_KEY: legacyKey('abcdefghijklmnopqrst'),
    VITE_SUPABASE_PUBLISHABLE_KEY: legacyKey('abcdefghijklmnopqrst', 'anon'),
  }));
});

test('production config retains existing routes, cookie stripping, headers and function settings', () => {
  const template = JSON.parse(readFileSync('config/vercel-base.json', 'utf8'));
  assert.deepEqual(createVercelConfig(productionEnv), template);
  assert.deepEqual(createVercelConfig({}), template);
});

test('isolated preview rewrites and CSP contain only its own database origin and no credentials', () => {
  const config = createVercelConfig(previewEnv);
  for (const service of ['auth', 'rest']) {
    assert.equal(config.rewrites.find(rule => rule.source === `/api/supabase/${service}/v1/:path*`)?.destination,
      `${previewOrigin}/${service}/v1/:path*`);
  }
  const policy = config.headers[0].headers.find(header => header.key === 'Content-Security-Policy')!.value;
  assert.equal(policy, buildContentSecurityPolicy(previewOrigin));
  const serialized = JSON.stringify(config);
  for (const forbidden of [PRODUCTION_SUPABASE_ORIGIN, 'fixture-server-key', 'sb_publishable_fixture', '*.supabase.co']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(config.routes, createVercelConfig(productionEnv).routes);
  assert.equal(config.headers.find(rule => rule.source === '/api/supabase/:path*')?.headers
    .find(header => header.key === 'Cache-Control')?.value, 'private, no-store, max-age=0');
});

test('routing and Vite both reject unsafe previews rather than falling back to production', () => {
  const unsafe = { ...productionEnv, VERCEL_ENV: 'preview' };
  assert.throws(() => createVercelConfig(unsafe), /ayrı bir Supabase/);
  assert.throws(() => publicBuildSettings(unsafe, true, true, 'https://bilsemjunior.vercel.app'), /ayrı bir Supabase/);
  const settings = publicBuildSettings(previewEnv, true, true, 'https://bilsemjunior.vercel.app');
  assert.equal(settings.VITE_SUPABASE_URL, previewOrigin);
  assert.deepEqual(Object.keys(settings).sort(), ['VITE_API_BASE_URL', 'VITE_PUBLIC_SITE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL']);
});

test('preflight rejects unsafe configuration before connectivity tests and does not print credentials', () => {
  const result = spawnSync(process.execPath, ['scripts/check-deployment-environment.mjs'], {
    env: { ...process.env, ...productionEnv, VERCEL_ENV: 'preview', SUPABASE_SERVICE_ROLE_KEY: 'fixture-private-never-print' }, encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ayrı bir Supabase/);
  assert.equal((result.stdout + result.stderr).includes('fixture-private-never-print'), false);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['vercel-build'].split('&&')[0].trim(), 'node scripts/check-deployment-environment.mjs');
  const accepted = spawnSync(process.execPath, ['scripts/check-deployment-environment.mjs'], {
    env: { ...process.env, ...previewEnv }, encoding: 'utf8',
  });
  assert.equal(accepted.status, 0, accepted.stderr);
});

test('actual vercel.ts entry point exports isolated routes and rejects production-backed previews', () => {
  const command = "import {config} from './vercel.ts'; console.log(JSON.stringify(config));";
  const accepted = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', command], {
    env: { ...process.env, ...previewEnv }, encoding: 'utf8',
  });
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.deepEqual(JSON.parse(accepted.stdout), createVercelConfig(previewEnv));
  const rejected = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', command], {
    env: { ...process.env, ...productionEnv, VERCEL_ENV: 'preview' }, encoding: 'utf8',
  });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /ayrı bir Supabase/);
  const missing = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', command], {
    env: { ...process.env, ...productionEnv, VERCEL: '', VERCEL_ENV: '' }, encoding: 'utf8',
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /VERCEL_ENV/);
});

test('runtime blocks production-backed previews before any provider request and uses only the isolated project', async () => {
  const restore = installEnvironment({ ...productionEnv, VERCEL_ENV: 'preview' });
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async input => {
    calls++;
    assert.equal(new URL(String(input)).origin, previewOrigin);
    return Response.json([]);
  };
  try {
    assert.throws(() => getServiceClient(), /ayrı bir Supabase/);
    assert.equal(calls, 0);
    Object.assign(process.env, previewEnv);
    const result = await getServiceClient().from('profiles').select('id').limit(1);
    assert.equal(result.error, null);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; restore(); }
});

test('preview HTTP headers use the isolated project and unsafe runtime configuration cannot reach production', async () => {
  for (const safe of [true, false]) {
    const restore = installEnvironment({ ...(safe ? previewEnv : productionEnv), VERCEL_ENV: 'preview', NODE_ENV: 'production' });
    const originalFetch = globalThis.fetch;
    let providerCalls = 0;
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname === '127.0.0.1') return originalFetch(input, init);
      providerCalls++; throw Error('External network forbidden in this test');
    };
    const server = createApiApp().listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.on('listening', resolve));
    try {
      const path = safe ? '/api/account/requests' : '/api/health';
      const response = await originalFetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`);
      assert.equal(response.status, safe ? 401 : 503);
      const policy = response.headers.get('content-security-policy') || '';
      assert.equal(policy.includes(PRODUCTION_SUPABASE_ORIGIN), false);
      if (safe) assert.ok(policy.includes(previewOrigin));
      assert.equal(providerCalls, 0);
      await response.arrayBuffer();
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
      globalThis.fetch = originalFetch; restore();
    }
  }
});
