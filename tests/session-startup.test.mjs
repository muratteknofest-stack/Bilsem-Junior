import test from 'node:test';
import assert from 'node:assert/strict';
import { observeSession } from '../src/features/auth/session-startup.ts';

const user = { uid: 'student-a', email: 'student-a@zekapark.com', emailVerified: true };
const parent = { uid: 'parent-b', email: 'parent@example.com', emailVerified: true };
const profile = { id: user.uid, role: 'student', name: 'Deniz', xp: 6511 };
const parentProfile = { id: parent.uid, role: 'parent', name: 'Veli' };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const clockEnabled = new WeakSet();
function fixture(t, overrides = {}) {
  if (!clockEnabled.has(t)) { t.mock.timers.enable({ apis: ['setTimeout'] }); clockEnabled.add(t); }
  const states = [];
  const actions = [];
  const signals = [];
  const watches = [];
  let currentId = null;
  let receive;
  let fail;
  const deps = {
    currentUserId: () => currentId,
    subscribe(next, error) { receive = next; fail = error; return () => actions.push('unsubscribe'); },
    canUseAccount: candidate => candidate.emailVerified,
    async loadProfile(candidate) { return candidate.uid === user.uid ? profile : parentProfile; },
    async authorizeAdmin() { return false; },
    activate(value) { actions.push(['activate', value.id]); },
    syncProfile(value) { actions.push(['sync', value.id]); },
    async hydrate(signal) { signals.push(signal); },
    progressUnavailable(id) { actions.push(['progress-error', id]); },
    clearSession() { actions.push('clear'); },
    async signOut() { actions.push('sign-out'); },
    watch(candidate, next) { watches.push({ id: candidate.uid, next }); return () => actions.push(['unwatch', candidate.uid]); },
    onState(state) { states.push(state); },
    notice() {},
    sessionTimeoutMs: 1000,
    progressTimeoutMs: 500,
    ...overrides,
  };
  const stop = observeSession(deps);
  t.after(stop);
  return {
    states, actions, signals, watches, stop,
    emit(candidate) { currentId = candidate?.uid ?? null; receive(candidate); },
    stale(candidate) { receive(candidate); },
    fail(error = new Error('network')) { fail(error); },
    get state() { return states.at(-1); },
  };
}

test('no initial auth event reaches recovery without deleting cached progress', async t => {
  const f = fixture(t);
  t.mock.timers.tick(1000);
  assert.equal(f.state.loading, false);
  assert.ok(f.state.startupError);
  assert.equal(f.state.userProfile, null);
  assert.deepEqual(f.actions, []);
});

test('a stalled profile read stays closed and cannot activate after its deadline', async t => {
  const read = deferred();
  const f = fixture(t, { loadProfile: () => read.promise });
  f.emit(user);
  t.mock.timers.tick(1000);
  assert.ok(f.state.startupError);
  read.resolve(profile); await flush();
  assert.equal(f.state.userProfile, null);
  assert.deepEqual(f.actions, []);
});

test('a transient profile error preserves the session and local progress', async t => {
  const f = fixture(t, { async loadProfile() { throw new Error('network'); } });
  f.emit(user); await flush();
  assert.ok(f.state.startupError);
  assert.deepEqual(f.actions, []);
});

test('a stalled progress read releases only the verified account and aborts late writes', async t => {
  const read = deferred(); let progressSignal;
  const f = fixture(t, { hydrate(signal) { progressSignal = signal; return read.promise; } });
  f.emit(user); await flush();
  assert.equal(f.state.loading, true);
  t.mock.timers.tick(500);
  assert.equal(progressSignal.aborted, true);
  assert.equal(f.state.userProfile, profile);
  assert.equal(f.state.loading, false);
  assert.equal(f.state.startupError, null);
  assert.deepEqual(f.actions, [['activate', user.uid], ['progress-error', user.uid]]);
  const count = f.states.length;
  read.resolve(); await flush();
  assert.equal(f.states.length, count);
});

test('progress rejection opens the verified account with a sync warning', async t => {
  const f = fixture(t, { async hydrate() { throw new Error('network'); } });
  f.emit(user); await flush();
  assert.equal(f.state.userProfile, profile);
  assert.deepEqual(f.actions, [['activate', user.uid], ['progress-error', user.uid]]);
});

test('successful startup completes and cancels both waiting deadlines', async t => {
  const f = fixture(t);
  f.emit(user); await flush();
  assert.equal(f.state.userProfile, profile);
  assert.equal(f.state.isAdminAuthorized, false);
  const count = f.states.length;
  t.mock.timers.tick(2000);
  assert.equal(f.states.length, count);
  assert.equal(f.signals[0].aborted, false);
});

