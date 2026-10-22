import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseTransport } from '../src/lib/supabase-transport.ts';
import { RequestDeadlineError } from '../src/lib/request-deadline.ts';

const project = 'https://vtcsoqohkiagbwatlabk.supabase.co';
const web = 'https://bilsemjunior.vercel.app';
const config = relayFetch => ({ supabaseUrl: project, apiBaseUrl: '', pageOrigin: web, relayFetch });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test('password requests use the app origin with the exact credentials, query, public key and bearer header', async () => {
  let calls = 0;
  const transport = createSupabaseTransport(config(async request => {
    calls++;
    assert.equal(request.url, web + '/api/supabase/auth/v1/token?grant_type=password');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.get('apikey'), 'sb_publishable_fixture');
    assert.equal(request.headers.get('authorization'), 'Bearer fixture-user');
    assert.deepEqual(await request.json(), { email: 'parent@example.test', password: 'fixture-password' });
    assert.equal(request.credentials, 'omit'); assert.equal(request.redirect, 'error'); assert.equal(request.cache, 'no-store');
    assert.equal(request.headers.get('cookie'), null);
    return Response.json({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400 });
  }));
  const response = await transport(project + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { apikey: 'sb_publishable_fixture', Authorization: 'Bearer fixture-user', Cookie: 'site-private', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'parent@example.test', password: 'fixture-password' }),
  });
  assert.equal(response.status, 400); assert.equal(calls, 1);
  assert.equal((await response.json()).error_code, 'invalid_credentials');
});

test('profiles, progress RPC, JWKS and MFA use the same relay without changing auth semantics', async () => {
  for (const path of ['/rest/v1/profiles?select=*&id=eq.fixture', '/rest/v1/rpc/patch_user_progress', '/auth/v1/.well-known/jwks.json', '/auth/v1/factors/fixture/challenge']) {
    const transport = createSupabaseTransport(config(async request => {
      assert.equal(request.url, web + '/api/supabase' + path);
      assert.equal(request.headers.get('authorization'), 'Bearer account-token');
      assert.equal(request.headers.get('prefer'), 'return=representation');
      return Response.json({ ok: true });
    }));
    assert.equal((await transport(project + path, { headers: { Authorization: 'Bearer account-token', Prefer: 'return=representation' } })).status, 200);
  }
});

test('refresh requests preserve their token and run once; a network error never triggers another login or refresh', async () => {
  let calls = 0;
  const transport = createSupabaseTransport(config(async request => {
    calls++; assert.equal(request.url, web + '/api/supabase/auth/v1/token?grant_type=refresh_token');
    assert.deepEqual(await request.json(), { refresh_token: 'one-use-refresh' });
    throw new TypeError('Failed to fetch');
  }));
  await assert.rejects(transport(project + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: '{"refresh_token":"one-use-refresh"}', headers: { 'Content-Type': 'application/json' } }), /Failed to fetch/);
  assert.equal(calls, 1);
});

test('the native API host is used explicitly while Supabase remains the session project', async () => {
  const transport = createSupabaseTransport({ ...config(async request => {
    assert.equal(request.url, web + '/api/supabase/auth/v1/user'); return Response.json({ id: 'fixture' });
  }), pageOrigin: 'https://localhost', apiBaseUrl: web });
  await transport(project + '/auth/v1/user');
});

test('unknown hosts, credentials, fragments and non-Supabase paths cannot receive account headers', async () => {
  let calls = 0;
  const transport = createSupabaseTransport(config(async () => { calls++; return Response.json({}); }));
  for (const input of ['https://evil.example/auth/v1/user', 'https://other.supabase.co/rest/v1/profiles', project + '/functions/v1/not-configured', project + '/auth/v1/user#private']) {
    await assert.rejects(transport(input, { headers: { Authorization: 'Bearer private' } }));
  }
  assert.equal(calls, 0);
  for (const options of [
    { supabaseUrl: 'http://unsafe.example' }, { supabaseUrl: project + '/extra' },
    { apiBaseUrl: 'https://user:password@evil.example' }, { apiBaseUrl: 'http://remote.example' },
    { apiBaseUrl: web + '/other?target=evil' },
  ]) assert.throws(() => createSupabaseTransport({ ...config(async () => Response.json({})), ...options }));
});

