import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_QUESTION_TYPES, generateQuestionByType } from '../src/features/questions/generators/index.ts';
import { validateQuestion } from '../src/features/questions/validator.ts';
import type { DifficultyLevel } from '../src/types.ts';

const difficulties: DifficultyLevel[] = [1, 2, 3, 4, 5, 6];

test('all question generators are deterministic and structurally valid', () => {
  for (const type of ALL_QUESTION_TYPES) {
    for (const difficulty of difficulties) {
      const seed = 41_000 + difficulty;
      const first = generateQuestionByType(type, seed, difficulty);
      const second = generateQuestionByType(type, seed, difficulty);
      assert.deepEqual(second, first, `${type} level ${difficulty} is not deterministic`);

      const validation = validateQuestion(first);
      assert.equal(
        validation.isValid,
        true,
        `${type} level ${difficulty}: ${validation.errors.map((error) => error.message).join('; ')}`,
      );
      assert.ok(first.options.some((option) => option.id === first.correctOptionId));
      assert.match(first.id, new RegExp(`^${type}-v\\d+-d${difficulty}-s\\d+$`));
    }
  }
});

test('question IDs do not collide across type, difficulty and seed', () => {
  const ids = new Set<string>();
  for (const type of ALL_QUESTION_TYPES) {
    for (const difficulty of difficulties) {
      for (let seed = 1; seed <= 25; seed += 1) {
        const question = generateQuestionByType(type, seed, difficulty);
        assert.equal(ids.has(question.id), false, `duplicate ID: ${question.id}`);
        ids.add(question.id);
      }
    }
  }
  assert.equal(ids.size, ALL_QUESTION_TYPES.length * difficulties.length * 25);
});
