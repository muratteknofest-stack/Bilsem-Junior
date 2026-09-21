import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-zekapark-rules';
let environment: RulesTestEnvironment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

beforeEach(async () => environment.clearFirestore());
after(async () => environment.cleanup());

async function seed(path: string, value: Record<string, unknown>): Promise<void> {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), value);
  });
}

test('unauthenticated clients cannot read profiles or answer-bearing questions', async () => {
  await seed('users/student-1', { role: 'student', name: 'Öğrenci' });
  await seed('questions/question-1', { status: 'published', correctOptionId: 'A' });
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'users/student-1')));
  await assertFails(getDoc(doc(db, 'questions/question-1')));
});

test('students can edit presentation preferences but cannot forge XP or create profiles', async () => {
  await seed('users/student-1', { role: 'student', name: 'Öğrenci', xp: 10, updatedAt: 1 });
  const db = environment.authenticatedContext('student-1', { role: 'student' }).firestore();

  await assertSucceeds(getDoc(doc(db, 'users/student-1')));
  await assertSucceeds(updateDoc(doc(db, 'users/student-1'), { name: 'Yeni ad', updatedAt: 2 }));
  await assertFails(updateDoc(doc(db, 'users/student-1'), { xp: 999_999, updatedAt: 3 }));
  await assertFails(setDoc(doc(db, 'users/student-2'), { role: 'student', name: 'Sahte hesap' }));
  await assertFails(setDoc(doc(db, 'practiceSessions/forged'), { userId: 'student-1', correctCount: 100 }));
});

test('parents can read only linked children and cannot mutate their progress', async () => {
  await seed('users/parent-1', { role: 'parent', name: 'Veli' });
  await seed('users/child-1', { role: 'student', linkedParentId: 'parent-1', xp: 20 });
  await seed('users/child-2', { role: 'student', linkedParentId: 'another-parent', xp: 30 });
  const db = environment.authenticatedContext('parent-1', { role: 'parent' }).firestore();

  await assertSucceeds(getDoc(doc(db, 'users/child-1')));
  await assertFails(getDoc(doc(db, 'users/child-2')));
  await assertFails(updateDoc(doc(db, 'users/child-1'), { xp: 1000 }));
});

test('MFA is required for admin reads and even MFA admins cannot bypass audited writes', async () => {
  await seed('users/admin-1', { role: 'admin', name: 'Yönetici' });
  await seed('users/student-1', { role: 'student', xp: 10 });
  await seed('questions/question-1', { status: 'draft', correctOptionId: 'A' });
  const withoutMfa = environment.authenticatedContext('admin-1', { role: 'admin' }).firestore();
  const withMfa = environment.authenticatedContext('admin-1', {
    role: 'admin',
    firebase: { sign_in_second_factor: 'totp' },
  } as any).firestore();

  await assertFails(getDoc(doc(withoutMfa, 'questions/question-1')));
  await assertSucceeds(getDoc(doc(withMfa, 'questions/question-1')));
  await assertFails(updateDoc(doc(withMfa, 'questions/question-1'), { status: 'published' }));
  await assertFails(updateDoc(doc(withMfa, 'users/student-1'), { xp: 999_999 }));
});

test('attempt owners can read summaries but no browser can read or write answer vaults', async () => {
  await seed('users/student-1', { role: 'student', linkedParentId: 'parent-1' });
  await seed('users/parent-1', { role: 'parent' });
  await seed('users/admin-1', { role: 'admin' });
  await seed('testAttempts/attempt-1', { userId: 'student-1', score: 80 });
  await seed('testAttempts/attempt-1/questions/000', { correctOptionId: 'A' });

  const student = environment.authenticatedContext('student-1', { role: 'student' }).firestore();
  const parent = environment.authenticatedContext('parent-1', { role: 'parent' }).firestore();
  const admin = environment.authenticatedContext('admin-1', {
    role: 'admin', firebase: { sign_in_second_factor: 'totp' },
  } as any).firestore();
  await assertSucceeds(getDoc(doc(student, 'testAttempts/attempt-1')));
  await assertSucceeds(getDoc(doc(parent, 'testAttempts/attempt-1')));
  await assertSucceeds(getDoc(doc(admin, 'testAttempts/attempt-1')));
  await assertFails(getDoc(doc(student, 'testAttempts/attempt-1/questions/000')));
  await assertFails(getDoc(doc(admin, 'testAttempts/attempt-1/questions/000')));
  await assertFails(updateDoc(doc(student, 'testAttempts/attempt-1'), { score: 100 }));
});

test('entitlements and deletion requests are owner-readable but backend-only writable', async () => {
  await seed('entitlements/parent-1', { status: 'active', plan: 'family-premium' });
  await seed('privacyDeletionRequests/request-1', { requesterId: 'parent-1', status: 'pending' });
  const owner = environment.authenticatedContext('parent-1', { role: 'parent' }).firestore();
  const stranger = environment.authenticatedContext('parent-2', { role: 'parent' }).firestore();

  assert.equal((await assertSucceeds(getDoc(doc(owner, 'entitlements/parent-1')))).data()?.status, 'active');
  await assertSucceeds(getDoc(doc(owner, 'privacyDeletionRequests/request-1')));
  await assertFails(getDoc(doc(stranger, 'privacyDeletionRequests/request-1')));
  await assertFails(updateDoc(doc(owner, 'entitlements/parent-1'), { status: 'active', plan: 'free' }));
  await assertFails(updateDoc(doc(owner, 'privacyDeletionRequests/request-1'), { status: 'completed' }));
});
