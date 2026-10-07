import assert from 'node:assert/strict';
import test from 'node:test';
import { generateProfessionalQuestion, solveBoard, VERIFIED_TYPES } from '../src/features/questions/professional-engine';
import { independentlySolveBoard } from '../src/features/questions/independent-board-solver';
import { auditQuestion, isQuestionReadyForStudents } from '../src/features/questions/quality';
import { solveQuestion } from '../src/features/questions/universal-solver';
import { runMultiPassQuestionTests, verifyAndAutoHealQuestion } from '../src/features/questions/verifier';
import { selectPublishedPool } from '../src/features/questions/editorial-data';
import { generateQuestionByType, generateQuestion, STUDENT_CATEGORY_TYPES } from '../src/features/questions/generators';
import { runQuestionPipeline, calculateQualityScore } from '../server/ai-question-pipeline';
import type { BaseQuestion, DifficultyLevel } from '../src/types';

const sample = () => generateProfessionalQuestion('number_pattern', 997, 3);

test('unknown engines and forged verification stamps cannot certify themselves', () => {
  const q = sample(); q.visualConfig = { displayMode: 'text' };
  q.verificationStatus = { isVerified: true, solverChecked: true, confidenceScore: 1, passCount: 5, stages: [], testedAt: 'forged' };
  assert.equal(solveQuestion(q).canSolve, false);
  assert.equal(runMultiPassQuestionTests(q).isVerified, false);
  assert.equal(isQuestionReadyForStudents(q), false);
});

test('wrong key, missing answer and two equivalent correct answers fail closed', () => {
  const q = sample();
  q.correctOptionId = q.options.find(o => o.id !== q.correctOptionId)!.id;
  assert.equal(isQuestionReadyForStudents(q), false);
  const duplicate = sample();
  const correct = duplicate.options.find(o => o.id === duplicate.correctOptionId)!;
  const other = duplicate.options.find(o => o.id !== duplicate.correctOptionId)!;
  other.visualData = structuredClone(correct.visualData); other.fingerprint = 'forged-different';
  assert.equal(solveQuestion(duplicate).ambiguityDetected, true);
  assert.equal(isQuestionReadyForStudents(duplicate), false);
  const missing = sample(); missing.options.find(o => o.id === missing.correctOptionId)!.visualData = { textNumber: -987654 };
  assert.equal(isQuestionReadyForStudents(missing), false);
});

test('altered explanation, prompt, board and hidden option data invalidate proof', () => {
  for (const change of [
    (q: BaseQuestion) => { q.explanation.summary = 'Her adımda yanlış bir sayı çıkarılır.'; },
    (q: BaseQuestion) => { q.prompt = 'Bu dizinin toplamı kaçtır?'; },
    (q: BaseQuestion) => { (q.visualConfig as any).values[3] += 1; },
    (q: BaseQuestion) => { (q.options[0].visualData as any).hiddenAnswer = true; },
    (q: BaseQuestion) => { q.seed += 1; },
    (q: BaseQuestion) => { q.options.find(o => o.id !== q.correctOptionId)!.visualData = {}; },
    (q: BaseQuestion) => { (q as any).targetGrade = 0; },
  ]) { const q = sample(); change(q); assert.equal(isQuestionReadyForStudents(q), false); }
});

test('malformed inputs never crash the audit or verification endpoint', () => {
  for (const value of [null, {}, [], { options: [null] }, { ...sample(), options: null }, { ...sample(), explanation: 5 }]) {
    assert.equal(auditQuestion(value).solverVerified, false);
    assert.equal(isQuestionReadyForStudents(value), false);
    assert.equal(runMultiPassQuestionTests(value as unknown as BaseQuestion).isVerified, false);
  }
});

test('validator never repairs answers, IDs, fingerprints or mutates its input', () => {
  const q = sample(); q.options[1].visualData = structuredClone(q.options[0].visualData);
  const before = structuredClone(q);
  runMultiPassQuestionTests(q);
  assert.deepEqual(q, before);
  assert.throws(() => verifyAndAutoHealQuestion(() => q, 1, 2), /QUESTION_REVIEW_REQUIRED/);
  assert.deepEqual(q, before);
});

test('new independent implementation has hand-calculated oracles', () => {
  assert.deepEqual(independentlySolveBoard({ displayMode: 'verified_board', kind: 'count', items: ['a', 'b', 'a'], target: 'a' }), { textNumber: 2 });
  assert.deepEqual(independentlySolveBoard({ displayMode: 'verified_board', kind: 'numbers', rule: 'growing', values: [1, 3, 6, 10, 15] }), { textNumber: 21 });
  assert.deepEqual(independentlySolveBoard({ displayMode: 'verified_board', kind: 'machine', examples: [[2, 7], [4, 13], [5, 16]], input: 7 }), { textNumber: 22 });
  assert.deepEqual(independentlySolveBoard({ displayMode: 'verified_board', kind: 'transform', tiles: [{ size: 3, cells: [1,0,0,1,1,0,0,0,0] }, null], operation: 'rotate', turns: 1 }), { size: 3, cells: [0,1,1,0,1,0,0,0,0] });
  assert.throws(() => solveBoard({ displayMode: 'verified_board', kind: 'order', names: ['A','B','C'], clues: [['A','B'],['B','C']], position: -1 }));
});

