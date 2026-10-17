import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import learningRoutes from '../server/routes/learning-routes';
import challengeRoutes from '../server/routes/challenge-routes';
import studentAiRoutes from '../server/routes/student-ai-routes';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
import { generateQuestion } from '../src/features/questions/generators';
import { prepareLearningQuestions, type LearningSession } from '../server/learning-model';

// Exercise the real auth, database queries, membership guard and HTTP routes.
// The isolated provider has no paid orders; disabled sales must not unlock premium.
test('free accounts retain daily questions and history while premium routes reject direct and resumed access', { timeout: 20000 }, async () => {
  const originalFetch = globalThis.fetch, previousEnv = { ...process.env };
  Object.assign(process.env, { SUPABASE_URL: 'https://membership-fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'isolated-test', GOOGLE_PLAY_ENFORCE_PAID_ACCESS: 'false', GOOGLE_PLAY_BILLING_ENABLED: 'false' });
  const student = '22222222-2222-4222-8222-222222222222', parent = '11111111-1111-4111-8111-111111111111';
  let linked = true, outage = false, profileFailure = false, ledgerReads = 0;
  const q = generateQuestion({ targetGrade: 2, seed: 7351 });
  const session: LearningSession = { id: '33333333-3333-4333-8333-333333333333', student_id: student, mode: 'practice', title: 'Önceki çalışma', questions: prepareLearningQuestions([q]), answers: {}, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 3600000).toISOString(), finished_at: null, result: null, revision: 0, rewarded_xp: 0 };
  globalThis.fetch = (async (input, init) => {
    const req = new Request(input as RequestInfo, init), url = new URL(req.url);
    if (url.hostname !== 'membership-fixture.invalid') return originalFetch(input, init);
    let data: unknown;
    if (url.pathname === '/auth/v1/user') data = { id: student, email_confirmed_at: new Date().toISOString(), app_metadata: { role: 'student' } };
    else if (url.pathname.endsWith('/is_user_session_active') || url.pathname.endsWith('/consume_api_limit')) data = true;
    else if (url.pathname === '/rest/v1/platform_settings') data = { settings: defaultPlatformSettings(), revision: 1, updated_at: null };
    else if (url.pathname === '/rest/v1/profiles') {
      if (profileFailure && url.searchParams.get('select') === 'linked_parent_id') return Response.json({ message: 'private-failure' }, { status: 503 });
      data = url.searchParams.get('id') === 'eq.' + parent ? { id: parent, role: 'parent', linked_student_ids: [student] } : { id: student, role: 'student', grade: 2, linked_parent_id: linked ? parent : null };
    } else if (url.pathname === '/rest/v1/google_play_subscriptions' || url.pathname === '/rest/v1/shopier_access_orders') {
      ledgerReads++;
      if (outage) return Response.json({ message: 'private-provider-failure' }, { status: 503 });
      data = [];
    } else if (url.pathname === '/rest/v1/daily_challenge_attempts') data = [];
    else if (url.pathname.endsWith('/issue_daily_challenge')) data = { id: '44444444-4444-4444-8444-444444444444', slot: 1, day: '2026-10-17', question: q };
    else if (url.pathname === '/rest/v1/learning_sessions') data = url.searchParams.has('id') ? session : [];
    else throw Error('Unexpected fixture endpoint: ' + url.pathname);
    return Response.json(data);
  }) as typeof fetch;
  const app = express(); app.use(express.json()); app.use('/api', learningRoutes, challengeRoutes, studentAiRoutes);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const token = ['fixture', Buffer.from(JSON.stringify({ session_id: '99999999-9999-4999-8999-999999999999', aal: 'aal1' })).toString('base64url'), 'fixture'].join('.');
  const request = (path: string, body?: object, authenticated = true) => originalFetch(origin + '/api/' + path, { ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}), headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + token } : {}) } });
  try {
    assert.equal((await request('learning/access', undefined, false)).status, 401);
    const access = await request('learning/access'); assert.equal(access.status, 200); assert.equal(access.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await access.json(), { active: false, expiresAt: null, freeDailyQuestions: 3 });
    for (const [path, body] of [
      ['learning/start', { mode: 'practice' }], ['learning/start', { mode: 'adaptive' }], ['learning/start', { mode: 'exam' }],
      ['learning/review', { mistakeId: 'old-mistake' }], [`learning/${session.id}/answer`, { index: 0, response: { mode: 'choice', optionId: q.correctOptionId } }],
      ['learning/rewards/claim', { kind: 'weekly', id: 'weekly-pattern' }], ['ai-hint', {}], ['ai-explain-mistake', {}], ['ai-step-explanation', {}], ['ai-daily-plan', {}],
    ] as Array<[string, object]>) {
      const response = await request(path, body); assert.equal(response.status, 403, path);
      const error = await response.json() as { code: string }; assert.equal(error.code, 'MEMBERSHIP_REQUIRED');
    }
    assert.equal((await request('learning/' + session.id)).status, 403, 'old unfinished sessions cannot bypass membership');
    assert.equal((await request('learning/' + session.id + '/finish', {})).status, 403, 'finishing an old session cannot expose unearned solutions');
    session.finished_at = new Date().toISOString();
    assert.equal((await request('learning/' + session.id)).status, 200, 'own completed results remain available');
    assert.equal((await request('learning/history')).status, 200);
    outage = true;
    const unavailable = await request('learning/access'); assert.equal(unavailable.status, 503); assert.doesNotMatch(await unavailable.text(), /private-provider/);
    const before = ledgerReads;
    const summary = await request('challenges/today'); assert.equal(summary.status, 200); assert.equal((await summary.json() as { limit: number }).limit, 3);
    const daily = await request('challenges/start', {}); assert.equal(daily.status, 200); assert.equal(ledgerReads, before, 'free daily questions are independent of billing availability');
    assert.ok(!JSON.stringify(await daily.json()).includes('correctOptionId'));
    outage = false; linked = false;
    assert.deepEqual(await (await request('learning/access')).json(), { active: false, expiresAt: null, freeDailyQuestions: 3 });
    assert.equal((await request('learning/start', { mode: 'practice', active: true })).status, 400);
    profileFailure = true; assert.equal((await request('learning/access')).status, 503);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve())); globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
  }
});
