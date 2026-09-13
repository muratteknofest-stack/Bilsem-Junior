import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_QUESTION_TYPES, generateQuestionByType } from '../src/features/questions/generators/index.ts';
import { validateQuestion } from '../src/features/questions/validator.ts';
import { questionContentKey } from '../src/features/questions/quality.ts';
import { generateQuestionBatch } from '../src/features/questions/batch-generation.ts';
import { GRADE_CONFIGS } from '../src/features/questions/grade-config.ts';
import { QuestionBankService } from '../src/services/question-bank-service.ts';
import type { DifficultyLevel } from '../src/types.ts';

test('forged fingerprints cannot hide identical answer content', () => {
  const q = generateQuestionByType('number_pattern', 22, 2);
  q.options[1].visualData = {...q.options[0].visualData};
  q.options[1].fingerprint = 'pretend-unique';
  assert.equal(validateQuestion(q).isValid, false);
});
test('independent solvers reject a changed answer key', () => {
  for (const type of ['number_pattern','number_pyramid','operation_machine','figure_rotation'] as const) {
    const q = generateQuestionByType(type, 8391, 4);
    q.correctOptionId = q.options.find(o => o.id !== q.correctOptionId)!.id;
    assert.equal(validateQuestion(q).isValid, false, type);
  }
});
test('malformed imports are rejected without crashing', () => {
  const q = generateQuestionByType('number_pattern', 22, 2);
  for (const value of [null, {}, {...q, options: [null,null,null]}, {...q, prompt: 12}, {...q, seed: Infinity}]) {
    assert.equal(validateQuestion(value as any).isValid, false);
  }
});
test('large sample: all 44 families, six difficulties, 100 seeds pass quality gates', () => {
  for (const type of ALL_QUESTION_TYPES) for (let d = 1; d <= 6; d++) for (let seed = 500; seed < 600; seed++) {
    const q = generateQuestionByType(type, seed, d as DifficultyLevel);
    assert.equal(validateQuestion(q).isValid, true, `${type}/${d}/${seed}`);
  }
});
test('batch is reproducible, diverse and stays in grade ranges', async () => {
  const config = { count: 120, seed: 91732, grade: 'balanced' as const, categories: ['matrix','pattern','spatial','attention','numerical'] as const, strategy: 'hard' as const };
  const first = await generateQuestionBatch({...config, categories: [...config.categories]});
  const second = await generateQuestionBatch({...config, categories: [...config.categories]});
  assert.deepEqual(first, second);
  assert.equal(first.questions.length, 120);
  assert.equal(new Set(first.questions.map(questionContentKey)).size, 120);
  for (const q of first.questions) {
    assert.ok(GRADE_CONFIGS[q.targetGrade!].difficultyRange.includes(q.difficulty));
    assert.ok(GRADE_CONFIGS[q.targetGrade!].recommendedTypes.includes(q.type));
  }
  assert.ok(new Set(first.questions.map(q => q.type)).size >= 10);
});
test('batch cancels and impossible category selection fails explicitly', async () => {
  const controller = new AbortController(); controller.abort();
  const config = { count: 10, seed: 99, grade: 1 as const, categories: ['spatial'] as const, strategy: 'easy' as const };
  const result = await generateQuestionBatch({...config, categories: [...config.categories]}, [], undefined, controller.signal);
  assert.equal(result.cancelled, true); assert.equal(result.questions.length, 0);
  await assert.rejects(generateQuestionBatch({...config, categories: ['memory']}));
});
test('bank rejects repeated content, invalid imports and genuinely regenerates variants', () => {
  const bank = new QuestionBankService();
  const q = generateQuestionByType('number_pattern', 29334, 2);
  bank.addBulkQuestions([q]);
  assert.equal(bank.addBulkQuestions([{...q, id:'new-id'}]), 0);
  assert.equal(bank.importQuestionsJson(JSON.stringify([{...q, options:[null,null,null]}])).success, false);
  const copy = bank.duplicateQuestion(q.id);
  assert.ok(copy);
  assert.notEqual(questionContentKey(copy), questionContentKey(q));
  assert.equal(validateQuestion(copy).isValid, true);
});
