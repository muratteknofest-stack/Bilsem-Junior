import test from 'node:test';
import assert from 'node:assert/strict';
import { balancedCategoryPlan, recentQuestionExposure, selectLearningQuestions, gradeChallengeFloor, pickGradeChallenge, generateVariedLearningQuestion, currentReasoningCandidate } from '../server/learning-question-selection';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { DeadlineFinishGate } from '../src/features/student/answer-progression';
import { generateQuestion } from '../src/features/questions/generators';
import { isQuestionReadyForStudents, questionVisualKey, questionStimulusKey } from '../src/features/questions/quality';
import { LearningError } from '../server/learning-model';
import { QuestionDiversityError } from '../src/features/questions/test-diversity';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { reasoningDifficultyPlan } from '../src/features/questions/reasoning-profile';
import { SeededRNG } from '../src/lib/rng';
import { generateWorkshopQuestion } from '../src/features/questions/workshop-engine';

const numeric = (seed: number) => generateQuestion({ targetGrade: 2, type: 'number_pattern', seed, difficulty: 2 });
const cannotGenerate = () => { throw Error('No more novel content'); };

test('the expanded reading engine preserves saved workshop-3 puzzles and rejects a forged version', () => {
  const oldQuestion = generateWorkshopQuestion('word_scramble_logic', 321, 1, true);
  const newQuestion = generateWorkshopQuestion('word_scramble_logic', 321, 1);
  assert.equal(oldQuestion.authoring?.engine, 'workshop-3');
  assert.equal(newQuestion.authoring?.engine, 'workshop-reading-1');
  assert.notEqual(oldQuestion.id, newQuestion.id);
  assert.ok(isQuestionReadyForStudents(oldQuestion));
  assert.ok(isQuestionReadyForStudents(newQuestion));
  assert.equal(isQuestionReadyForStudents({...oldQuestion, authoring: {...oldQuestion.authoring!, engine: 'workshop-reading-1'}}), false);
});

test('first-grade verbal sessions fill 30 and 45 slots without repeating displayed puzzles', () => {
  for (const legacy of [false, true]) for (const count of [30, 45]) for (const level of [1, 2, 'mixed'] as const) {
    const rng = new SeededRNG(count * 7919 + (level === 'mixed' ? 999 : level) + Number(legacy));
    const randomIndex = (max: number) => rng.nextInt(0, max - 1);
    const plan = level === 'mixed' ? reasoningDifficultyPlan(1, count, randomIndex) : Array(count).fill(level);
    const selected = selectLearningQuestions({
      count, category: 'verbal', candidates: [], exposure: new Map(), difficultyPlan: plan,
      preferDiverseTypes: true, randomIndex,
      canUse: q => q.targetGrade === 1 && currentReasoningCandidate(q, 1, !legacy) && isQuestionReadyForStudents(q),
      generate: (category, typeCounts, difficulty, reasoningCounts) => generateVariedLearningQuestion({
        grade: 1, category, typeCounts, difficulty: difficulty!, reasoningCounts,
        seed: rng.nextInt(1, 2147483646), randomIndex, legacy,
      }),
    });
    assert.equal(selected.length, count);
    assert.equal(new Set(selected.map(questionStimulusKey)).size, count);
    assert.deepEqual(selected.map(q => q.difficulty).sort(), [...plan].sort());
    assert.ok(new Set(selected.map(q => {
      const data = q.options.find(o => o.id === q.correctOptionId)!.visualData;
      return data && 'textNumber' in data ? data.textNumber : undefined;
    })).size >= 10);
  }
});

test('mixed plans cover all ten categories with quota differences of at most one', () => {
  for (const count of [5, 15, 30, 45]) {
    const plan = balancedCategoryPlan(count, 'mixed', () => 0);
    const counts = AVAILABLE_CATEGORIES.map(category => plan.filter(value => value === category).length);
    assert.equal(plan.length, count);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
    if (count >= 10) assert.ok(counts.every(value => value > 0));
    else assert.equal(new Set(plan).size, count);
  }
  assert.deepEqual(balancedCategoryPlan(5, 'memory'), Array(5).fill('memory'));
});

test('exposure survives opaque session IDs and choice shuffling and retains the latest assignment', () => {
  const q = numeric(21), renamed = { ...q, id: 'opaque-different-id', options: [...q.options].reverse() };
  const history = recentQuestionExposure([
    { created_at: '2026-10-12T09:00:00Z', questions: [q] },
    { created_at: '2026-10-13T09:00:00Z', questions: [renamed] },
    { created_at: 'invalid', questions: [q] },
  ]);
  assert.equal(history.size, 1);
  assert.equal(history.get(questionStimulusKey(q)), Date.parse('2026-10-13T09:00:00Z'));
});

test('unassigned questions are selected first; finite pools reuse the oldest assignment before a newer one', () => {
  const recent = numeric(21), old = numeric(42), unseen = numeric(63);
  const exposure = new Map([[questionVisualKey(recent), 200], [questionVisualKey(old), 100]]);
  const selected = selectLearningQuestions({ count: 2, category: 'numerical', candidates: [recent, old, unseen],
    exposure, canUse: isQuestionReadyForStudents, generate: cannotGenerate, randomIndex: () => 0, repeatPolicy: 'oldest-first' });
  assert.equal(selected.length, 2);
  assert.ok(selected.some(q => q.id === unseen.id));
  assert.ok(selected.some(q => q.id === old.id));
  assert.ok(!selected.some(q => q.id === recent.id));
});

