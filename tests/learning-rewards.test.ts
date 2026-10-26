import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleReward, rewardDates, WEEKLY_TARGETS, type RewardFacts, type RewardProgress } from '../server/learning-rewards';
import { LearningError } from '../server/learning-model';
import { createApiApp } from '../server/api-app';
import { rewardClaimSchema } from '../server/learning-rewards';
import { hasWeeklyGrandRewardClaim } from '../src/lib/weekly-grand-reward';
import type { AddressInfo } from 'node:net';
import type { UserProfile } from '../src/types';
const user = { id: 'student', streak: 7, resolvedMistakesCount: 0 } as UserProfile;
const facts: RewardFacts = { answered: 1, correctCategories: {}, hardCorrect: 0, reviewToday: 0, exams: 0, perfect: 0, weekend: 0 };
const progress: RewardProgress = { masteries: [], mistakes: [], categories: {} };
const date = new Date('2026-10-10T08:00:00Z');
test('reward eligibility ignores client badges and requires recorded work', () => {
  assert.equal(eligibleReward('badge','first_step',user,facts,progress,date).xp,25);
  assert.throws(()=>eligibleReward('badge','questions_250',user,facts,progress,date));
  assert.throws(()=>eligibleReward('badge','perfectionist',user,facts,progress,date));
  assert.throws(()=>eligibleReward('badge','unknown',user,facts,progress,date));
  assert.throws(()=>eligibleReward('streak','7',user,{...facts,answered:0},progress,date));
});
test('streak badge and milestone share one reward identity', () => {
  assert.equal(eligibleReward('badge','streak_7',user,facts,progress,date).key,eligibleReward('streak','7',user,facts,progress,date).key);
});
test('daily and weekly rewards use Istanbul dates and reject stale counters', () => {
  assert.deepEqual(rewardDates(new Date('2026-10-11T21:01:00Z')),{day:'2026-10-12',week:'2026-10-12'});
  const p = {...progress,categories:{day:'2026-10-10',weekStart:'2026-10-05',todayCounts:{matrix:5},counts:{matrix:8}}};
  assert.equal(eligibleReward('mission','m2',user,facts,p,date).key,'mission:2026-10-10:m2');
  assert.equal(eligibleReward('weekly','matrix',user,facts,p,date).xp,150);
  assert.throws(()=>eligibleReward('mission','m1',user,facts,p,new Date('2026-10-11T08:00:00Z')));
  assert.throws(()=>eligibleReward('weekly','matrix',user,facts,p,new Date('2026-10-12T08:00:00Z')));
});

function completedWeek(weekStart = rewardDates(date).week): RewardProgress {
  return { ...progress, categories: { weekStart, counts: Object.fromEntries(
    Object.entries(WEEKLY_TARGETS).map(([category, target]) => [category, target.count]),
  ) } };
}

test('weekly grand reward rejects alternate client identities even after all targets are met', () => {
  for (const id of ['audit-check-one', 'audit-check-two', 'GRAND', 'grand ', 'grand:extra', '__proto__']) {
    assert.throws(() => eligibleReward('grand', id, user, facts, completedWeek(), date),
      error => error instanceof LearningError && error.status === 400, id);
  }
});

test('weekly grand reward retains its existing canonical key and requires six current-week targets', () => {
  const reward = eligibleReward('grand', 'grand', user, facts, completedWeek(), date);
  assert.equal(reward.key, 'grand:2026-10-05:grand');
  assert.equal(reward.xp, 500);
  const five = Object.fromEntries(Object.entries(WEEKLY_TARGETS).slice(0, 5).map(([category, target]) => [category, target.count]));
  assert.throws(() => eligibleReward('grand', 'grand', user, facts,
    { ...progress, categories: { weekStart: '2026-10-05', counts: five } }, date));
  assert.throws(() => eligibleReward('grand', 'grand', user, facts, completedWeek('2026-09-28'), date));
  const nextWeek = new Date('2026-10-11T21:01:00Z');
  assert.equal(eligibleReward('grand', 'grand', user, facts, completedWeek('2026-10-12'), nextWeek).key,
    'grand:2026-10-12:grand');
});

test('grand claim validation rejects forged fields and preserves other reward kinds', () => {
  for (const body of [
    { kind: 'grand', id: 'other' }, { kind: 'grand', id: ['grand'] }, { kind: 'grand' },
    { kind: 'grand', id: 'grand', xp: 50000 }, { kind: 'grand', id: 'grand', studentId: 'someone-else' },
  ]) assert.equal(rewardClaimSchema.safeParse(body).success, false);
  for (const [kind, id] of [['badge', 'first_step'], ['streak', '7'], ['mission', 'm1'], ['weekly', 'matrix'], ['grand', 'grand']]) {
    assert.equal(rewardClaimSchema.safeParse({ kind, id }).success, true);
  }
});

test('legacy grand claims display as claimed only in their own week', () => {
  for (const suffix of ['grand', 'audit-check-one', 'grand:extra']) {
    assert.equal(hasWeeklyGrandRewardClaim([`grand:2026-10-05:${suffix}`], '2026-10-05'), true);
  }
  assert.equal(hasWeeklyGrandRewardClaim(['grand:2026-09-28:old', 'weekly:2026-10-05:matrix'], '2026-10-05'), false);
  assert.equal(hasWeeklyGrandRewardClaim([], '2026-10-05'), false);
});

