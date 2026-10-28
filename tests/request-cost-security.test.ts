import test from 'node:test';
import { registrationReadySettings } from './fixtures/launch-settings';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Response as ExpressResponse } from 'express';
import { createCachedRead } from '../server/cached-read';
import { createApiApp } from '../server/api-app';
import { createRequestLimits } from '../server/request-limits';
import { sharedRateLimit } from '../server/shared-rate-limit';
import type { AuthenticatedRequest } from '../server/security';
import { defaultPlatformSettings } from '../src/lib/platform-settings';

test('parallel public reads share one probe and refresh only after the bounded TTL', async () => {
  let now = 0, reads = 0;
  const cache = createCachedRead(async () => ({ revision: ++reads }), 5000, 1000, () => now);
  const results = await Promise.all(Array.from({ length: 20 }, () => cache.get()));
  assert.equal(reads, 1); assert.ok(results.every(value => value.revision === 1));
  now = 4999; assert.equal((await cache.get()).revision, 1); assert.equal(reads, 1);
  now = 5000; assert.equal((await cache.get()).revision, 2); assert.equal(reads, 2);
});

test('failed refresh never serves expired success and failure backoff prevents repeated provider reads', async () => {
  let now = 0, reads = 0, unavailable = false;
  const cache = createCachedRead(async () => { reads++; if (unavailable) throw new Error('fixture-private-error'); return reads; }, 5000, 1000, () => now);
  assert.equal(await cache.get(), 1);
  now = 5000; unavailable = true;
  for (let i = 0; i < 5; i++) await assert.rejects(cache.get());
  assert.equal(reads, 2);
  now = 5999; await assert.rejects(cache.get()); assert.equal(reads, 2);
  now = 6000; unavailable = false; assert.equal(await cache.get(), 3);
});

test('invalidating an in-flight public read cannot let its late result replace a newer revision', async () => {
  const pending: Array<(value: number) => void> = [];
  const cache = createCachedRead(() => new Promise<number>(resolve => pending.push(resolve)), 5000);
  const old = cache.get(); await Promise.resolve();
  cache.clear(); const fresh = cache.get(); await Promise.resolve();
  pending[1](2); assert.equal(await fresh, 2);
  pending[0](1); assert.equal(await old, 1);
  assert.equal(await cache.get(), 2);
});

test('request policies cannot disable the gate through invalid configuration', () => {
  for (const apiPerMinute of [0, -1, 0.5, Infinity, 10_001]) assert.throws(() => createRequestLimits({ apiPerMinute }));
});

async function fixture(options: { limits?: { apiPerMinute?: number; publicPerMinute?: number }; healthFailure?: boolean;
  settingsFailure?: boolean } = {}) {
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL', 'VERCEL_ENV', 'NODE_ENV'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  delete process.env.VERCEL; delete process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'production'; process.env.SUPABASE_URL = 'https://cost-fixture.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-server-key';
  const originalFetch = globalThis.fetch;
  const counts = { auth: 0, head: 0, settings: 0, rpc: 0 };
  let settings = registrationReadySettings();
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    if (url.hostname === '127.0.0.1') return originalFetch(input, init);
    assert.equal(url.origin, 'https://cost-fixture.invalid', 'Never contact a real service');
    if (url.pathname === '/auth/v1/user') { counts.auth++; return Response.json({ error_code: 'bad_jwt', msg: 'fixture-sensitive-provider-error' }, { status: 401 }); }
    if (request.method === 'HEAD') {
      assert.ok(['/rest/v1/profiles', '/rest/v1/learning_sessions', '/rest/v1/platform_settings'].includes(url.pathname));
      counts.head++; assert.equal(url.searchParams.get('select'), 'id'); assert.equal(url.searchParams.get('limit'), '1');
      assert.ok(request.signal);
      return new Response(null, { status: options.healthFailure ? 503 : 200 });
    }
    if (url.pathname === '/rest/v1/platform_settings') {
      counts.settings++;
      assert.ok(request.signal);
      return options.settingsFailure ? Response.json({ message: 'fixture-sensitive-provider-error' }, { status: 503 })
        : Response.json({ settings, revision: 1, updated_at: '2026-10-25T00:00:00Z' });
    }
    if (url.pathname === '/rest/v1/rpc/consume_api_limit') { counts.rpc++; return Response.json(true); }
    throw new Error(`Unexpected fixture request: ${url.pathname}`);
  };
  const app = createApiApp({ limits: options.limits });
  assert.equal(app.get('trust proxy'), false, 'NODE_ENV production alone must not trust client forwarding headers');
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.on('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    counts,
    closeRegistration() { settings = { ...settings, release: { ...settings.release, registrationEnabled: false } }; },
    async call(path: string, init: RequestInit = {}) {
      const response = await originalFetch(base + path, init);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      const text = await response.text();
      let body: unknown; try { body = JSON.parse(text); } catch { body = text; }
      return { status: response.status, headers: response.headers, body };
    },
    async close() {
      globalThis.fetch = originalFetch; await new Promise<void>(resolve => server.close(() => resolve()));
      for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
    },
  };
}

