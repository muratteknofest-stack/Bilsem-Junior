import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStudyPlanService } from '../src/services/local-study-plan-service';
import type { UserProfile } from '../src/types';
import type { BaseQuestion } from '../src/types';
import { studyPlanStorageKey } from '../src/services/local-study-plan-service';
import { safeStorage } from '../src/lib/storage';
import { aiHintService } from '../src/services/ai-hint-service';
import { aiMistakeService } from '../src/services/ai-mistake-service';
import { aiStepExplanationService } from '../src/services/ai-step-explanation-service';
import { privacyResponseDeadline } from '../src/lib/privacy-rights';
import { PrivacyRequestDeadline } from '../src/components/admin/PrivacyRequestDeadline';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('switching students on the same device never reuses another student daily plan', async t => {
  let user: UserProfile = { id: '11111111-1111-4111-8111-111111111111', name: 'Birinci', role: 'student', grade: 1, avatar: '🦊', xp: 0, level: 1, streak: 0, lastActiveDate: '', dailyGoalMinutes: 15, todayMinutesSpent: 0, soundEnabled: false, dailyGoalQuestions: 10 };
  const aiDailyPlanService = new LocalStudyPlanService({ getCurrentUser: () => user, getSkillMasteries: () => [], getMistakes: () => [] });
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 503 }));
  const first = await aiDailyPlanService.getTodayPlan(true);
  assert.match(first.greetingTitle, /Birinci/);
  user = { ...user, id: '22222222-2222-4222-8222-222222222222', name: 'Ikinci', grade: 4, dailyGoalQuestions: 30 };
  const second = await aiDailyPlanService.getTodayPlan();
  assert.match(second.greetingTitle, /Ikinci/);
  assert.doesNotMatch(JSON.stringify(second), /Birinci/);
  assert.equal(second.totalTargetQuestions, 30);
  const reopened = new LocalStudyPlanService({ getCurrentUser: () => user, getSkillMasteries: () => [], getMistakes: () => [] });
  assert.match((await reopened.getTodayPlan()).greetingTitle, /Ikinci/);
  user = { ...user, grade: 3, name: 'YeniSinif', dailyGoalQuestions: 20 };
  assert.match((await reopened.getTodayPlan()).greetingTitle, /YeniSinif/);
  assert.equal((await reopened.getTodayPlan()).totalTargetQuestions, 20);
  safeStorage.clear();
});

test('legacy and mismatched persistent plans are discarded rather than assigning inferred ownership', async () => {
  const user = { id: 'cache-scope-student', name: 'Deniz', role: 'student', grade: 2, streak: 0 } as UserProfile;
  const source = { getCurrentUser: () => user, getSkillMasteries: () => [], getMistakes: () => [] };
  const first = await new LocalStudyPlanService(source).getTodayPlan(true);
  const otherPlan = { ...first, greetingTitle: 'Başka çocuğun bilgileri' };
  safeStorage.setItem('bilsem_ai_personalized_daily_plan', JSON.stringify(otherPlan));
  safeStorage.setItem(studyPlanStorageKey(user), JSON.stringify({ scope: 'another-student', plan: otherPlan }));
  const plan = await new LocalStudyPlanService(source).getTodayPlan();
  assert.match(plan.greetingTitle, /Deniz/);
  assert.equal(safeStorage.getItem('bilsem_ai_personalized_daily_plan'), null);
  for (const corrupt of ['null', '{', JSON.stringify({ scope: studyPlanStorageKey(user), plan: { dateKey: first.dateKey, tasks: null } })]) {
    safeStorage.setItem(studyPlanStorageKey(user), corrupt);
    assert.match((await new LocalStudyPlanService(source).getTodayPlan()).greetingTitle, /Deniz/);
  }
  safeStorage.clear();
});

test('learning assistance remains functional with every network request forbidden', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw Error('Child assistance must remain local'); });
  const question = { id: 'local-privacy-question', seed: 55, type: 'pattern_completion', category: 'pattern', difficulty: 1, prompt: 'Diziyi tamamla', options: [{ id: 'a', label: 'Bir' }, { id: 'b', label: 'İki' }], correctOptionId: 'a', explanation: { summary: 'Şekiller sırayla tekrar eder.', ruleTitle: 'Tekrar', steps: ['Diziyi incele', 'Tekrarı bul'] } } as unknown as BaseQuestion;
  const hint = await aiHintService.getHintForQuestion(question);
  const mistake = await aiMistakeService.explainMistake(question, 'b');
  const steps = await aiStepExplanationService.getStepExplanation(question, 'b');
  assert.ok(hint.steps.length && steps.steps.length);
  for (const answer of [hint, mistake, steps]) assert.equal(answer.isAiGenerated, false);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('response tracking preserves the original receipt time across months and leap days', () => {
  const received = '2028-02-01T10:00:00Z';
  const due = '2028-03-02T10:00:00.000Z';
  assert.equal(privacyResponseDeadline(received, Date.parse(received))?.dueAt.toISOString(), due);
  assert.equal(privacyResponseDeadline(received, Date.parse(due))?.daysRemaining, 0);
  assert.equal(privacyResponseDeadline(received, Date.parse(due))?.overdue, false);
  assert.equal(privacyResponseDeadline(received, Date.parse(due) + 1)?.overdue, true);
  assert.equal(privacyResponseDeadline('invalid'), null);
  const html = renderToStaticMarkup(<PrivacyRequestDeadline receivedAt={received} status="open" now={Date.parse(due) + 1}/>);
  assert.match(html, /Süre aşıldı/); assert.match(html, /otomatik silme yapmaz/);
  assert.equal(renderToStaticMarkup(<PrivacyRequestDeadline receivedAt={received} status="resolved"/>), '');
});