test('a newly proved variant is preferred over a recently assigned bank question', () => {
  const recent = numeric(21), novel = numeric(42);
  const selected = selectLearningQuestions({ count: 1, category: 'numerical', candidates: [recent],
    exposure: new Map([[questionVisualKey(recent), 100]]), canUse: isQuestionReadyForStudents, generate: () => novel });
  assert.equal(selected[0].id, novel.id);
});

test('fresh question types are balanced within an area before repeating the same template', () => {
  const patterns = Array.from({length:8},(_,i)=>generateQuestion({targetGrade:2,type:'visual_sequence',difficulty:2,seed:40000+i*997}));
  const other = Array.from({length:4},(_,i)=>generateQuestion({targetGrade:2,type:'number_pattern',difficulty:2,seed:80000+i*997}));
  const numerical = Array.from({length:4},(_,i)=>generateQuestion({targetGrade:2,type:'number_pyramid',difficulty:2,seed:90000+i*997}));
  const selected=selectLearningQuestions({count:4,category:'numerical',candidates:[...patterns,...other,...numerical],exposure:new Map(),canUse:q=>q.category==='numerical'&&isQuestionReadyForStudents(q),generate:cannotGenerate,randomIndex:()=>0});
  assert.equal(selected.filter(q=>q.type==='number_pattern').length,2);
  assert.equal(selected.filter(q=>q.type==='number_pyramid').length,2);
});

test('renamed duplicates and invalid candidates cannot fill a quota or relax the proof gate', () => {
  const q = numeric(21), wrong = { ...numeric(42), correctOptionId: 'INVALID' };
  assert.throws(() => selectLearningQuestions({ count: 2, category: 'numerical',
    candidates: [q, { ...q, id: 'same-visual-new-id' }, wrong], exposure: new Map(),
    canUse: isQuestionReadyForStudents, generate: () => wrong }), QuestionDiversityError);
});

test('balanced 45-question exams can be generated with independent proofs at every class level', () => {
  for (const grade of [1, 2, 3, 4] as const) for (let difficulty = 1; difficulty <= EDUCATION_PROFILES[grade].maxDifficulty; difficulty++) {
    let seed = grade * 123456 + difficulty * 971;
    const selected = selectLearningQuestions({ count: 45, category: 'mixed', candidates: [], exposure: new Map(),
      canUse: q => q.targetGrade === grade && isQuestionReadyForStudents(q),
      generate: category => generateQuestion({ profile: 'professional', category, targetGrade: grade,
        difficulty: difficulty as 1 | 2 | 3 | 4 | 5 | 6, seed: ++seed }), randomIndex: () => 0 });
    assert.equal(selected.length, 45);
    assert.equal(new Set(selected.map(questionVisualKey)).size, 45);
    const counts = AVAILABLE_CATEGORIES.map(category => selected.filter(q => q.category === category).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
  }
});

test('deadline completion waits for expiry and active answer saves, retries with backoff, and has a hard limit', () => {
  const gate = new DeadlineFinishGate(), deadline = 10_000;
  assert.equal(gate.take('exam-a', deadline, 9999, false), false);
  assert.equal(gate.take('exam-a', deadline, 10_000, true), false);
  assert.equal(gate.take('exam-a', deadline, 10_000, false), true);
  assert.equal(gate.take('exam-a', deadline, 10_500, false), false);
  assert.equal(gate.take('exam-a', deadline, 11_000, false), true);
  assert.equal(gate.take('exam-a', deadline, 12_999, false), false);
  assert.equal(gate.take('exam-a', deadline, 13_000, false), true);
  assert.equal(gate.take('exam-a', deadline, 99_000, false), false);
  assert.equal(gate.take('exam-b', deadline, 99_000, false), true);
  assert.equal(new DeadlineFinishGate().take('invalid', NaN, 99_000, false), false);
});

test('mixed-difficulty questions honor the class challenge floor without overriding a chosen easy level', () => {
  const expected: Record<1 | 2 | 3 | 4, number[]> = {
    1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [4, 5, 6],
  };
  for (const grade of [1, 2, 3, 4] as const) {
    assert.equal(gradeChallengeFloor(grade), expected[grade][0]);
    const actual = expected[grade].map((_, index) => pickGradeChallenge(grade, () => index));
    assert.deepEqual(actual, expected[grade]);
    assert.ok(actual.every(level => level <= EDUCATION_PROFILES[grade].maxDifficulty));
  }
  // Level 1 remains valid for 4th grade when the student deliberately requests it.
  assert.equal(generateQuestion({ targetGrade: 4, type: 'number_pattern', difficulty: 1, seed: 9941 }).difficulty, 1);
});

test('unseen grade-level content replaces easy bank filler in a mixed fourth-grade test', () => {
  const easy = generateQuestion({ targetGrade: 4, type: 'number_pattern', difficulty: 1, seed: 99313 });
  let seed = 192000;
  const chosen = selectLearningQuestions({
    count: 3, category: 'numerical', candidates: [easy], exposure: new Map(),
    canUse: q => q.targetGrade === 4 && q.difficulty >= gradeChallengeFloor(4) && isQuestionReadyForStudents(q),
    generate: (category, typeCounts) => generateVariedLearningQuestion({
      grade: 4, category, difficulty: pickGradeChallenge(4, () => 1), seed: ++seed, typeCounts, randomIndex: () => 0,
    }),
    preferDiverseTypes: true, randomIndex: () => 0,
  });
  assert.equal(chosen.length, 3);
  assert.ok(chosen.every(q => q.difficulty === 5 && q.targetGrade === 4));
  assert.ok(new Set(chosen.map(questionStimulusKey)).size === 3);
  assert.ok(new Set(chosen.map(q => q.type)).size >= 2);
});

