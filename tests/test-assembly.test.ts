import test from 'node:test';
import assert from 'node:assert/strict';
import { scaffoldDifficultyPlan, orderTestQuestions, describeTestAssembly } from '../src/features/questions/test-assembly';
import { reasoningDifficultyPlan } from '../src/features/questions/reasoning-profile';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { generateQuestion } from '../src/features/questions/generators';
import { isQuestionReadyForStudents, questionStimulusKey, questionVisualKey } from '../src/features/questions/quality';
import { solveQuestion } from '../src/features/questions/universal-solver';
import { recentQuestionExposure, selectLearningQuestions, generateVariedLearningQuestion } from '../server/learning-question-selection';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { LearningError } from '../server/learning-model';

function seededRandom(seed: number) {
  return (maximum: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor(seed / 4294967296 * maximum);
  };
}

test('scaffolding preserves exact grade quotas for short, adventure and full-length tests', () => {
  for (const grade of [1, 2, 3, 4] as const) for (const count of [1, 5, 20, 45, 50]) {
    const original = reasoningDifficultyPlan(grade, count, seededRandom(grade * 100 + count));
    const snapshot = [...original], plan = scaffoldDifficultyPlan(original);
    assert.deepEqual(original, snapshot);
    assert.deepEqual([...plan].sort(), [...original].sort());
    assert.ok(plan.every(level => level >= 1 && level <= EDUCATION_PROFILES[grade].maxDifficulty));
    if (count >= 5) assert.equal(plan[0], Math.min(...original));
  }
});

test('real twenty-question adventures retain category quotas, planned difficulty, proof and novelty across sessions', () => {
  for (const grade of [1, 2, 3, 4] as const) {
    let seed = grade * 800001;
    const history = new Map<string, number>();
    for (let session = 0; session < 3; session++) {
      const randomIndex = seededRandom(grade * 9107 + session);
      const plan = scaffoldDifficultyPlan(reasoningDifficultyPlan(grade, 20, randomIndex));
      const selected = selectLearningQuestions({
        count: 20, category: 'mixed', preferDiverseTypes: true,
        candidates: [], exposure: history, randomIndex, difficultyPlan: plan,
        canUse: q => q.targetGrade === grade && isQuestionReadyForStudents(q),
        generate: (category, typeCounts, difficulty, reasoningCounts) => generateVariedLearningQuestion({
          grade, category, difficulty: difficulty!, seed: ++seed, typeCounts, reasoningCounts,
          exposure: history, randomIndex,
        }),
      });
      assert.deepEqual(selected.map(q => q.difficulty), plan);
      assert.equal(new Set(selected.map(questionStimulusKey)).size, 20);
      assert.equal(new Set(selected.map(questionVisualKey)).size, 20);
      for (const category of AVAILABLE_CATEGORIES) assert.equal(selected.filter(q => q.category === category).length, 2);
      for (const q of selected) {
        assert.ok(!history.has(questionStimulusKey(q)) && !history.has(questionVisualKey(q)));
        const proof = solveQuestion(q);
        assert.ok(proof.canSolve && proof.isMatch && !proof.ambiguityDetected);
      }
      const report = describeTestAssembly(selected);
      assert.equal(report.count, 20);
      assert.ok(Object.keys(report.types).length >= 10);
      assert.ok(report.reasoningFamilies >= 10);
      const exposure = recentQuestionExposure([{questions: selected, created_at: `2026-10-${19 + session}T09:00:00Z`}], true);
      for (const [key, time] of exposure) history.set(key, time);
    }
  }
});

test('normal tests fail on exhausted fresh content; only an explicit repetition policy may reuse history', () => {
  const q = generateQuestion({targetGrade: 2, type: 'number_pattern', difficulty: 2, seed: 82001});
  const options = {
    count: 1, category: 'numerical' as const, candidates: [q],
    exposure: new Map([[questionStimulusKey(q), 100]]),
    canUse: isQuestionReadyForStudents, allowGeneration: false,
    generate: () => { throw Error('Generation was disabled'); },
  };
  assert.throws(() => selectLearningQuestions(options), LearningError);
  assert.equal(selectLearningQuestions({...options, repeatPolicy: 'oldest-first'})[0].id, q.id);
});

test('ordering cannot change a difficulty blueprint or silently discard a question', () => {
  const questions = [1, 2, 3].map(difficulty => generateQuestion({
    targetGrade: 4, type: 'number_pattern', difficulty: difficulty as 1 | 2 | 3, seed: 90100 + difficulty,
  }));
  const selected = orderTestQuestions(questions, [3, 1, 2]);
  assert.deepEqual(selected.map(q => q.difficulty), [3, 1, 2]);
  assert.deepEqual(new Set(selected.map(q => q.id)), new Set(questions.map(q => q.id)));
  assert.throws(() => orderTestQuestions(questions, [1]), /TEST_PLAN_LENGTH/);
  assert.throws(() => orderTestQuestions(questions, [1, 1, 1]), /TEST_PLAN_DIFFICULTY/);
});

test('invalid lengths are rejected before selection or generation', () => {
  for (const count of [0, -1, 1.5, 51, Number.NaN]) {
    assert.throws(() => selectLearningQuestions({
      count, category: 'mixed', candidates: [], exposure: new Map(), canUse: () => true,
      generate: () => { assert.fail('Invalid request reached generation'); },
    }), LearningError);
  }
});
