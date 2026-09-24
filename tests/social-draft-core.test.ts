import assert from 'node:assert/strict';
import test from 'node:test';
import { istanbulDate, socialQuestionRejection, socialSlotId } from '../server/social-draft-core.ts';
import type { BaseQuestion } from '../src/types';

const question = {
  status: 'published', prompt: 'Hangi şekil örüntüyü tamamlar?',
  correctOptionId: 'A', explanation: { summary: 'Şekil sırası tekrar eder.' },
  aiMeta: { solverVerified: true, qualityScore: 95 },
  options: ['A', 'B', 'C', 'D'].map(id => ({ id, fingerprint: id, visualData: { textNumber: id } })),
} as BaseQuestion;

test('Türkiye yerel günü UTC gece sınırında doğru hesaplanır', () => {
  assert.equal(istanbulDate(new Date('2026-09-23T21:30:00Z')), '2026-09-24');
  assert.equal(socialSlotId('2026-09-24', 'morning'), '2026-09-24_morning');
});

test('yalnızca çözümü doğrulanmış yayımlanmış sorular seçilebilir', () => {
  assert.equal(socialQuestionRejection(question), null);
  assert.match(socialQuestionRejection({ ...question, status: 'draft' })!, /yayımlanmış/);
  assert.match(socialQuestionRejection({ ...question, aiMeta: { ...question.aiMeta!, solverVerified: false } })!, /doğrulaması/);
  assert.match(socialQuestionRejection({ ...question, options: [question.options[0], ...question.options.slice(0, 3)] })!, /farklı/);
});
