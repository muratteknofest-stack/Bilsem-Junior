import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileAuthUsers } from '../scripts/reconcile-auth-users.mjs';

const first = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
const verified = '2026-10-01T00:00:00Z';

test('maps unique verified email and matching application role', () => {
  const { mapping, unresolved } = reconcileAuthUsers(
    { firebaseUid: { email: ' STUDENT@example.com ', emailVerified: true, disabled: false } },
    { firebaseUid: { email: 'student@example.com', role: 'student' } },
    [{ id: first, email: 'student@example.com', email_confirmed_at: verified }],
    [{ id: first, email: 'student@example.com', role: 'student' }],
  );
  assert.deepEqual(mapping, { firebaseUid: first });
  assert.deepEqual(unresolved, []);
});

test('refuses unverified, duplicate, or role-conflicting identities', () => {
  const { mapping, unresolved } = reconcileAuthUsers(
    {
      unverified: { email: 'one@example.com', emailVerified: false },
      duplicateA: { email: 'two@example.com', emailVerified: true },
      duplicateB: { email: 'two@example.com', emailVerified: true },
      roleConflict: { email: 'three@example.com', emailVerified: true },
    },
    { roleConflict: { email: 'three@example.com', role: 'student' } },
    [{ id: first, email: 'one@example.com', email_confirmed_at: verified },
      { id: second, email: 'two@example.com', email_confirmed_at: verified },
      { id: '33333333-3333-4333-8333-333333333333', email: 'three@example.com', email_confirmed_at: verified }],
    [{ id: '33333333-3333-4333-8333-333333333333', email: 'three@example.com', role: 'parent' }],
  );
  assert.deepEqual(mapping, {});
  assert.equal(unresolved.length, 4);
  assert.match(unresolved.find(item => item.uid === 'roleConflict').reason, /roles differ/);
});
