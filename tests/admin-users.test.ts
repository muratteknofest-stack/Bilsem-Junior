import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminUserError, createAdminUserSchema, deleteAdminUserSchema, deletionScope, updateAdminUserSchema } from '../server/admin-users';

const parent = '11111111-1111-4111-8111-111111111111', child = '22222222-2222-4222-8222-222222222222', other = '33333333-3333-4333-8333-333333333333';
const strong = 'Zk9!vQ2#mLp7xRw';

test('creating users requires role-specific fields', () => {
  assert.equal(createAdminUserSchema.safeParse({ role: 'parent', name: 'Veli Ali', email: 'ali@example.com', password: strong }).success, true);
  assert.equal(createAdminUserSchema.safeParse({ role: 'parent', name: 'Veli Ali', password: strong }).success, false);
  assert.equal(createAdminUserSchema.safeParse({ role: 'parent', name: 'Veli Ali', email: 'x@zekapark.com', password: strong }).success, false);
  assert.equal(createAdminUserSchema.safeParse({ role: 'student', name: 'Ayşe', grade: 2, parentId: parent, password: strong }).success, true);
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

test('deletion needs an explicit confirmation', () => {
  assert.equal(deleteAdminUserSchema.safeParse({}).success, false);
  assert.equal(deleteAdminUserSchema.safeParse({ confirm: false }).success, false);
  assert.equal(deleteAdminUserSchema.safeParse({ confirm: true }).success, true);
});

test('deleting a parent removes the linked students; admins are protected', () => {
  const base = { name: 'x', email: null, deletion_pending: false };
  assert.deepEqual(deletionScope({ ...base, id: parent, role: 'parent', linked_parent_id: null, linked_student_ids: [child] }, [{ id: child, role: 'student' }]), [parent, child]);
  assert.deepEqual(deletionScope({ ...base, id: child, role: 'student', linked_parent_id: parent, linked_student_ids: [] }, []), [child]);
  assert.throws(() => deletionScope({ ...base, id: other, role: 'admin', linked_parent_id: null, linked_student_ids: [] }, []), AdminUserError);
  assert.throws(() => deletionScope({ ...base, id: parent, role: 'parent', linked_parent_id: null, linked_student_ids: [] }, [{ id: other, role: 'parent' }]), AdminUserError);
});
