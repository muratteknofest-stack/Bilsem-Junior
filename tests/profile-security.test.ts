import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApiApp } from '../server/api-app';
import { userProfileUpdateSchema } from '../src/lib/validations';
import { createProfileUpdater } from '../src/lib/profile-updates';
import { createApiTransport } from '../src/lib/api-transport';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const reminder = { enabled: true, reminderTime: '18:30', frequency: 'daily_fixed', browserPushEnabled: false,
  soundAlert: true, weekendIncluded: true, customMessage: 'Keşfe devam!', snoozeUntil: null,
  lastNotifiedDate: '2026-10-25', lastNotifiedHour: 18 };
const token = `fixture.${Buffer.from(JSON.stringify({ session_id: '33333333-3333-4333-8333-333333333333', aal: 'aal1' })).toString('base64url')}.fixture`;

test('profile schema rejects protected fields, bad bounds and nested mass assignment', () => {
  for (const patch of [
    {}, null, [], { grade: 3 }, { id: other, name: 'Kaşif' }, { role: 'admin' }, { xp: 99999 },
    { name: 'Kaşif', linkedStudentIds: [other] }, { name: 'Kaşif', updatedAt: 1 }, { lastLoginAt: 1 },
    { name: 'x' }, { name: 'x'.repeat(51) }, { name: 'Ali\u0000Can' }, { avatar: 'x'.repeat(33) },
    { dailyGoalMinutes: 4 }, { dailyGoalMinutes: 181 }, { dailyGoalQuestions: '10' }, { dailyGoalQuestions: 201 },
    { dailyGoalSessions: 0 }, { dailyGoalSessions: 1.5 }, { soundEnabled: 'true' },
    { featuredBadgeIds: ['first_step', 'first_step'] }, { featuredBadgeIds: ['x', 'y', 'z', 'w'] },
    { reminderConfig: { ...reminder, role: 'admin' } }, { reminderConfig: { ...reminder, reminderTime: '25:00' } },
    { reminderConfig: { ...reminder, customMessage: 'x'.repeat(121) } },
    { reminderConfig: { ...reminder, lastNotifiedDate: '2026-02-30' } },
    { reminderConfig: { ...reminder, lastNotifiedHour: 24 } },
  ]) assert.equal(userProfileUpdateSchema.safeParse(patch).success, false, JSON.stringify(patch));
  assert.deepEqual(userProfileUpdateSchema.parse({ name: '  Kaşif  ', dailyGoalMinutes: 180, dailyGoalQuestions: 200,
    dailyGoalSessions: 10, featuredBadgeIds: [], reminderConfig: reminder }), {
    name: 'Kaşif', dailyGoalMinutes: 180, dailyGoalQuestions: 200, dailyGoalSessions: 10, featuredBadgeIds: [], reminderConfig: reminder,
  });
});

