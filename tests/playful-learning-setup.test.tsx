import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LearningSetupPanel } from '../src/components/student/LearningSetupPanel';
import { difficultyChoices } from '../src/features/student/learning-selection';

const noop = () => {};
function setup(grade: 1|2|3|4, validCount = true, busy = false) {
  return renderToStaticMarkup(<LearningSetupPanel mode="adaptive" grade={grade} review={false} busy={busy} topic="mixed" onTopic={noop} category="mixed" onCategory={noop} difficulty="mixed" onDifficulty={noop} questionCount="10" onCount={noop} validCount={validCount} exam="mini" onExam={noop} exams={[]} onStart={noop} />);
}
test('the playful setup keeps every curriculum topic and only grade-appropriate challenge levels', () => {
  for (const grade of [1,2,3,4] as const) {
    const html = setup(grade);
    assert.equal((html.match(/data-topic=/g) || []).length, 45);
    for (const choice of difficultyChoices(grade)) assert.ok(html.includes(`aria-label="${choice.label}"`));
    for (let level = difficultyChoices(grade).length + 1; level <= 6; level++) assert.ok(!html.includes(`aria-label="${level}. seviye`));
    assert.ok(html.includes('aria-label="Soru sayısı"'));
    assert.ok(html.includes('aria-label="Yeni testi başlat"'));
    assert.ok(html.includes('aria-label="Deneyim tercihi"'));
    assert.ok(html.includes('Tercihleri kapat'));
  }
});
test('invalid custom counts and busy requests cannot launch another session', () => {
  for (const html of [setup(2, false), setup(2, true, true)]) {
    assert.match(html, /<button[^>]+aria-label="Yeni testi başlat"[^>]+disabled=""/);
  }
});
