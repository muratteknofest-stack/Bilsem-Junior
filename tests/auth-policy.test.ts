import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createClient } from '@supabase/supabase-js';
import { createApiApp } from '../server/api-app';
import { createVercelConfig } from '../scripts/vercel-config.mjs';
import { assessAuthSecurity, checkAuthSecurity } from '../scripts/auth-security.mjs';

const origin = 'https://abcdefghijklmnopqrst.supabase.co';
const env = { SUPABASE_URL: origin, VITE_SUPABASE_URL: origin, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' };
const publicSettings = { disable_signup: true, mailer_autoconfirm: false, external: { email: true, anonymous_users: false } };
const managementSettings = { password_hibp_enabled: true, password_min_length:8, smtp_pass: 'fixture-sensitive-smtp-password' };

test('the app rejects raw signup, automatic OTP account creation and user mutation without contacting Auth', async () => {
  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const originalFetch = globalThis.fetch;
  let outbound = 0;
  globalThis.fetch = async (input, init) => {
    if (!String(input).startsWith(`${base}/`)) { outbound++; throw new Error('Unexpected provider access'); }
    return originalFetch(input, init);
  };
  try {
    for (const [method, path, code] of [
      ['POST', '/supabase/auth/v1/signup', 'FAMILY_REGISTRATION_REQUIRED'],
      ['POST', '/supabase/auth/v1/otp/', 'FAMILY_REGISTRATION_REQUIRED'],
      ['POST', '/auth/provider-signup-blocked', 'FAMILY_REGISTRATION_REQUIRED'],
      ['PUT', '/supabase/auth/v1/user', 'APP_PASSWORD_CHANGE_REQUIRED'],
      ['PUT', '/auth/provider-password-blocked', 'APP_PASSWORD_CHANGE_REQUIRED'],
    ]) {
      const response = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json',
        Authorization: 'Bearer fixture-user-token' }, body: JSON.stringify({ password: 'fixture-sensitive-password', data: { role: 'admin' } }) });
      assert.equal(response.status, 410);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = await response.json();
      assert.equal(body.code, code);
      assert.ok(!JSON.stringify(body).includes('fixture-'));
    }
    // Real SDK signup/OTP callers also receive a structured failure, not success.
    const client = createClient(origin, 'sb_publishable_fixture', { auth: { persistSession: false, autoRefreshToken: false,
      detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(String(input).replace(`${origin}/auth/v1`, `${base}/api/supabase/auth/v1`), init) } });
    const signup = await client.auth.signUp({ email: 'fixture@example.com', password: 'FixturePassword123' });
    assert.equal(signup.error?.status, 410); assert.equal(signup.data.user, null);
    const otp = await client.auth.signInWithOtp({ email: 'fixture@example.com' });
    assert.equal(otp.error?.status, 410); assert.equal(otp.data.session, null);
    assert.equal(outbound, 0);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('edge rules intercept only the prohibited mutations before the public Auth rewrite', () => {
  const config = createVercelConfig(env);
  const destination = (path: string, method: string) => config.routes.find(rule => !('continue' in rule && rule.continue)
    && 'methods' in rule && rule.methods?.includes(method) && new RegExp(rule.src).test(path));
  for (const path of ['/signup', '/signup/', '/otp', '/otp/']) {
    const rule = destination(`/api/supabase/auth/v1${path}`, 'POST');
    assert.ok(rule && 'dest' in rule && rule.dest === '/api/index?__path=auth/provider-signup-blocked');
  }
  const password = destination('/api/supabase/auth/v1/user', 'PUT');
  assert.ok(password && 'dest' in password && password.dest === '/api/index?__path=auth/provider-password-blocked');
  for (const [path, method] of [
    ['/auth/v1/user', 'GET'], ['/auth/v1/token', 'POST'], ['/auth/v1/logout', 'POST'], ['/auth/v1/recover', 'POST'],
    ['/auth/v1/resend', 'POST'], ['/auth/v1/verify', 'POST'], ['/auth/v1/factors', 'POST'], ['/rest/v1/profiles', 'PATCH'],
  ]) assert.equal(destination(`/api/supabase${path}`, method), undefined, `${method} ${path}`);
  assert.equal(config.routes[0].continue, true, 'Cookie stripping still precedes dispatch');
  assert.ok(config.rewrites.some(rule => rule.source === '/api/supabase/auth/v1/:path*' && rule.destination.startsWith(origin)));
});

test('provider security requires all six verified controls; missing and wrongly typed settings fail closed', () => {
  assert.ok(assessAuthSecurity(publicSettings, managementSettings).every(check => check.passed));
  assert.ok(assessAuthSecurity(undefined, undefined).every(check => !check.passed));
  assert.equal(assessAuthSecurity({ ...publicSettings, disable_signup: false }, managementSettings)[0].passed, false);
  assert.equal(assessAuthSecurity({ ...publicSettings, mailer_autoconfirm: true }, managementSettings)[1].passed, false);
  assert.equal(assessAuthSecurity(publicSettings, { password_hibp_enabled: 'true' })[4].passed, false);
  for(const length of [undefined,6,7,'8',8.5])assert.equal(assessAuthSecurity(publicSettings,{...managementSettings,password_min_length:length})[5].passed,false);
});

test('provider verification uses only GET with credentials confined to their intended host', async () => {
  const calls: string[] = [];
  const result = await checkAuthSecurity({ ...env, SUPABASE_ACCESS_TOKEN: 'fixture-management-secret' }, async (input, options) => {
    const url = String(input); calls.push(url);
    assert.equal(options?.method, 'GET'); assert.equal(options?.redirect, 'error');
    assert.equal(options?.body, undefined); assert.ok(options?.signal);
    const headers = new Headers(options?.headers);
    if (url === `${origin}/auth/v1/settings`) {
      assert.equal(headers.get('apikey'), env.VITE_SUPABASE_PUBLISHABLE_KEY); assert.equal(headers.get('authorization'), null);
      return Response.json(publicSettings);
    }
    assert.equal(url, 'https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/config/auth');
    assert.equal(headers.get('authorization'), 'Bearer fixture-management-secret'); assert.equal(headers.get('apikey'), null);
    return Response.json(managementSettings);
  });
  assert.equal(calls.length, 2); assert.equal(result.passed, true);
  assert.equal(JSON.stringify(result).includes('fixture-'), false);
  assert.equal(JSON.stringify(result).includes('smtp'), false);
});

test('public settings alone cannot certify leaked password protection', async () => {
  let calls = 0;
  const result = await checkAuthSecurity(env, async () => { calls++; return Response.json(publicSettings); });
  assert.equal(calls, 1); assert.equal(result.passed, false);
  assert.equal(result.leakedPasswordProtectionVerified, false);
  assert.deepEqual(result.checks.filter(check => !check.passed).map(check => check.code), ['LEAKED_PASSWORD_PROTECTION_ENABLED','MINIMUM_PASSWORD_LENGTH_ENFORCED']);
});

test('provider redirects, non-JSON, malformed JSON and network failures never expose response bodies or credentials', async () => {
  for (const reply of [
    () => new Response('fixture-secret', { status: 302, headers: { location: 'https://attacker.test' } }),
    () => new Response('fixture-secret'),
    () => new Response('fixture-secret', { headers: { 'Content-Type': 'application/json' } }),
    () => { throw new Error('fixture-management-secret'); },
  ]) await assert.rejects(checkAuthSecurity(env, async () => reply()), error =>
    error instanceof Error && error.message === 'AUTH_SETTINGS_UNAVAILABLE');
});

test('invalid project configuration and private browser keys are rejected before any network call', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; throw new Error('Unexpected access'); };
  for (const settings of [
    { ...env, SUPABASE_URL: 'https://bcdefghijklmnopqrstu.supabase.co' },
    { ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_fixture' },
    { ...env, VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    { ...env, VERCEL: '1', VERCEL_ENV: 'preview', SUPABASE_URL: 'https://vtcsoqohkiagbwatlabk.supabase.co', VITE_SUPABASE_URL: 'https://vtcsoqohkiagbwatlabk.supabase.co' },
  ]) await assert.rejects(checkAuthSecurity(settings, fetcher));
  assert.equal(calls, 0);
});
