import assert from 'node:assert/strict';
import test from 'node:test';
import { generateProfessionalQuestion } from '../src/features/questions/professional-engine';
import { EditorialValidationError, prepareEditorialQuestion } from '../server/editorial-validation';

const validQuestion = () => generateProfessionalQuestion('visual_sequence', 84712, 2);

test('publication requires explicit review and preserves revision ownership', () => {
  const question = validQuestion();
  assert.throws(() => prepareEditorialQuestion(question, 'published', 2, false, 'admin-1'), EditorialValidationError);
  const saved = prepareEditorialQuestion(question, 'published', 2, true, 'admin-1', [], '2026-10-08T12:00:00.000Z');
  assert.equal(saved.status, 'published');
  assert.equal(saved.revision, 3);
  assert.equal(saved.reviewedBy, 'admin-1');
  assert.equal(saved.updatedBy, 'admin-1');
  assert.equal(question.status, 'draft');
});

test('altered answer keys and reused visual questions cannot be published', () => {
  const question = validQuestion();
  const wrong = structuredClone(question);
  wrong.correctOptionId = wrong.options.find(option => option.id !== question.correctOptionId)!.id;
  assert.throws(() => prepareEditorialQuestion(wrong, 'published', 0, true, 'admin-1'), EditorialValidationError);
  const duplicate = { ...question, id: 'another-id' };
  assert.throws(() => prepareEditorialQuestion(duplicate, 'published', 0, true, 'admin-1', [question]), EditorialValidationError);
});

test('draft edits remove previous review identity', () => {
  const question = { ...validQuestion(), reviewedBy: 'old-reviewer' };
  const saved = prepareEditorialQuestion(question, 'draft', 1, false, 'admin-2');
  assert.equal(saved.status, 'draft');
  assert.equal(saved.reviewedBy, undefined);
});
