import test from 'node:test';
import assert from 'node:assert/strict';
import { levelProgress, readFavoriteCategories, recommendStudy, resumableExam } from '../src/features/student/study-hub-model';
import type { SkillMastery } from '../src/types';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentStudyHub } from '../src/components/StudentStudyHub';

const skill = (category: SkillMastery['category'], mastery: number, attemptCount: number): SkillMastery => ({
  category, categoryName: category, mastery, attemptCount, accuracy: 60, recentTrend: 'neutral',
});

test('level progress restarts at a level boundary and uses only the current level', () => {
  assert.deepEqual(levelProgress(250), { xp: 250, level: 2, earned: 0, remaining: 250, percent: 0 });
  assert.equal(levelProgress(375).percent, 50);
  assert.equal(levelProgress(375).remaining, 125);
  assert.equal(levelProgress(-10).level, 1);
  assert.equal(levelProgress(NaN).percent, 0);
});

test('new learners are invited to explore instead of being labelled weak', () => {
  const recommendation = recommendStudy([skill('matrix', 0, 0)], 0);
  assert.equal(recommendation.category, 'matrix');
  assert.match(recommendation.reason, /henüz çalışma kaydın yok/);
});

test('review takes priority and only attempted skills influence reinforcement', () => {
  const masteries = [skill('matrix', 0, 0), skill('pattern', 40, 8), skill('logic', 60, 12)];
  assert.equal(recommendStudy(masteries, 2).kind, 'mistakes');
  assert.equal(recommendStudy(masteries, 0).category, 'pattern');
  assert.equal(recommendStudy([skill('logic', 90, 12), skill('matrix', 0, 0)], 0).category, 'matrix');
  assert.equal(recommendStudy([], 0).kind, 'practice');
});

test('resume counts only saved answers belonging to the active question set', () => {
  assert.deepEqual(resumableExam({ status: 'in_progress', questions: [{ id: 'a' }, { id: 'b' }],
    answers: { a: 'A', b: '', old: 'B' } }), { answered: 1, total: 2 });
  for (const value of [null, {}, { status: 'completed', questions: [{ id: 'a' }] },
    { status: 'in_progress', questions: [] }, { status: 'in_progress', questions: [null] }]) {
    assert.equal(resumableExam(value), null);
  }
});

test('favorite imports reject invalid categories, remove duplicates and cap the list', () => {
  assert.deepEqual(readFavoriteCategories('["matrix","unknown","matrix","pattern","logic","memory"]'), ['matrix', 'pattern', 'logic']);
  assert.deepEqual(readFavoriteCategories('{"matrix":true}'), []);
  assert.deepEqual(readFavoriteCategories('broken'), []);
  assert.deepEqual(readFavoriteCategories(null), []);
});

test('study hub exposes resume progress and saved category as actionable controls', () => {
  const html = renderToStaticMarkup(React.createElement(StudentStudyHub, {
    masteries: [skill('matrix', 30, 5)], unresolved: 0,
    savedExam: { status: 'in_progress', questions: [{ id: 'a' }, { id: 'b' }], answers: { a: 'A' } },
    favorites: ['matrix'], onFavoriteChange() {}, onPractice() {}, onMistakes() {}, onResumeExam() {},
  }));
  assert.match(html, /Denemeye devam et/);
  assert.match(html, /<progress[^>]+value="1"[^>]+max="2"/);
  assert.match(html, /Matris Tamamlama/);
  assert.match(html, /aria-expanded="false"/);
});
