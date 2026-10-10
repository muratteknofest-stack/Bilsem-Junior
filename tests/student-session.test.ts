import test from 'node:test';
import assert from 'node:assert/strict';
import type { Response as ExpressResponse } from 'express';
import type { AuthenticatedRequest } from '../server/security';
import { createStudentSessionHandler } from '../server/student-session';
import { activateStudentSession } from '../src/lib/student-session';

const parentId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const childSession = { studentId, access_token: 'test-child-access', refresh_token: 'test-child-refresh' };
async function request(options: { authenticated?: boolean; verified?: boolean; parentRole?: string; childRole?: string; forwardLink?: boolean; reverseLink?: boolean; missing?: boolean; body?: unknown; failure?: 'lookup' | 'provider' | 'audit' | 'identity' } = {}) {
  const actions: string[] = [];
  const parent = { id: parentId, role: options.parentRole ?? 'parent', linkedStudentIds: options.forwardLink === false ? [] : [studentId] };
  const child = { id: studentId, role: options.childRole ?? 'student', linkedParentId: options.reverseLink === false ? 'another-parent' : parentId };
  const handler = createStudentSessionHandler({
    async profile(id) {
      if (options.failure === 'lookup') throw Error('private-provider-detail');
      return options.missing ? undefined : id === parentId ? parent : child;
    },
    async audit(actor, student) {
      assert.equal(actor, parentId); assert.equal(student, studentId); actions.push('audit');
      if (options.failure === 'audit') throw Error('private-provider-detail');
    },
    async createSession(id) {
      assert.equal(id, studentId); actions.push('session');
      if (options.failure === 'provider') throw Error('private-provider-detail');
      return { ...childSession, studentId: options.failure === 'identity' ? parentId : studentId };
    },
  });
  let status = 200; let payload: unknown; let cache: unknown;
  const req = { authUser: options.authenticated === false ? undefined : { uid: parentId, email_verified: options.verified !== false }, body: options.body ?? { studentId } } as AuthenticatedRequest;
  const res = { setHeader(name: string, value: string) { if (name === 'Cache-Control') cache = value; return this; },
    status(value: number) { status = value; return this; }, json(value: unknown) { payload = value; return this; } } as unknown as ExpressResponse;
  await handler(req, res);
  assert.equal(cache, 'no-store');
  // Authorization must leave both profiles untouched.
  assert.equal(parent.role, options.parentRole ?? 'parent'); assert.equal(child.role, options.childRole ?? 'student');
  return { status, payload, actions };
}

test('student handoff requires an authenticated, verified parent and strict input', async () => {
  for (const [options, status] of [
    [{ authenticated: false }, 401], [{ verified: false }, 403],
    [{ body: { studentId: 'invalid' } }, 400], [{ body: { studentId, role: 'admin' } }, 400],
  ] as const) {
    const result = await request(options); assert.equal(result.status, status); assert.deepEqual(result.actions, []);
  }
});
test('student handoff rejects unlinked accounts, missing profiles and privileged target roles', async () => {
  for (const options of [{ forwardLink: false }, { reverseLink: false }, { parentRole: 'student' }, { childRole: 'admin' }, { childRole: 'parent' }, { missing: true }]) {
    const result = await request(options); assert.equal(result.status, 403); assert.deepEqual(result.actions, []);
  }
});
test('linked parent receives only the actual child session and the action is audited', async () => {
  const result = await request(); assert.equal(result.status, 200); assert.deepEqual(result.payload, childSession);
  assert.deepEqual(result.actions, ['audit', 'session']);
});
test('lookup, audit, provider and identity failures do not return credentials or internal errors', async () => {
  for (const failure of ['lookup', 'audit', 'provider', 'identity'] as const) {
    const result = await request({ failure }); assert.equal(result.status, 503);
    assert.doesNotMatch(JSON.stringify(result.payload), /test-child|private-provider/);
    if (failure === 'audit') assert.deepEqual(result.actions, ['audit']);
  }
});

function fakeAuth(id = studentId, error: unknown = null) {
  const calls: unknown[] = [];
  return { calls, async setSession(tokens: unknown) { calls.push(tokens); return { data: { user: { id } }, error }; }, async signOut(options: unknown) { calls.push(options); } };
}
test('complete handoff activates student credentials after server ownership checks', async () => {
  const result = await request(); const auth = fakeAuth();
  await activateStudentSession(Response.json(result.payload, { status: result.status }), studentId, auth);
  assert.deepEqual(auth.calls, [{ access_token: childSession.access_token, refresh_token: childSession.refresh_token }]);
});
test('denied, malformed or mismatched handoffs preserve the existing parent session', async () => {
  for (const response of [Response.json({ error: 'Öğrenci bu veli hesabına bağlı değil.' }, { status: 403 }), Response.json({ ...childSession, studentId: parentId }), Response.json({ studentId }), Response.json(null), new Response('<html>unavailable</html>', { status: 503 })]) {
    const auth = fakeAuth(); await assert.rejects(activateStudentSession(response, studentId, auth)); assert.deepEqual(auth.calls, []);
  }
});
test('Supabase session failures are reported; a wrong identity is immediately signed out locally', async () => {
  const failed = fakeAuth(studentId, Error('private-provider-detail'));
  await assert.rejects(activateStudentSession(Response.json(childSession), studentId, failed), /Öğrenci oturumu açılamadı/);
  const wrong = fakeAuth(parentId);
  await assert.rejects(activateStudentSession(Response.json(childSession), studentId, wrong), /Öğrenci hesabı doğrulanamadı/);
  assert.deepEqual(wrong.calls[1], { scope: 'local' });
  const networkFailure = { async setSession() { throw Error('Network request failed'); }, async signOut() {} };
  await assert.rejects(activateStudentSession(Response.json(childSession), studentId, networkFailure), /Bağlantınızı kontrol/);
});
