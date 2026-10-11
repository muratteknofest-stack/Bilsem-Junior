import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isQuestionReadyForStudents, questionVisualKey } from '../src/features/questions/quality';
import { inspectEducation } from '../src/features/questions/quality-policy';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../src/features/questions/renderers/OptionRenderer';
import { stemKey, type BankQuestion } from './generate-grade-bank';

const input = process.argv[2];
if (!input) throw Error('Usage: node --import tsx scripts/verify-grade-bank.tsx private-bank.json');
const { questions } = JSON.parse(await readFile(input, 'utf8')) as { questions: BankQuestion[] };
assert.equal(questions.length, 4000);
const ids = new Set<string>(), stems = new Set<string>(), visuals = new Set<string>();
const grades: Record<string, number> = {};
for (const q of questions) {
  assert.ok(isQuestionReadyForStudents(q), `Mechanical checks: ${q.id}`);
  const education = inspectEducation(q, q.targetGrade as 1 | 2 | 3 | 4);
  assert.equal([...education.audience, ...education.difficulty, ...education.visual].length, 0, q.id);
  assert.ok(!ids.has(q.id) && !stems.has(stemKey(q)) && !visuals.has(questionVisualKey(q)), `Duplicate: ${q.id}`);
  ids.add(q.id); stems.add(stemKey(q)); visuals.add(questionVisualKey(q));
  grades[q.targetGrade!] = (grades[q.targetGrade!] || 0) + 1;
  const html = renderToStaticMarkup(<><QuestionRenderer question={q} />{q.options.map(option => <OptionRenderer key={option.id} option={option} question={q} questionType={q.type} />)}</>);
  assert.doesNotMatch(html, /Tanımsız sembol|görünümü tanımlı değil|\[object Object\]|correctOptionId|distractorNotes/, q.id);
}
assert.deepEqual(grades, { 1: 1000, 2: 1000, 3: 1000, 4: 1000 });
console.log(JSON.stringify({ total: ids.size, grades, uniqueStems: stems.size, uniqueVisuals: visuals.size, mechanicalAndRenderChecks: 'passed', humanEditorialReview: 'not-performed' }));