async function rewardApi(options: { legacy?: boolean; historyFailure?: boolean } = {}) {
  const originalFetch = globalThis.fetch;
  const savedUrl = process.env.SUPABASE_URL, savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const savedVercel = process.env.VERCEL, savedTarget = process.env.VERCEL_ENV;
  delete process.env.VERCEL; delete process.env.VERCEL_ENV;
  const student = '11111111-1111-4111-8111-111111111111';
  const sessionId = '22222222-2222-4222-8222-222222222222';
  const token = `fixture.${Buffer.from(JSON.stringify({ session_id: sessionId, aal: 'aal1' })).toString('base64url')}.fixture`;
  const week = rewardDates().week;
  const claims = new Set<string>(options.legacy ? [`grand:${week}:old-client-id`] : []);
  const activity = { rewardReads: 0, rewardWrites: 0, xpAwarded: 0 };
  process.env.SUPABASE_URL = 'https://reward-fixture.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-not-a-real-service-key';
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    if (url.hostname === '127.0.0.1') return originalFetch(input, init);
    assert.equal(url.origin, 'https://reward-fixture.invalid', 'No external services may be called');
    const single = (value: unknown) => Response.json(
      request.headers.get('accept')?.includes('vnd.pgrst.object') ? value : [value],
    );
    if (url.pathname === '/auth/v1/user') return Response.json({ id: student, email: 'fixture@example.invalid',
      email_confirmed_at: '2026-10-01T00:00:00Z', app_metadata: {}, user_metadata: {} });
    if (url.pathname === '/rest/v1/rpc/is_user_session_active' || url.pathname === '/rest/v1/rpc/consume_api_limit') return Response.json(true);
    if (url.pathname === '/rest/v1/profiles') {
      assert.equal(url.searchParams.get('id'), `eq.${student}`);
      return single({ id: student, role: 'student', updated_at: 1 });
    }
    if (url.pathname === '/rest/v1/user_private_state') {
      assert.equal(url.searchParams.get('user_id'), `eq.${student}`);
      return single({ user_id: student, values: {
        zekapark_verified_categories_v1: JSON.stringify(completedWeek(week).categories),
      } });
    }
    if (url.pathname === '/rest/v1/rpc/learning_reward_facts') return Response.json(facts);
    if (url.pathname === '/rest/v1/learning_reward_claims') {
      activity.rewardReads++;
      assert.equal(url.searchParams.get('student_id'), `eq.${student}`);
      assert.equal(url.searchParams.get('reward_key'), `like.grand:${week}:%`);
      assert.equal(url.searchParams.get('limit'), '1');
      if (options.historyFailure) return Response.json({ code: 'XX000', message: 'fixture-unavailable' }, { status: 503 });
      return Response.json([...claims].slice(0, 1).map(reward_key => ({ reward_key })));
    }
    if (url.pathname === '/rest/v1/rpc/claim_learning_reward') {
      const body = await request.json();
      assert.equal(body.p_student, student);
      assert.equal(body.p_key, `grand:${week}:grand`);
      assert.equal(body.p_xp, 500);
      activity.rewardWrites++;
      // Model the existing unique (student_id, reward_key) transaction: retries
      // and simultaneous canonical claims cannot award twice.
      const xpAwarded = claims.has(body.p_key) ? 0 : 500;
      claims.add(body.p_key); activity.xpAwarded += xpAwarded;
      return Response.json({ xpAwarded });
    }
    throw Error(`Unexpected fixture request: ${url.pathname}`);
  };
  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    activity,
    async claim(body: unknown) {
      const response = await originalFetch(`${base}/api/learning/rewards/claim`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
    async close() {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      globalThis.fetch = originalFetch;
      if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
      if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
      if (savedVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = savedVercel;
      if (savedTarget === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = savedTarget;
    },
  };
}

test('reward API rejects alternate identities before consulting or writing the reward ledger', async () => {
  const api = await rewardApi();
  try {
    for (const body of [{ kind: 'grand', id: 'audit-check-one' }, { kind: 'grand', id: 'grand', studentId: 'another-student' }]) {
      assert.equal((await api.claim(body)).status, 400);
    }
    assert.deepEqual(api.activity, { rewardReads: 0, rewardWrites: 0, xpAwarded: 0 });
  } finally { await api.close(); }
});

test('reward API awards the canonical grand reward once across simultaneous requests and retry', async () => {
  const api = await rewardApi();
  try {
    const results = await Promise.all(Array.from({ length: 3 }, () => api.claim({ kind: 'grand', id: 'grand' })));
    assert.ok(results.every(result => result.status === 200));
    assert.equal(results.reduce((sum, result) => sum + result.body.xpAwarded, 0), 500);
    assert.deepEqual(await api.claim({ kind: 'grand', id: 'grand' }), { status: 200, body: { xpAwarded: 0 } });
    assert.equal(api.activity.xpAwarded, 500);
  } finally { await api.close(); }
});

test('reward API treats legacy grand records as claimed and fails closed when history is unavailable', async () => {
  for (const options of [{ legacy: true }, { historyFailure: true }]) {
    const api = await rewardApi(options);
    try {
      const result = await api.claim({ kind: 'grand', id: 'grand' });
      assert.equal(result.status, options.legacy ? 200 : 503);
      if (options.legacy) assert.deepEqual(result.body, { xpAwarded: 0 });
      assert.equal(api.activity.rewardWrites, 0);
      assert.equal(api.activity.xpAwarded, 0);
    } finally { await api.close(); }
  }
});
