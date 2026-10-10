import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPasswordChecker, PasswordPolicyError } from '../server/password-policy';
import { createPasswordChangeHandler } from '../server/password-change';
import { verifyHealthResponse } from '../scripts/verify-live-release.mjs';
import type { AuthenticatedRequest } from '../server/security';
import type { Response as ExpressResponse } from 'express';

const password = 'TestOnlyPassword987';
const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
const suffix = hash.slice(5);
const mockFetch = (fn: (...args: Parameters<typeof fetch>) => Promise<Response>) => fn as typeof fetch;

test('compromised password is rejected; only the prefix leaves the server', async () => {
  let calls = 0;
  const check = createPasswordChecker(mockFetch(async (url, options) => {
    calls++;
    assert.equal(url, `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    assert.equal(options?.body, undefined);
    assert.equal(options?.redirect, 'error');
    assert.equal(new Headers(options?.headers).get('Add-Padding'), 'true');
    assert.ok(!JSON.stringify([url, options]).includes(password));
    assert.ok(!String(url).includes(hash));
    return new Response(`${suffix}:7\r\n${'A'.repeat(35)}:0\r\n`);
  }));
  for (let i = 0; i < 2; i++) {
    await assert.rejects(check(password), (e: PasswordPolicyError) => e.code === 'PASSWORD_COMPROMISED' && e.status === 422);
  }
  assert.equal(calls, 1);
});

test('padding entries with zero count are safe and parallel checks share one request', async () => {
  let calls = 0;
  const check = createPasswordChecker(mockFetch(async () => {
    calls++; return new Response(`${suffix}:0\n`);
  }));
  await Promise.all([check(password), check(password), check(password)]);
  assert.equal(calls, 1);
});

test('cached range expires and the next check detects a newly compromised password', async () => {
  let now = 0; let calls = 0;
  const check = createPasswordChecker(mockFetch(async () => new Response(`${suffix}:${calls++}\n`)), () => now);
  await check(password);
  now = 3_600_001;
  await assert.rejects(check(password), (e: PasswordPolicyError) => e.code === 'PASSWORD_COMPROMISED');
  assert.equal(calls, 2);
});

for (const [name, reply] of Object.entries({
  unavailable: () => new Response('unavailable', { status: 503 }),
  malformed: () => new Response('invalid range'),
  empty: () => new Response(''),
  oversized: () => new Response('A'.repeat(600_001)),
  network: () => { throw new Error(password); },
})) {
  test(`range ${name} fails closed without leaking the password`, async () => {
    const check = createPasswordChecker(mockFetch(async () => reply()));
    await assert.rejects(check(password), (e: PasswordPolicyError) =>
      e.code === 'PASSWORD_CHECK_UNAVAILABLE' && e.status === 503 && !e.message.includes(password));
  });
}

async function runChange(options: { authenticated?: boolean; body?: unknown; reject?: 'policy' | 'provider' | 'revoke' } = {}) {
  const actions: string[] = [];
  let status = 0; let result: unknown;
  const handler = createPasswordChangeHandler({
    async check() { actions.push('check'); if (options.reject === 'policy') throw new PasswordPolicyError('PASSWORD_COMPROMISED'); },
    async update(token) { assert.equal(token, 'test-user-jwt'); actions.push('update'); if (options.reject === 'provider') throw new Error('Provider failed'); },
    async revoke(id) { assert.equal(id, 'test-user'); actions.push('revoke'); if (options.reject === 'revoke') throw new Error('Revocation failed'); },
  });
  const req = { body: options.body ?? { password }, authUser: options.authenticated === false ? undefined : { uid: 'test-user' },
    header: () => options.authenticated === false ? undefined : 'Bearer test-user-jwt' } as unknown as AuthenticatedRequest;
  const res = { status(value: number) { status = value; return this; }, json(value: unknown) { result = value; return this; }, send() { return this; } } as unknown as ExpressResponse;
  await handler(req, res);
  return { actions, status, result };
}

test('password change validates ownership and input before touching credentials', async () => {
  assert.deepEqual((await runChange({ authenticated: false })).actions, []);
  assert.equal((await runChange({ authenticated: false })).status, 401);
  const invalid = await runChange({ body: { password: 'weak', userId: 'another-user' } });
  assert.equal(invalid.status, 400); assert.deepEqual(invalid.actions, []);
});
test('password change refuses a compromised password before provider mutation', async () => {
  const result = await runChange({ reject: 'policy' });
  assert.equal(result.status, 422); assert.deepEqual(result.actions, ['check']);
});
test('password change updates the owner and revokes their prior sessions', async () => {
  const result = await runChange();
  assert.equal(result.status, 204); assert.deepEqual(result.actions, ['check', 'update', 'revoke']);
});
test('provider and revocation failures never report password-change success', async () => {
  const provider = await runChange({ reject: 'provider' });
  assert.equal(provider.status, 503); assert.deepEqual(provider.actions, ['check', 'update']);
  const revoke = await runChange({ reject: 'revoke' });
  assert.equal(revoke.status, 503); assert.deepEqual(revoke.actions, ['check', 'update', 'revoke']);
});

const expected = { commit: 'a'.repeat(40), projectRef: 'vehhvsdkifwstbjhnhao' };
const health = { status: 'ok', database: 'ready', ...expected };
test('release check rejects a 200 login page and HTTP redirects', async () => {
  await assert.rejects(verifyHealthResponse(new Response('<html>Login</html>', { headers: { 'content-type': 'text/html' } }), expected));
  await assert.rejects(verifyHealthResponse(new Response(null, { status: 307, headers: { location: 'https://vercel.com/login' } }), expected));
});
test('release check requires the intended commit and database', async () => {
  await verifyHealthResponse(Response.json(health), expected);
  await assert.rejects(verifyHealthResponse(Response.json({ ...health, commit: 'b'.repeat(40) }), expected));
  await assert.rejects(verifyHealthResponse(Response.json({ ...health, projectRef: 'other' }), expected));
  await assert.rejects(verifyHealthResponse(Response.json({ ...health, database: 'unavailable' }), expected));
});
