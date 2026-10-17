import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { answerXp, safeXpAward, dailyMissions, weeklyDuel, weeklyLeague } from '../src/features/student/gamification-model';
import { GamificationArena } from '../src/components/GamificationArena';
import type { UserProfile } from '../src/types';

test('score rules preserve base XP, combo thresholds and bounded invalid inputs', () => {
  assert.deepEqual(answerXp('practice', 3, 1), { base: 16, multiplier: 1, comboBonus: 0, total: 16 });
  assert.deepEqual(answerXp('practice', 3, 5), { base: 16, multiplier: 1.5, comboBonus: 55, total: 79 });
  assert.equal(answerXp('adaptive', 3, 5).total, 82);
  for (const n of [-1, NaN, Infinity, Number.MAX_VALUE]) assert.equal(safeXpAward(n), 0);
  assert.equal(answerXp('practice', NaN, NaN).total, 12);
});

test('missions reset across calendar days and use personal goals', () => {
  const user = { dailyGoalQuestions: 10, todayQuestionsSolved: 12, todayMinutesSpent: 5, todaySessionsCompleted: 1, lastActiveDate: '2026-10-06T12:00:00Z' } as UserProfile;
  const missions = dailyMissions(user, new Date('2026-10-06T14:00:00Z'));
  assert.equal(missions[0].completed, true);
  assert.equal(missions[0].progress, 100);
  assert.equal(dailyMissions(user, new Date('2026-10-07T14:00:00Z'))[0].current, 0);
  assert.equal(dailyMissions({ ...user, todayQuestionsSolved: NaN }, new Date('2026-10-06T14:00:00Z'))[0].current, 0);
});

test('weekly competition uses real prior progress and tier boundaries', () => {
  assert.equal(weeklyDuel(15, 20).remaining, 6);
  assert.equal(weeklyDuel(21, 20).won, true);
  assert.equal(weeklyDuel(0, 0).target, 10);
  assert.equal(weeklyLeague(9).name, 'Başlangıç');
  assert.equal(weeklyLeague(10).name, 'Bronz');
  assert.equal(weeklyLeague(25).name, 'Gümüş');
  assert.equal(weeklyLeague(50).name, 'Altın');
});

test('arena renders semantic goals and actionable navigation without fake peers', () => {
  const html = renderToStaticMarkup(React.createElement(GamificationArena, { user: {} as UserProfile,
    thisWeekQuestions: 15, lastWeekQuestions: 20, onPractice() {}, onOpenChallenges() {} }));
  assert.match(html, /Geçen haftaki kendini geç/);
  assert.match(html, /Günlük görevler/);
  assert.match(html, /<progress/);
  assert.match(html, /type="button"/);
  assert.doesNotMatch(html, /NaN|undefined/);
});
