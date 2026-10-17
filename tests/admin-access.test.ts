import test from 'node:test';
import assert from 'node:assert/strict';
import { hasVerifiedAdminAccess, isAdminLocation } from '../src/lib/admin-access';

test('admin entry is a dedicated path, not a query parameter or public account route', () => {
  for (const path of ['/admin', '/admin/', '/admin/giris', '/admin/giris/']) assert.equal(isAdminLocation(path), true, path);
  for (const path of ['/', '/register', '/login', '/?role=admin', '/admin-other', '/admin/giris/extra', '/blog/admin']) assert.equal(isAdminLocation(path), false, path);
});

test('admin panel stays closed until verified identity, profile and authorization agree', () => {
  const session = { loading: false, isAdminAuthorized: true, currentUser: { uid: 'real-admin', emailVerified: true }, userProfile: { id: 'real-admin', role: 'admin' } };
  assert.equal(hasVerifiedAdminAccess(session), true);
  for (const invalid of [
    { ...session, loading: true },
    { ...session, isAdminAuthorized: false },
    { ...session, currentUser: null },
    { ...session, userProfile: null },
    { ...session, currentUser: { ...session.currentUser, emailVerified: false } },
    { ...session, userProfile: { id: 'other-account', role: 'admin' } },
    { ...session, userProfile: { id: 'real-admin', role: 'parent' } },
    { ...session, userProfile: { id: 'real-admin', role: 'student' } },
    { ...session, currentUser: null, userProfile: { id: 'demo_admin', role: 'admin' } },
  ]) assert.equal(hasVerifiedAdminAccess(invalid), false);
});