test('late account A profile cannot replace account B', async t => {
  const read = deferred();
  const f = fixture(t, { loadProfile: candidate => candidate.uid === user.uid ? read.promise : Promise.resolve(parentProfile) });
  f.emit(user); f.emit(parent); await flush();
  assert.equal(f.state.userProfile, parentProfile);
  read.resolve(profile); await flush();
  assert.equal(f.state.userProfile, parentProfile);
  assert.deepEqual(f.actions, [['activate', parent.uid]]);
});

test('account switch aborts old hydration and blocks its late UI completion', async t => {
  const read = deferred(); let calls = 0; let oldSignal;
  const f = fixture(t, { hydrate(signal) { if (!calls++) { oldSignal = signal; return read.promise; } return Promise.resolve(); } });
  f.emit(user); await flush(); f.emit(parent); await flush();
  assert.equal(oldSignal.aborted, true);
  assert.equal(f.state.userProfile, parentProfile);
  read.resolve(); await flush(); t.mock.timers.tick(2000);
  assert.equal(f.state.userProfile, parentProfile);
});

test('cached identity is never activated when admin claim verification stalls or denies', async t => {
  const admin = { ...profile, role: 'admin' };
  const claims = deferred();
  const f = fixture(t, { loadProfile: async () => admin, authorizeAdmin: () => claims.promise });
  f.emit(user); await flush(); t.mock.timers.tick(1000);
  assert.ok(f.state.startupError);
  claims.resolve(true); await flush();
  assert.equal(f.state.isAdminAuthorized, false);
  assert.deepEqual(f.actions, []);
});

test('missing, mismatched and invalid role profiles are rejected even if sign-out hangs', async t => {
  for (const value of [null, { ...profile, id: 'other' }, { ...profile, role: 'owner' }]) {
    const f = fixture(t, { loadProfile: async () => value, signOut: () => new Promise(() => {}) });
    f.emit(user); await flush();
    assert.equal(f.state.loading, false);
    assert.equal(f.state.userProfile, null);
    assert.deepEqual(f.actions, ['clear']);
    f.stop();
  }
});

test('unverified users and denied admin claims cannot enter a private page', async t => {
  const unverified = fixture(t);
  unverified.emit({ ...user, emailVerified: false }); await flush();
  assert.equal(unverified.state.userProfile, null);
  assert.deepEqual(unverified.actions, ['clear', 'sign-out']);
  unverified.stop();
  const denied = fixture(t, { loadProfile: async () => ({ ...profile, role: 'admin' }) });
  denied.emit(user); await flush();
  assert.equal(denied.state.isAdminAuthorized, false);
  assert.equal(denied.state.userProfile, null);
});

test('verified admin requires both protected claims and a matching profile', async t => {
  const admin = { ...profile, role: 'admin' };
  const f = fixture(t, { loadProfile: async () => admin, authorizeAdmin: async () => true });
  f.emit(user); await flush();
  assert.equal(f.state.isAdminAuthorized, true);
  assert.equal(f.state.userProfile, admin);
});

test('token refresh keeps the active adventure mounted while the same account revalidates', async t => {
  const second = deferred(); let reads = 0;
  const f = fixture(t, { loadProfile: () => ++reads === 1 ? Promise.resolve(profile) : second.promise });
  f.emit(user); await flush();
  f.emit(user);
  assert.equal(f.state.loading, false);
  assert.equal(f.state.userProfile, profile);
  second.resolve(profile); await flush();
  assert.equal(f.state.loading, false);
  assert.equal(f.state.userProfile, profile);
});

test('profile watcher rejects removal or an unverified privilege upgrade', async t => {
  const f = fixture(t);
  f.emit(user); await flush();
  f.watches[0].next({ ...profile, role: 'admin' }); await flush();
  assert.equal(f.state.userProfile, null);
  assert.equal(f.state.isAdminAuthorized, false);
  assert.ok(f.actions.includes('sign-out'));
});

test('stale queued auth events cannot clear a newer signed-in account', async t => {
  const f = fixture(t);
  f.emit(parent); await flush();
  f.stale(null); f.stale(user); await flush();
  assert.equal(f.state.userProfile, parentProfile);
  assert.ok(!f.actions.includes('clear'));
});

test('unmount cancels timers and ignores all late work', async t => {
  const read = deferred();
  const f = fixture(t, { loadProfile: () => read.promise });
  f.emit(user); const count = f.states.length;
  f.stop(); read.resolve(profile); await flush(); t.mock.timers.tick(5000);
  assert.equal(f.states.length, count);
  assert.deepEqual(f.actions, ['unsubscribe']);
});

test('a fresh auth event can recover after an initial timeout or network error', async t => {
  const f = fixture(t);
  f.fail(); assert.ok(f.state.startupError);
  f.emit(user); await flush();
  assert.equal(f.state.userProfile, profile);
  assert.equal(f.state.startupError, null);
});

test('signed-out users reach public content and clear the session once', async t => {
  const f = fixture(t);
  f.emit(null);
  assert.equal(f.state.loading, false);
  assert.equal(f.state.startupError, null);
  assert.deepEqual(f.actions, ['clear']);
});
