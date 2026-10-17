import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleReward, rewardDates, type RewardFacts, type RewardProgress } from '../server/learning-rewards';
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