test('the global gate rejects rotated bearer tokens and forwarded-IP spoofing before provider verification or JSON parsing', async () => {
  const api = await fixture({ limits: { apiPerMinute: 2, publicPerMinute: 10 } });
  try {
    for (const nonce of ['one', 'two']) {
      const result = await api.call(`/api/account/requests?nonce=${nonce}`, { headers: {
        Authorization: `Bearer fixture.${nonce}.signature`, 'X-Forwarded-For': nonce === 'one' ? '203.0.113.1' : '198.51.100.2',
      } });
      assert.equal(result.status, 401);
      assert.ok(!JSON.stringify(result.body).includes('fixture-sensitive'));
    }
    assert.equal(api.counts.auth, 2);
    const blocked = await api.call('/api/register-family?limit=9999', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.99' }, body: '{"oversized":"' + 'x'.repeat(270000) });
    assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    assert.deepEqual(api.counts, { auth: 2, head: 0, settings: 0, rpc: 0 });
  } finally { await api.close(); }
});

test('public route limits share a bucket across paths and stop readiness and metadata queries', async () => {
  const api = await fixture({ limits: { apiPerMinute: 10, publicPerMinute: 2 } });
  try {
    assert.equal((await api.call('/api/public/policy/not-a-policy')).status, 404);
    assert.equal((await api.call('/api/public/platform')).status, 200);
    assert.equal((await api.call('/api/health')).status, 429);
    assert.equal((await api.call('/api/public/membership')).status, 429);
    assert.deepEqual(api.counts, { auth: 0, head: 0, settings: 1, rpc: 0 });
  } finally { await api.close(); }
});

test('parallel health requests perform only three HEAD queries per instance and preserve the release response contract', async () => {
  const api = await fixture();
  try {
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => api.call(`/api/health?nonce=${index}`)));
    assert.ok(results.every(result => result.status === 200)); assert.equal(api.counts.head, 3);
    const health = results[0].body as Record<string, unknown>;
    assert.equal(health.status, 'ok'); assert.equal(health.database, 'ready'); assert.equal(typeof health.timestamp, 'number');
    assert.deepEqual(Object.keys(health).sort(), ['commit', 'database', 'projectRef', 'status', 'timestamp', 'version']);
    assert.ok(results.every(result => (result.body as Record<string, unknown>).timestamp === health.timestamp));
  } finally { await api.close(); }
});

test('failed health probes back off without returning cached readiness or database error details', async () => {
  const api = await fixture({ healthFailure: true });
  try {
    for (let i = 0; i < 3; i++) {
      const result = await api.call('/api/health');
      assert.equal(result.status, 503); assert.deepEqual(result.body, { status: 'unavailable', database: 'unavailable' });
    }
    assert.equal(api.counts.head, 3);
  } finally { await api.close(); }
});

test('public platform and membership reads share a fixed cache independent of attacker query parameters', async () => {
  const api = await fixture();
  try {
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => api.call(`/api/public/platform?nonce=${index}`)));
    assert.ok(results.every(result => result.status === 200));
    assert.equal((await api.call('/api/public/membership')).status, 200);
    assert.equal(api.counts.settings, 1);
  } finally { await api.close(); }
});