test('Request inputs retain body, method, headers and AbortSignal cancellation', async () => {
  const abort = new AbortController(); let forwarded;
  const transport = createSupabaseTransport(config(async request => { forwarded = request; return new Promise(() => {}); }));
  const input = new Request(project + '/auth/v1/user', { method: 'PUT', body: '{"data":{"name":"fixture"}}', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture' }, signal: abort.signal });
  const pending = transport(input); await flush();
  assert.equal(forwarded.method, 'PUT'); assert.equal(forwarded.headers.get('authorization'), 'Bearer fixture');
  assert.deepEqual(await forwarded.json(), { data: { name: 'fixture' } });
  abort.abort(); await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(forwarded.signal.aborted, true);
});

test('a cancelled request never starts a relay call', async () => {
  const abort = new AbortController(); abort.abort(); let calls = 0;
  const transport = createSupabaseTransport(config(async () => { calls++; return Response.json({}); }));
  await assert.rejects(transport(project + '/auth/v1/user', { signal: abort.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('a stalled request is bounded and late responses cannot settle it again', async () => {
  // A real fetch owns its Request until completion; model that lifetime here.
  let finish; let forwarded; let calls = 0;
  const transport = createSupabaseTransport({ ...config(request => { calls++; forwarded = request; return new Promise(resolve => { finish = resolve; }); }), timeoutMs: 15 });
  const pending = transport(project + '/auth/v1/user');
  await assert.rejects(pending, RequestDeadlineError);
  assert.equal(forwarded.signal.aborted, true); assert.equal(calls, 1);
  finish(Response.json({ id: 'late' })); await flush();
});

test('a stalled request body is bounded before any credentials are sent', async () => {
  let calls = 0;
  const transport = createSupabaseTransport({ ...config(async () => { calls++; return Response.json({}); }), timeoutMs: 15 });
  const input = new Request(project + '/auth/v1/token?grant_type=password', {
    method: 'POST', duplex: 'half', body: new ReadableStream({ start() {} }),
  });
  await assert.rejects(transport(input), RequestDeadlineError);
  assert.equal(calls, 0);
});

test('a response body that stalls is bounded too', async () => {
  let signal;
  const transport = createSupabaseTransport({ ...config(async request => {
    signal = request.signal;
    return new Response(new ReadableStream({ start() {} }), { headers: { 'Content-Type': 'application/json' } });
  }), timeoutMs: 15 });
  await assert.rejects(transport(project + '/auth/v1/user'), RequestDeadlineError);
  assert.equal(signal.aborted, true);
});

test('provider denials, retry hints and content ranges survive; decoded body headers stay consistent', async () => {
  for (const status of [400, 401, 403, 429, 503]) {
    const transport = createSupabaseTransport(config(async () => Response.json({ code: 'fixture_denial' }, { status, headers: { 'Retry-After': '60', 'Content-Range': '0-0/1', 'Content-Encoding': 'gzip', 'Content-Length': '999' } })));
    const response = await transport(project + '/auth/v1/user');
    assert.equal(response.status, status); assert.equal(response.headers.get('retry-after'), '60'); assert.equal(response.headers.get('content-range'), '0-0/1');
    assert.equal(response.headers.get('content-encoding'), null); assert.equal(response.headers.get('content-length'), null);
    assert.deepEqual(await response.json(), { code: 'fixture_denial' });
  }
  const transport = createSupabaseTransport(config(async () => new Response(null, { status: 204 })));
  assert.equal((await transport(project + '/auth/v1/logout', { method: 'POST' })).status, 204);
});

test('the actual Supabase SDK signs in through the relay and keeps its original storage key', async () => {
  const storage = new Map(); const calls = [];
  const payload = Buffer.from(JSON.stringify({ sub: '00000000-0000-4000-8000-000000000001', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url');
  const token = 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.fixture';
  const transport = createSupabaseTransport(config(async request => {
    calls.push(request.url);
    assert.equal(new URL(request.url).origin, web);
    return Response.json({ access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', email_confirmed_at: '2026-10-20T00:00:00Z', app_metadata: {}, user_metadata: {}, created_at: '2026-10-20T00:00:00Z' } });
  }));
  const client = createClient(project, 'sb_publishable_fixture', {
    global: { fetch: transport },
    auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: false,
      storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: key => { storage.delete(key); } } },
  });
  const result = await client.auth.signInWithPassword({ email: 'fixture@example.test', password: 'fixture-password' });
  assert.equal(result.error, null); assert.equal(result.data.user.id, '00000000-0000-4000-8000-000000000001');
  assert.ok(calls.some(url => url.endsWith('/api/supabase/auth/v1/token?grant_type=password')));
  assert.ok(storage.has('sb-vtcsoqohkiagbwatlabk-auth-token'));
  assert.equal([...storage.keys()].some(key => key.includes('zekapark.vercel')), false);
});

test('Vercel routes Auth and REST before the generic API function with no private-response caching', async () => {
  const configuration = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const api = configuration.rewrites.findIndex(rule => rule.source === '/api/:path*');
  for (const service of ['auth', 'rest']) {
    const index = configuration.rewrites.findIndex(rule => rule.source === `/api/supabase/${service}/v1/:path*`);
    assert.ok(index >= 0 && index < api);
    assert.equal(configuration.rewrites[index].destination, project + `/${service}/v1/:path*`);
  }
  const headers = configuration.headers.find(rule => rule.source === '/api/supabase/:path*').headers;
  for (const key of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) assert.match(headers.find(header => header.key === key).value, /no-store/);
  assert.equal(headers.find(header => header.key === 'x-vercel-enable-rewrite-caching').value, '0');
});
