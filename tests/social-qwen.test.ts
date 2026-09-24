import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQwenSocialQuestion, qwenSocialPlanSchema } from '../server/social-qwen.ts';
import { solveBoard, type Board } from '../src/features/questions/professional-engine.ts';
import { socialQuestionRejection } from '../server/social-draft-core.ts';

test('Qwen sayı dizisi görsel ve dört seçenekle bağımsız olarak doğrulanır', () => {
  const q = buildQwenSocialQuestion({ type: 'number_pattern', seed: 47, values: [3, 5, 9, 11, 15, 17], rule: 'alternate', caption: 'Eksik sayıyı bulun!' }, 'qwen-example', 120);
  assert.equal(socialQuestionRejection(q, 90, true), null);
  const expected = solveBoard(q.visualConfig as Board);
  assert.deepEqual(q.options.find(option => option.id === q.correctOptionId)?.visualData, expected);
  assert.equal(q.aiMeta?.model, 'qwen-example');
  assert.equal(new Set(q.options.map(option => JSON.stringify(option.visualData))).size, 4);
});

test('Şekil varyasyonu Qwen tarafından seçilir, sonuç doğrulanmış motorla oluşturulur', () => {
  const q = buildQwenSocialQuestion({ type: 'matrix_2x2', seed: 123, caption: 'Eksik kare hangisidir?' }, 'qwen-example', 120);
  assert.equal(q.type, 'matrix_2x2');
  assert.equal(socialQuestionRejection(q, 90, true), null);
});

test('Geçersiz Qwen sayıları ve ek anahtarlar reddedilir', () => {
  assert.throws(() => buildQwenSocialQuestion({ type: 'number_pattern', seed: 10, values: [1, 3, 6, 10, 14, 20], rule: 'add', caption: 'Eksik sayıyı bulun!' }, 'qwen-example', 100));
  assert.equal(qwenSocialPlanSchema.safeParse({ type: 'visual_sequence', seed: 10, caption: 'Eksik kare hangisidir?', answer: 'A' }).success, false);
});
