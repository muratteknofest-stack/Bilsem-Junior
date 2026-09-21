import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptivePriority,
  calculateMasteryUpdate,
  recommendDifficulty,
  selectAdaptiveTarget,
} from '../src/features/adaptive/adaptive-engine.ts';
import type { CognitiveCategory, SkillMastery } from '../src/types.ts';

const mastery = (overrides: Partial<SkillMastery> = {}): SkillMastery => ({
  category: 'matrix',
  categoryName: 'Matris',
  mastery: 50,
  attemptCount: 10,
  accuracy: 60,
  recentTrend: 'neutral',
  ...overrides,
});

test('mastery update rewards hard successes and penalizes easy misses proportionally', () => {
  const now = Date.UTC(2026, 8, 20);
  const hardSuccess = calculateMasteryUpdate(mastery(), true, 6, now);
  const easySuccess = calculateMasteryUpdate(mastery(), true, 1, now);
  const easyMiss = calculateMasteryUpdate(mastery(), false, 1, now);
  const hardMiss = calculateMasteryUpdate(mastery(), false, 6, now);

  assert.ok(hardSuccess.mastery > easySuccess.mastery);
  assert.ok(easyMiss.mastery < hardMiss.mastery);
  assert.equal(hardSuccess.attemptCount, 11);
  assert.equal(hardSuccess.correctCount, 7);
  assert.equal(hardSuccess.accuracy, 64);
  assert.ok((hardSuccess.nextReviewAt || 0) > now);
});

test('difficulty recommendation follows ability and recent response pattern', () => {
  assert.equal(recommendDifficulty(mastery({ mastery: 0, attemptCount: 0, accuracy: 0 })), 1);
  assert.equal(recommendDifficulty(mastery({ mastery: 90 })), 6);
  assert.equal(recommendDifficulty(mastery({ mastery: 45, recentResults: [true, true, true] })), 4);
  assert.equal(recommendDifficulty(mastery({ mastery: 62, recentResults: [false, false] })), 3);
});

test('adaptive priority favors weak, uncertain and overdue skills', () => {
  const now = Date.UTC(2026, 8, 20);
  const strong = mastery({ mastery: 90, attemptCount: 50, accuracy: 90, nextReviewAt: now + 86_400_000 });
  const due = mastery({ mastery: 25, attemptCount: 3, accuracy: 33, nextReviewAt: now - 86_400_000 });
  assert.ok(adaptivePriority(due, now) > adaptivePriority(strong, now) * 2);
});

test('target selection is deterministic with an injected random source', () => {
  const categories: CognitiveCategory[] = ['matrix', 'pattern', 'logic'];
  const items = categories.map((category, index) => mastery({
    category,
    categoryName: category,
    mastery: 20 + index * 20,
    attemptCount: index,
  }));
  assert.deepEqual(
    selectAdaptiveTarget(items, () => 0.42, 1_000),
    selectAdaptiveTarget(items, () => 0.42, 1_000),
  );
});
