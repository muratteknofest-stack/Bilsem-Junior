import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Response as ExpressResponse } from 'express';
import type { AuthenticatedRequest } from '../server/security';
import { createParentSessionHandler, ParentSignInError } from '../server/parent-session';
import { createStudentPasswordHandler } from '../server/student-password';
import { PasswordPolicyError } from '../server/password-policy';
import { activateParentSession, activateStudentSession } from '../src/lib/student-session';
import { beginAccountSwitch, cancelAccountSwitch } from '../src/lib/account-switch';
import { passwordPairError, suggestPassword } from '../src/lib/password-creation';
import { registerFamilySchema } from '../server/routes/auth-routes';
import { NewPasswordFields } from '../src/features/auth/components/NewPasswordFields';
import { ParentAccessDialog } from '../src/features/auth/components/ParentAccessDialog';

const parentId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const parentTokens = { parentId, access_token: 'test-parent-access', refresh_token: 'test-parent-refresh' };
function responseRecorder() {
  const record = { status: 200, payload: undefined as unknown, cache: '' };
  const res = { setHeader(name: string, value: string) { if (name === 'Cache-Control') record.cache = value; return this; }, status(n: number) { record.status = n; return this; }, json(value: unknown) { record.payload = value; return this; }, send() { return this; } } as unknown as ExpressResponse;
  return { record, res };
}
type Scenario = { authenticated?: boolean; verified?: boolean; parentRole?: string; childRole?: string; forward?: boolean; reverse?: boolean; body?: unknown; fail?: 'lookup'|'wrongPassword'|'provider'|'audit'|'identity'|'unverified'|'policy'|'update'|'revoke'; };
async function run(kind: 'return'|'password', options: Scenario = {}) {
  const actions: string[] = [];
  const parent = { id: parentId, role: options.parentRole || 'parent', linkedStudentIds: options.forward === false ? [] : [studentId] };
  const student = { id: studentId, role: options.childRole || 'student', linkedParentId: options.reverse === false ? undefined : parentId };
  const profile = async (id: string) => { if (options.fail === 'lookup') throw Error('private-provider-detail'); return id === parentId ? parent : id === studentId ? student : undefined; };
  const audit = async () => { actions.push('audit'); if (options.fail === 'audit') throw Error('private-provider-detail'); };
  const handler = kind === 'return' ? createParentSessionHandler({ profile, audit,
    async signIn(id, password) { actions.push('signIn'); assert.equal(id, parentId); assert.equal(password, 'test-password');
      if (options.fail === 'wrongPassword') throw new ParentSignInError(); if (options.fail === 'provider') throw Error('private-provider-detail');
      return { ...parentTokens, parentId: options.fail === 'identity' ? studentId : parentId, verified: options.fail !== 'unverified' };
    },
  }) : createStudentPasswordHandler({ profile, audit,
    async update(id, password) { actions.push('update'); assert.equal(id, studentId); assert.equal(password, 'YalnızTest937');
      if (options.fail === 'policy') throw new PasswordPolicyError('PASSWORD_COMPROMISED'); if (options.fail === 'update') throw Error('private-provider-detail'); },
    async revoke(id) { actions.push('revoke'); assert.equal(id, studentId); if (options.fail === 'revoke') throw Error('private-provider-detail'); },
  });
  const req = { authUser: options.authenticated === false ? undefined : { uid: kind === 'return' ? studentId : parentId, email_verified: options.verified !== false }, body: options.body ?? (kind === 'return' ? { password: 'test-password' } : { studentId, newPassword: 'YalnızTest937' }) } as AuthenticatedRequest;
  const { record, res } = responseRecorder(); await handler(req, res);
  assert.equal(record.cache, 'no-store');
  assert.equal(parent.role, options.parentRole || 'parent'); assert.equal(student.role, options.childRole || 'student');
  return { ...record, actions };
}

