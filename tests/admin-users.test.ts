import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminUserError, createAdminUserSchema, deleteAdminUserSchema, deletionScope, updateAdminSubscriptionSchema, updateAdminUserSchema } from '../server/admin-users';

const parent = '11111111-1111-4111-8111-111111111111', child = '22222222-2222-4222-8222-222222222222', other = '33333333-3333-4333-8333-333333333333';
const strong = 'Zk9!vQ2#mLp7xRw';

test('creating users requires role-specific fields and supports optional subscription tier', () => {
  assert.equal(createAdminUserSchema.safeParse({ role: 'parent', name: 'Veli Ali', email: 'ali@example.com', password: strong }).success, true);
  assert.equal(createAdminUserSchema.safeParse({ role: 'parent', name: 'Veli Ali', password: strong }).success, false);
  assert.equal(createAdminUserSchema.safeParse({ role: 'parent', name: 'Veli Ali', email: 'x@zekapark.com', password: strong }).success, false);
  assert.equal(createAdminUserSchema.safeParse({ role: 'student', name: 'Ayşe', grade: 2, parentId: parent, password: strong }).success, true);
  assert.equal(createAdminUserSchema.safeParse({ role: 'student', name: 'Ayşe', grade: 2, parentId: parent, password: strong, initialTier: 'subscriber', planId: 'annual' }).success, true);
  assert.equal(createAdminUserSchema.safeParse({ role: 'student', name: 'Ayşe', grade: 2, parentId: parent, password: strong, initialTier: 'legacy_lifetime' }).success, true);
  assert.equal(createAdminUserSchema.safeParse({ role: 'parent', name: 'Veli Ali', email: 'ali@example.com', password: strong, initialTier: 'subscriber' }).success, false);
  assert.equal(createAdminUserSchema.safeParse({ role: 'student', name: 'Ayşe', password: strong }).success, false);
  assert.equal(createAdminUserSchema.safeParse({ role: 'student', name: 'Ayşe', grade: 5, password: strong }).success, false);
  assert.equal(createAdminUserSchema.safeParse({ role: 'admin', name: 'Kötü', email: 'a@b.co', password: strong }).success, false);
  assert.equal(createAdminUserSchema.safeParse({ role: 'student', name: 'Ayşe', grade: 1, password: strong, isAdmin: true }).success, false);
});

test('updates are strict, non-empty and cannot touch the role', () => {
  assert.equal(updateAdminUserSchema.safeParse({}).success, false);
  assert.equal(updateAdminUserSchema.safeParse({ role: 'admin' }).success, false);
  assert.equal(updateAdminUserSchema.safeParse({ name: 'Yeni Ad', parentId: null }).success, true);
  assert.equal(updateAdminUserSchema.safeParse({ xp: -1 }).success, false);
});

test('subscription updates validate tier and optional plans', () => {
  assert.equal(updateAdminSubscriptionSchema.safeParse({ tier: 'subscriber', planId: 'monthly' }).success, true);
  assert.equal(updateAdminSubscriptionSchema.safeParse({ tier: 'subscriber', planId: 'quarterly', expiresAt: new Date().toISOString() }).success, true);
  assert.equal(updateAdminSubscriptionSchema.safeParse({ tier: 'legacy_lifetime' }).success, true);
  assert.equal(updateAdminSubscriptionSchema.safeParse({ tier: 'free' }).success, true);
  assert.equal(updateAdminSubscriptionSchema.safeParse({ tier: 'invalid' }).success, false);
  assert.equal(updateAdminSubscriptionSchema.safeParse({ tier: 'subscriber', planId: 'unknown' }).success, false);
});

test('deletion needs an explicit confirmation and allows purgeBilling option', () => {
  assert.equal(deleteAdminUserSchema.safeParse({}).success, false);
  assert.equal(deleteAdminUserSchema.safeParse({ confirm: false }).success, false);
  assert.equal(deleteAdminUserSchema.safeParse({ confirm: true }).success, true);
  assert.equal(deleteAdminUserSchema.safeParse({ confirm: true, purgeBilling: true }).success, true);
});

test('deleting a parent removes the linked students; admins are protected', () => {
  const base = { name: 'x', email: null, deletion_pending: false };
  assert.deepEqual(deletionScope({ ...base, id: parent, role: 'parent', linked_parent_id: null, linked_student_ids: [child] }, [{ id: child, role: 'student' }]), [parent, child]);
  assert.deepEqual(deletionScope({ ...base, id: child, role: 'student', linked_parent_id: parent, linked_student_ids: [] }, []), [child]);
  assert.throws(() => deletionScope({ ...base, id: other, role: 'admin', linked_parent_id: null, linked_student_ids: [] }, []), AdminUserError);
  assert.throws(() => deletionScope({ ...base, id: parent, role: 'parent', linked_parent_id: null, linked_student_ids: [] }, [{ id: other, role: 'parent' }]), AdminUserError);
});
