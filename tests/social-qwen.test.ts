import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { buildQwenSocialQuestion, createQwenSocialCandidate, qwenSocialPlanSchema } from '../server/social-qwen.ts';
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

test('Qwen OpenAI uyumlu uç noktasından sosyal taslak üretir', async () => {
  let requested = false;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    requested = req.url === '/compatible-mode/v1/chat/completions' &&
      payload.model === 'qwen-test' && payload.response_format?.type === 'json_object';
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id: 'local-test', object: 'chat.completion', choices: [{ index: 0,
      message: { role: 'assistant', content: JSON.stringify({ type: 'number_pattern', seed: 1001,
        rule: 'add', values: [4, 7, 10, 13, 16, 19], caption: 'Sıradaki sayı hangisi olabilir?' }) }, finish_reason: 'stop' }] }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test sunucusu açılamadı.');
  const original = [process.env.QWEN_API_KEY, process.env.QWEN_BASE_URL, process.env.QWEN_MODEL];
  process.env.QWEN_API_KEY = 'local-test-key';
  process.env.QWEN_BASE_URL = `http://127.0.0.1:${address.port}/compatible-mode/v1`;
  process.env.QWEN_MODEL = 'qwen-test';
  try {
    const result = await createQwenSocialCandidate('2026-09-24_morning');
    assert.equal(requested, true);
    assert.equal(result.question.aiMeta?.model, 'qwen-test');
    assert.equal(socialQuestionRejection(result.question, 90, true), null);
    assert.match(result.caption, /#Zekapark/);
  } finally {
    (['QWEN_API_KEY', 'QWEN_BASE_URL', 'QWEN_MODEL'] as const).forEach((name, index) => {
      if (original[index] === undefined) delete process.env[name];
      else process.env[name] = original[index];
    });
    server.close();
  }
});
