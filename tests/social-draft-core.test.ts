import assert from 'node:assert/strict';
import test from 'node:test';
import { istanbulDate, socialQuestionRejection, socialSlotId } from '../server/social-draft-core.ts';
import { generateProfessionalQuestion } from '../src/features/questions/professional-engine.ts';
import { renderSocialCard } from '../server/social-card.ts';
import sharp from 'sharp';

const question = { ...generateProfessionalQuestion('matrix_2x2', 123, 2), status: 'published' as const };

test('Türkiye yerel günü UTC gece sınırında doğru hesaplanır', () => {
  assert.equal(istanbulDate(new Date('2026-09-23T21:30:00Z')), '2026-09-24');
  assert.equal(socialSlotId('2026-09-24', 'morning'), '2026-09-24_morning');
});

test('doğrulanmış görsel kartlar 1080×1350 JPEG olarak üretilebilir', async () => {
  for (const type of ['matrix_2x2', 'visual_sequence', 'number_pattern'] as const) {
    const q = generateProfessionalQuestion(type, type === 'number_pattern' ? 421 : 123, 2);
    for (const kind of ['question', 'answer'] as const) {
      const svg = renderSocialCard(q, kind);
      const jpeg = await sharp(Buffer.from(svg)).jpeg().toBuffer();
      const metadata = await sharp(jpeg).metadata();
      assert.equal(metadata.width, 1080);
      assert.equal(metadata.height, 1350);
      assert.ok(jpeg.length > 10000);
    }
  }
});

test('yalnızca çözümü doğrulanmış yayımlanmış sorular seçilebilir', () => {
  assert.equal(socialQuestionRejection(question), null);
  assert.match(socialQuestionRejection({ ...question, status: 'draft' })!, /yayımlanmış/);
  assert.match(socialQuestionRejection({ ...question, aiMeta: { generationId: 'x', model: 'x', promptVersion: '1', qualityScore: 70, solverVerified: false, generatedAt: '', durationMs: 0 } })!, /doğrulaması/);
  assert.ok(socialQuestionRejection({ ...question, options: [question.options[0], ...question.options.slice(0, 3)] }));
});