test('public metadata failures make one provider attempt and back off without exposing the error body', async () => {
  const api = await fixture({ settingsFailure: true });
  try {
    for (let i = 0; i < 3; i++) {
      const result = await api.call('/api/public/platform');
      assert.equal(result.status, 503); assert.ok(!JSON.stringify(result.body).includes('fixture-sensitive'));
    }
    assert.equal(api.counts.settings, 1);
  } finally { await api.close(); }
});

test('cached public registration metadata cannot keep account creation open after authoritative settings close it', async () => {
  const api = await fixture();
  try {
    const display = await api.call('/api/public/platform');
    assert.equal((display.body as { registrationOpen: boolean }).registrationOpen, true);
    api.closeRegistration();
    const result = await api.call('/api/register-family', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentEmail: 'fixture@example.invalid', parentPassword: 'FixtureParent987', studentName: 'Test Kaşif',
        studentPassword: 'FixtureStudent987', grade: 2, examFocus: 'BİLSEM', consentAccepted: true, termsAccepted: true,
        guardianConfirmed: true, policyVersion: '2026-10-28.1' }) });
    assert.equal(result.status, 503); assert.equal((result.body as { code: string }).code, 'REGISTRATION_NOT_READY');
    assert.equal(api.counts.settings, 2); assert.equal(api.counts.auth, 0);
  } finally { await api.close(); }
});

test('unknown policy slugs and malformed or oversized JWTs never reach Supabase', async () => {
  const api = await fixture();
  try {
    assert.equal((await api.call('/api/public/policy/unknown-slug')).status, 404);
    for (const value of ['opaque-token', 'one.two', 'one.two.three.extra', `one.${'a'.repeat(8200)}.three`]) {
      assert.equal((await api.call('/api/account/requests', { headers: { Authorization: `Bearer ${value}` } })).status, 401);
    }
    assert.deepEqual(api.counts, { auth: 0, head: 0, settings: 0, rpc: 0 });
  } finally { await api.close(); }
});

test('shared limits normalize IPv6 networks and fail closed on malformed quota results', async () => {
  const previousUrl = process.env.SUPABASE_URL, previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousVercel = process.env.VERCEL, previousTarget = process.env.VERCEL_ENV;
  delete process.env.VERCEL; delete process.env.VERCEL_ENV;
  process.env.SUPABASE_URL = 'https://quota-fixture.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-server-key';
  const originalFetch = globalThis.fetch;
  const keys: string[] = [];
  let reply: unknown = true;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init); assert.equal(new URL(request.url).origin, 'https://quota-fixture.invalid');
    const body = await request.json(); keys.push(body.p_key);
    assert.match(body.p_key, /^[a-f0-9]{64}$/); assert.ok(!JSON.stringify(body).includes('2001:db8'));
    return Response.json(reply);
  };
  async function consume(ip: string) {
    let status = 200, passed = false;
    const res = { status(value: number) { status = value; return this; }, json() { return this; }, setHeader() {} } as unknown as ExpressResponse;
    await sharedRateLimit('fixture-quota', 5, 60)({ ip } as AuthenticatedRequest, res, () => { passed = true; });
    return { status, passed };
  }
  try {
    assert.equal((await consume('2001:db8:1234:5600::1')).passed, true);
    await consume('2001:db8:1234:56ff::abcd'); await consume('2001:db8:1234:5700::1');
    assert.equal(keys[0], keys[1]); assert.notEqual(keys[1], keys[2]);
    reply = false; assert.deepEqual(await consume('203.0.113.1'), { status: 429, passed: false });
    for (reply of [null, [], {}, 'true']) assert.deepEqual(await consume('203.0.113.1'), { status: 503, passed: false });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ SUPABASE_URL: previousUrl, SUPABASE_SERVICE_ROLE_KEY: previousKey, VERCEL: previousVercel, VERCEL_ENV: previousTarget })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
