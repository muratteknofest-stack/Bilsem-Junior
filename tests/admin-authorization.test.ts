import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { hasAuthorizedProfileRole } from '../server/authorization.ts';

const uid = 'verified-admin-uid';
const profile = { id: uid, role: 'admin' };

test('admin API access requires a matching profile, custom claim and verified email', () => {
  assert.equal(hasAuthorizedProfileRole(uid, profile, { role: 'admin', email_verified: true }, ['admin']), true);
  assert.equal(hasAuthorizedProfileRole(uid, profile, { role: 'admin', email_verified: false }, ['admin']), false);
  assert.equal(hasAuthorizedProfileRole(uid, profile, { role: 'student', email_verified: true }, ['admin']), false);
  assert.equal(hasAuthorizedProfileRole(uid, { id: 'another-uid', role: 'admin' }, { role: 'admin', email_verified: true }, ['admin']), false);
  assert.equal(hasAuthorizedProfileRole(uid, { id: uid, role: 'student' }, { role: 'admin', email_verified: true }, ['admin']), false);
});

test('regular role access still checks profile identity and role', () => {
  assert.equal(hasAuthorizedProfileRole(uid, { id: uid, role: 'parent' }, {}, ['parent']), true);
  assert.equal(hasAuthorizedProfileRole(uid, { id: uid, role: 'student' }, {}, ['parent']), false);
});

test('Firestore admin privileges require a verified custom claim', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /hasRole\('admin'\) && request\.auth\.token\.email_verified == true/);
  assert.doesNotMatch(rules, /request\.auth\.token\.email ==/);
  assert.match(rules, /allow write: if isAdmin\(\);/);
});

test('client entry points do not contain admin credential fallbacks', async () => {
  const login = await readFile(new URL('../src/features/auth/components/LoginForm.tsx', import.meta.url), 'utf8');
  const publishing = await readFile(new URL('../src/services/question-publishing-service.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(login, /OWNER_ADMIN_EMAIL|createOwnerAdminProfile|signInAnonymously|createUserWithEmailAndPassword/);
  assert.doesNotMatch(publishing, /signInWithEmailAndPassword|signInAnonymously|admin_muratteknofest/);
  assert.match(login, /token\.claims\.role !== 'admin'/);
  assert.match(publishing, /token\.claims\.role !== 'admin'/);
});