test('returning to the parent requires the linked parent password; no role rewrite or caller-chosen identity', async () => {
  const success = await run('return'); assert.equal(success.status, 200); assert.deepEqual(success.payload, parentTokens); assert.deepEqual(success.actions, ['audit', 'signIn']);
  for (const [options, status] of [
    [{ authenticated: false }, 401], [{ body: {} }, 400], [{ body: { password: 'test-password', parentId } }, 400],
    [{ parentRole: 'admin' }, 403], [{ childRole: 'parent' }, 403], [{ forward: false }, 403], [{ reverse: false }, 403],
  ] as const) { const result = await run('return', options); assert.equal(result.status, status); assert.deepEqual(result.actions, []); }
});
test('parent password failures and unavailable providers never disclose tokens or private details', async () => {
  for (const fail of ['wrongPassword', 'provider', 'lookup', 'audit', 'identity', 'unverified'] as const) {
    const result = await run('return', { fail }); assert.equal(result.status, fail === 'wrongPassword' ? 401 : 503);
    assert.doesNotMatch(JSON.stringify(result.payload), /test-parent-access|test-parent-refresh|private-provider-detail/);
    if (fail === 'audit') assert.deepEqual(result.actions, ['audit']);
  }
});
test('student password changes validate verified parent ownership and both family links before mutation', async () => {
  for (const [options, status] of [
    [{ authenticated: false }, 401], [{ verified: false }, 403], [{ parentRole: 'student' }, 403], [{ childRole: 'admin' }, 403],
    [{ forward: false }, 403], [{ reverse: false }, 403], [{ body: { studentId: 'invalid', newPassword: 'YalnızTest937' } }, 400],
    [{ body: { studentId, newPassword: 'short' } }, 400], [{ body: { studentId, newPassword: 'YalnızTest937', role: 'admin' } }, 400],
  ] as const) { const result = await run('password', options); assert.equal(result.status, status); assert.deepEqual(result.actions, []); }
  const success = await run('password'); assert.equal(success.status, 204); assert.deepEqual(success.actions, ['update', 'revoke', 'audit']);
});
test('compromised student passwords are refused; revocation and audit failures report partial changes truthfully', async () => {
  const policy = await run('password', { fail: 'policy' }); assert.equal(policy.status, 422); assert.deepEqual(policy.actions, ['update']);
  for (const fail of ['lookup','update','revoke','audit'] as const) {
    const result = await run('password', { fail }); assert.equal(result.status, 503); assert.doesNotMatch(JSON.stringify(result.payload), /private-provider-detail/);
    assert.match(JSON.stringify(result.payload), fail === 'revoke' || fail === 'audit' ? /Şifre değişti/ : /değiştirilemedi/);
  }
});
function auth(id: string, onSet?: () => void) {
  const calls: string[] = [];
  return { calls, async setSession() { calls.push('set'); onSet?.(); return { data: { user: { id } }, error: null }; }, async signOut() { calls.push('signOut'); } };
}
test('wrong parent passwords retain the student session; unexpected identities are signed out locally', async () => {
  const same = auth(parentId); await activateParentSession(Response.json(parentTokens), parentId, same); assert.deepEqual(same.calls, ['set']);
  for (const response of [Response.json({ error: 'Veli şifresi doğrulanamadı.' }, { status: 401 }), Response.json({ ...parentTokens, parentId: studentId }), Response.json(null), new Response('<html>error</html>', { status: 503 })]) {
    const current = auth(studentId); await assert.rejects(activateParentSession(response, parentId, current)); assert.deepEqual(current.calls, []);
  }
  const wrong = auth(studentId); await assert.rejects(activateParentSession(Response.json(parentTokens), parentId, wrong)); assert.deepEqual(wrong.calls, ['set','signOut']);
});
test('cancelled, superseded and mid-flight account switches cannot reactivate an abandoned session', async () => {
  const previous = beginAccountSwitch(); const latest = beginAccountSwitch(); assert.equal(previous(), false); assert.equal(latest(), true); cancelAccountSwitch(); assert.equal(latest(), false);
  for (const [activate, id, payload] of [[activateParentSession,parentId,parentTokens],[activateStudentSession,studentId,{ studentId,access_token:'test-child',refresh_token:'test-child-refresh' }]] as const) {
    const before = auth(id); await assert.rejects(activate(Response.json(payload), id, before, () => false)); assert.deepEqual(before.calls, []);
    const current = beginAccountSwitch(); const during = auth(id, cancelAccountSwitch); await assert.rejects(activate(Response.json(payload), id, during, current)); assert.deepEqual(during.calls, ['set','signOut']);
  }
});
test('all password screens share bounded Turkish-letter rules and confirmation; generated suggestions use secure randomness', () => {
  assert.equal(passwordPairError('ŞifreYeni937','ŞifreYeni937'),null);
  assert.match(passwordPairError('ŞifreYeni937','ŞifreYeni938')!,/eşleşmiyor/);
  for (const value of ['abc123','abcdefgh','12345678','a'.repeat(128)+'1']) assert.ok(passwordPairError(value,value));
  const generated = Array.from({ length:100 },suggestPassword); assert.equal(new Set(generated).size,100);
  for (const password of generated) { assert.equal(password.length,16); assert.equal(passwordPairError(password,password),null); }
  const family = { parentEmail:'test@example.com',parentPassword:'ŞifreYeni937',studentPassword:'ŞifreYeni937',studentName:'Test',grade:2,examFocus:'Genel',consentAccepted:true,termsAccepted:true,guardianConfirmed:true,policyVersion:'2026-10-11.1' };
  assert.equal(registerFamilySchema.safeParse(family).success,false); assert.equal(registerFamilySchema.safeParse({...family,studentPassword:'ÖğrenciYeni938'}).success,true);
});
test('password UI exposes confirmations and rule feedback; parent access starts locked and has an accessible dialog', () => {
  const fields = renderToStaticMarkup(<NewPasswordFields label="Veli şifresi" value="" confirmation="" onChange={()=>{}} onConfirmation={()=>{}} />);
  assert.equal((fields.match(/type="password"/g)||[]).length,2); assert.equal((fields.match(/maxlength="128"/gi)||[]).length,2);
  assert.match(fields,/8–128 karakter/); assert.match(fields,/güçlü şifre öner/); assert.doesNotMatch(fields,/value="Z[A-Za-z0-9_-]+7"/);
  const dialog = renderToStaticMarkup(<ParentAccessDialog busy={false} onVerify={async()=>{}} onClose={()=>{}} onLogin={()=>{}} />);
  assert.match(dialog,/role="dialog"/); assert.match(dialog,/aria-modal="true"/); assert.match(dialog,/autocomplete="current-password"/i); assert.match(dialog,/disabled=""[^>]*>Veli panelini aç/);
});