async function fixture(options: { verified?: boolean; active?: boolean; missing?: boolean; pending?: boolean;
  writeFailure?: boolean; quota?: boolean; role?: string } = {}) {
  const saved = Object.fromEntries(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL', 'VERCEL_ENV'].map(key => [key, process.env[key]]));
  delete process.env.VERCEL; delete process.env.VERCEL_ENV;
  process.env.SUPABASE_URL = 'https://profile-fixture.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-server-key';
  const originalFetch = globalThis.fetch;
  const writes: Array<{ id: string; row: Record<string, unknown> }> = [];
  const grades: unknown[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    if (url.hostname === '127.0.0.1') return originalFetch(input, init);
    assert.equal(url.origin, 'https://profile-fixture.invalid', 'Never contact a real provider');
    const single = (row: unknown) => Response.json(request.headers.get('accept')?.includes('vnd.pgrst.object') ? row : [row]);
    if (url.pathname === '/auth/v1/user') return Response.json({ id: owner, email: 'fixture@example.invalid',
      email_confirmed_at: options.verified === false ? null : '2026-10-01T00:00:00Z', app_metadata: {} });
    if (url.pathname === '/rest/v1/rpc/is_user_session_active') return Response.json(options.active !== false);
    if (url.pathname === '/rest/v1/rpc/consume_api_limit') return Response.json(options.quota !== false);
    if (url.pathname === '/rest/v1/profiles') {
      assert.equal(url.searchParams.get('id'), `eq.${owner}`, 'Every read/write must bind the authenticated owner');
      if (request.method === 'PATCH') {
        assert.equal(url.searchParams.get('deletion_pending'), 'eq.false');
        assert.equal(url.searchParams.get('select'), 'id', 'No complete DB row returned by the writer');
        if (options.writeFailure) return Response.json({ code: 'XX000', message: 'fixture-sensitive-database-error' }, { status: 503 });
        if (options.pending) return Response.json([]);
        writes.push({ id: owner, row: await request.json() });
        return single({ id: owner });
      }
      if (options.missing) return Response.json([]);
      return single({ id: owner, role: options.role || 'student', deletion_pending: !!options.pending });
    }
    if (url.pathname === '/rest/v1/rpc/change_student_grade') {
      const body = await request.json(); grades.push(body);
      return Response.json({ id: owner, role: 'student', grade: body.p_grade });
    }
    throw new Error(`Unexpected fixture path: ${url.pathname}`);
  };
  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    writes, grades,
    async call(body: unknown, path = '/api/account/profile', method = 'PATCH', authenticated = true) {
      const response = await originalFetch(base + path, { method, headers: { 'Content-Type': 'application/json',
        ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      return { status: response.status, body: await response.json() };
    },
    async close() {
      globalThis.fetch = originalFetch;
      await new Promise<void>(resolve => server.close(() => resolve()));
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    },
  };
}

test('HTTP profile mutation binds the verified owner, normalizes input and returns only changed settings', async () => {
  const api = await fixture();
  try {
    const before = Date.now();
    const result = await api.call({ name: '  Junior Kaşif  ', avatar: '🦊', dailyGoalMinutes: 20, soundEnabled: false, reminderConfig: reminder });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.changes, { name: 'Junior Kaşif', avatar: '🦊', dailyGoalMinutes: 20, soundEnabled: false, reminderConfig: reminder });
    assert.deepEqual(Object.keys(result.body).sort(), ['changes', 'updatedAt']);
    assert.ok(result.body.updatedAt >= before && result.body.updatedAt <= Date.now());
    assert.deepEqual(api.writes, [{ id: owner, row: { name: 'Junior Kaşif', avatar: '🦊', daily_goal_minutes: 20,
      sound_enabled: false, reminder_config: reminder, updated_at: result.body.updatedAt } }]);
  } finally { await api.close(); }
});

test('HTTP mass assignment and alternate owner filters are rejected before any write', async () => {
  const api = await fixture();
  try {
    for (const patch of [{ id: other, name: 'İsim' }, { grade: 4 }, { role: 'admin' }, { xp: 2000 },
      { soundEnabled: true, consent: {} }, { linkedParentId: other }, { updatedAt: 0 },
      { reminderConfig: { ...reminder, linkedStudentIds: [other] } }]) {
      assert.equal((await api.call(patch)).status, 400);
    }
    assert.equal((await api.call({ name: 'İsim' }, `/api/account/profile?id=${other}`)).status, 400);
    assert.deepEqual(api.writes, []);
  } finally { await api.close(); }
});

test('only the dedicated grade operation reaches the existing session-invalidating database procedure', async () => {
  const api = await fixture();
  try {
    assert.equal((await api.call({ grade: 3 })).status, 400);
    const result = await api.call({ grade: 3 }, '/api/learning/grade');
    assert.equal(result.status, 200); assert.equal(result.body.profile.grade, 3);
    assert.deepEqual(api.grades, [{ p_student: owner, p_grade: 3 }]);
    assert.deepEqual(api.writes, []);
  } finally { await api.close(); }
});

test('profile activity uses server timestamps and rejects client identities and times', async () => {
  const api = await fixture();
  try {
    assert.equal((await api.call({ lastLoginAt: 0 }, '/api/account/profile/activity', 'POST')).status, 400);
    assert.equal((await api.call({ id: other }, '/api/account/profile/activity', 'POST')).status, 400);
    const before = Date.now();
    const result = await api.call({}, '/api/account/profile/activity', 'POST');
    assert.equal(result.status, 200); assert.ok(result.body.lastLoginAt >= before);
    assert.deepEqual(api.writes, [{ id: owner, row: { last_login_at: result.body.lastLoginAt, updated_at: result.body.lastLoginAt } }]);
  } finally { await api.close(); }
});

test('unauthenticated, revoked, unverified, orphaned and forged admin accounts cannot mutate a profile', async () => {
  for (const [options, authenticated, status] of [
    [{}, false, 401], [{ active: false }, true, 401], [{ verified: false }, true, 403],
    [{ missing: true }, true, 403], [{ role: 'admin' }, true, 403],
  ] as const) {
    const api = await fixture(options);
    try { assert.equal((await api.call({ name: 'Kaşif' }, undefined, undefined, authenticated)).status, status); assert.deepEqual(api.writes, []); }
    finally { await api.close(); }
  }
});

test('pending deletion, durable quota rejection and database errors never report success or leak provider errors', async () => {
  for (const [options, status] of [[{ pending: true }, 409], [{ quota: false }, 429], [{ writeFailure: true }, 503]] as const) {
    const api = await fixture(options);
    try {
      const result = await api.call({ name: 'Kaşif' });
      assert.equal(result.status, status); assert.deepEqual(api.writes, []);
      assert.ok(!JSON.stringify(result.body).includes('fixture-sensitive'));
    } finally { await api.close(); }
  }
});

test('client adapter sends only validated preferences through the owned API and rejects a different account locally', async () => {
  let calls = 0;
  const client = createProfileUpdater({ currentUserId: () => owner, async request(path, init) {
    calls++; assert.equal(path, '/api/account/profile'); assert.equal(init.method, 'PATCH'); assert.equal(init.cache, 'no-store');
    assert.deepEqual(JSON.parse(String(init.body)), { name: 'Kaşif' });
    return Response.json({ changes: { name: 'Kaşif' }, updatedAt: 1234 });
  } });
  assert.deepEqual(await client.update(owner, { name: '  Kaşif  ' }), { changes: { name: 'Kaşif' }, updatedAt: 1234 });
  await assert.rejects(client.update(other, { name: 'Başka' }));
  await assert.rejects(client.update(owner, { xp: 999 }));
  await assert.rejects(client.update(owner, { grade: 3 }));
  assert.equal(calls, 1);
});

test('client rejects stale responses after an account switch and malformed or overfetched responses', async () => {
  let current = owner;
  const switched = createProfileUpdater({ currentUserId: () => current, async request() {
    current = other; return Response.json({ changes: { name: 'Kaşif' }, updatedAt: 1234 });
  } });
  await assert.rejects(switched.update(owner, { name: 'Kaşif' }));
  for (const body of [{ profile: { id: other, role: 'admin' } }, { changes: { name: 'Kaşif', role: 'admin' }, updatedAt: 1 },
    { changes: { name: 'Kaşif' }, updatedAt: 1, email: 'other@example.invalid' }]) {
    const client = createProfileUpdater({ currentUserId: () => owner, async request() { return Response.json(body); } });
    await assert.rejects(client.update(owner, { name: 'Kaşif' }));
  }
});

test('client activity sends no timestamps and errors never display raw provider messages', async () => {
  const activity = createProfileUpdater({ currentUserId: () => owner, async request(path, init) {
    assert.equal(path, '/api/account/profile/activity'); assert.equal(init.method, 'POST'); assert.equal(init.body, '{}');
    return Response.json({ lastLoginAt: 4321 });
  } });
  assert.deepEqual(await activity.activity(owner), { lastLoginAt: 4321 });
  const failing = createProfileUpdater({ currentUserId: () => owner, async request() {
    return Response.json({ error: 'fixture-sensitive-provider-stack' }, { status: 503 });
  } });
  await assert.rejects(failing.update(owner, { name: 'Kaşif' }), error => error instanceof Error && !error.message.includes('fixture-sensitive'));
});

test('Android profile PATCH preserves JSON, bearer authentication and the configured API origin', async () => {
  const transport = createApiTransport({ baseUrl: 'https://api.example.invalid', pageOrigin: 'https://localhost',
    browserFetch: async () => { throw new Error('Native request must use the native bridge'); },
    nativeRequest: async options => {
      assert.equal(options.url, 'https://api.example.invalid/api/account/profile');
      assert.equal(options.method, 'PATCH'); assert.equal(options.disableRedirects, true);
      assert.equal(options.headers?.authorization, 'Bearer fixture-user-token');
      assert.equal(options.headers?.cookie, undefined);
      assert.deepEqual(options.data, { soundEnabled: false });
      return { url: options.url, status: 200, headers: { 'Content-Type': 'application/json' },
        data: { changes: { soundEnabled: false }, updatedAt: 1234 } };
    },
  });
  const client = createProfileUpdater({ currentUserId: () => owner, request: (path, init) => transport(path, {
    ...init, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture-user-token' },
  }) });
  assert.deepEqual(await client.update(owner, { soundEnabled: false }), { changes: { soundEnabled: false }, updatedAt: 1234 });
});