test('every supported type survives 1320 generated, shuffled and corrupted cases', () => {
  for (const type of VERIFIED_TYPES) for (let difficulty = 1; difficulty <= 6; difficulty++) for (let seed = 1; seed <= 20; seed++) {
    const q = generateProfessionalQuestion(type, seed * 433, difficulty as DifficultyLevel);
    q.options.reverse();
    assert.equal(isQuestionReadyForStudents(q), true, `${type}/${difficulty}/${seed}`);
    q.correctOptionId = q.options.find(o => o.id !== q.correctOptionId)!.id;
    assert.equal(isQuestionReadyForStudents(q), false);
  }
});

test('student pools reject stale published questions and audit generated fallbacks', () => {
  const good = sample();
  const stale = { ...structuredClone(good), id: 'stale', status: 'published' as const };
  stale.explanation.summary = 'Hatalı açıklama örneği.';
  assert.equal(selectPublishedPool([good], [stale])[0].id, good.id);
  assert.throws(() => selectPublishedPool([stale], []), /QUESTION_REVIEW_REQUIRED/);
  for (const category of Object.keys(STUDENT_CATEGORY_TYPES)) {
    const generated = generateQuestion({ category: category as any, seed: 1129 });
    assert.equal(generated.category, category);
    assert.equal(isQuestionReadyForStudents(generated), true);
  }
});

test('known legacy duplicate is quarantined, never auto-salted into certification', () => {
  const legacy = generateQuestionByType('logical_sequence', 41002, 2);
  assert.equal(legacy.status, 'draft');
  assert.equal(legacy.verificationStatus?.isVerified, false);
  assert.equal(isQuestionReadyForStudents(legacy), false);
});

function fakeAi(mode: 'pass' | 'wrong' | 'ambiguous' | 'bad-explanation' | 'malformed' = 'pass') {
  const prompts: string[] = [];
  const client = { models: { generateContent: async ({ contents }: { contents: string }) => {
    prompts.push(contents);
    const data = JSON.parse(contents.split('Soru: ')[1]);
    if (!data.explanation) {
      const answer = solveBoard(data.visualConfig);
      const chosenOptionId = data.options.find((o: any) => JSON.stringify(o.visualData) === JSON.stringify(answer)).id;
      return { text: JSON.stringify(mode === 'malformed' ? {} : { chosenOptionId: mode === 'wrong' ? 'NOT_AN_OPTION' : chosenOptionId, uniqueAnswer: mode !== 'ambiguous', sufficientInformation: true, issues: [] }) };
    }
    return { text: JSON.stringify({ explanationCorrect: mode !== 'bad-explanation', gradeAppropriate: true, promptClear: true, distractorsValid: true, issues: [] }) };
  } } };
  return { client, prompts };
}

test('AI review sees a blind question first and cannot override deterministic proof', async () => {
  const { client, prompts } = fakeAi();
  const result = await runQuestionPipeline(client as any, { targetGrade: 3, difficulty: 3, questionType: 'number_pattern' });
  assert.equal(result.success, true, JSON.stringify(result));
  assert.equal(isQuestionReadyForStudents(result.question), true);
  assert.equal(result.question?.status, 'draft');
  assert.doesNotMatch(prompts[0], /correctOptionId|explanation|distractorNotes/);
  assert.match(prompts[1], /explanation/);
});

test('AI disagreement, ambiguity, explanation errors and malformed reviews veto acceptance', async () => {
  for (const mode of ['wrong', 'ambiguous', 'bad-explanation', 'malformed'] as const) {
    const { client } = fakeAi(mode);
    const result = await runQuestionPipeline(client as any, { targetGrade: 3, difficulty: 3, questionType: 'number_pattern', minQualityScore: 0 });
    assert.equal(result.success, false, mode);
    assert.equal(isQuestionReadyForStudents(result.question), false, mode);
  }
  assert.equal(calculateQualityScore({}), 0);
});


test('AI transport failure cannot leave a publishable question behind', async () => {
  const client = { models: { generateContent: async () => { throw new Error('provider unavailable'); } } };
  const result = await runQuestionPipeline(client as any, { targetGrade: 3, difficulty: 3, questionType: 'number_pattern' });
  assert.equal(result.success, false);
  assert.equal(result.qualityScore, 0);
  assert.equal(result.question?.status, 'review');
  assert.equal(isQuestionReadyForStudents(result.question), false);
});
