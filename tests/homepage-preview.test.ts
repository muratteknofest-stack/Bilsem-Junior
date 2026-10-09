import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GradeExplorer } from '../src/components/landing/GradeExplorer';
import { createGradePreview, GRADE_PREVIEWS, type PreviewGrade } from '../src/components/landing/grade-preview';
import { GRADE_CONFIGS } from '../src/features/questions/grade-config';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';

test('each homepage class route generates a verified, class-compatible example', () => {
  for (const profile of GRADE_PREVIEWS) {
    const question = createGradePreview(profile.grade);
    const config = GRADE_CONFIGS[profile.grade];
    assert.equal(question.type, profile.type);
    assert.ok(config.recommendedTypes.includes(question.type));
    assert.ok(config.difficultyRange.includes(question.difficulty));
    assert.ok(isQuestionReadyForStudents(question));
    assert.equal(question.options.filter(option => option.id === question.correctOptionId).length, 1);
  }
  assert.throws(() => createGradePreview(5 as PreviewGrade), /1–4/);
});

test('class route offers accessible selection and an honest completed-demo action', () => {
  const initial = renderToStaticMarkup(React.createElement(GradeExplorer, { onTry: () => {}, completed: false }));
  assert.equal((initial.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((initial.match(/aria-controls="grade-preview"/g) || []).length, 4);
  assert.match(initial, /aria-live="polite"/);
  assert.match(initial, /1\. sınıf sorusunu dene/);
  const completed = renderToStaticMarkup(React.createElement(GradeExplorer, { onTry: () => {}, completed: true }));
  assert.match(completed, /Deneme sonucuna git/);
  assert.doesNotMatch(completed, /1\. sınıf sorusunu dene/);
});
