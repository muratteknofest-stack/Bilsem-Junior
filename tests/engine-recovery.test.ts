import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateRecoveredQuestion } from '../src/features/questions/recovered-engine';
import { generateQuestion, generateQuestionByType, ALL_QUESTION_TYPES, STUDENT_CATEGORY_TYPES } from '../src/features/questions/generators';
import { RECOVERED_TYPES, solveBoard, type Board, STUDENT_TYPES } from '../src/features/questions/professional-engine';
import { independentlySolveBoard } from '../src/features/questions/independent-board-solver';
import { auditQuestion, isQuestionReadyForStudents } from '../src/features/questions/quality';
import { diagnosticCases, diagnoseSample, summarizeDiagnostics, runEngineDiagnostics } from '../src/features/questions/engine-diagnostics';
import { evaluateResponse } from '../src/features/questions/answer-interactions';
import { ProfessionalBoard } from '../src/features/questions/renderers/ProfessionalBoard';
import type { DifficultyLevel, CognitiveCategory } from '../src/types';

const levels: DifficultyLevel[] = [1, 2, 3, 4, 5, 6];
test('recovered board rules match hand-calculated answers', () => {
  const cases: [Board, unknown][] = [
    [{ displayMode: 'verified_board', kind: 'pyramid', base: [2, 3, 4] }, { textNumber: 12 }],
    [{ displayMode: 'verified_board', kind: 'pyramid', base: [1, 2, 3, 4, 5] }, { textNumber: 48 }],
    [{ displayMode: 'verified_board', kind: 'path', gridSize: 3, start: [1, 1], moves: ['up', 'right', 'down', 'down'] }, { textNumber: '3. satır, 3. sütun' }],
    [{ displayMode: 'verified_board', kind: 'symmetry', tiles: [{ size: 3, cells: [1, 0, 0, 0, 1, 0, 1, 1, 0] }] }, { size: 3, cells: [1, 0, 1, 0, 1, 0, 1, 1, 1] }],
    [{ displayMode: 'verified_board', kind: 'overlay', tiles: [{ size: 3, cells: [1, 1, 0, 0, 0, 1, 0, 0, 0] }, { size: 3, cells: [1, 0, 1, 0, 0, 0, 1, 0, 0] }, null] }, { size: 3, cells: [1, 1, 1, 0, 0, 1, 1, 0, 0] }],
  ];
  for (const [board, expected] of cases) {
    assert.deepEqual(solveBoard(board), expected);
    assert.deepEqual(independentlySolveBoard(board), expected);
  }
  assert.throws(() => solveBoard({ displayMode: 'verified_board', kind: 'path', gridSize: 3, start: [0, 0], moves: ['left', 'right'] }), /dışına/);
});

test('four recovered engines: 720 deterministic questions reject key, prose and option corruption', () => {
  for (const type of RECOVERED_TYPES) for (const difficulty of levels) for (let i = 1; i <= 30; i++) {
    const seed = i * 4919;
    const q = generateRecoveredQuestion(type, seed, difficulty);
    assert.deepEqual(q, generateRecoveredQuestion(type, seed, difficulty));
    assert.equal(isQuestionReadyForStudents(q), true, `${q.id}: ${JSON.stringify(auditQuestion(q))}`);
    assert.deepEqual(evaluateResponse(q, { mode: 'choice', optionId: q.correctOptionId }), { complete: true, correct: true });
    const wrongKey = structuredClone(q); wrongKey.correctOptionId = q.options.find(o => o.id !== q.correctOptionId)!.id;
    assert.equal(isQuestionReadyForStudents(wrongKey), false);
    assert.equal(evaluateResponse(wrongKey, { mode: 'choice', optionId: wrongKey.correctOptionId }).correct, false);
    const duplicate = structuredClone(q); duplicate.options[1].visualData = duplicate.options[0].visualData;
    assert.equal(isQuestionReadyForStudents(duplicate), false);
    const prose = structuredClone(q); prose.explanation.steps[0] = 'Bu soru için yanlış bir çözüm yöntemi.';
    assert.equal(isQuestionReadyForStudents(prose), false);
  }
});

test('all recovered engines satisfy each grade profile including retrying rejected candidates', () => {
  for (const type of RECOVERED_TYPES) for (const grade of [1, 2, 3, 4] as const) for (const difficulty of levels) for (let seed = 1; seed <= 15; seed++) {
    const q = generateQuestion({ type, targetGrade: grade, difficulty, seed: seed * 487 });
    assert.equal(q.type, type);
    assert.equal(q.targetGrade, grade);
    assert.equal(isQuestionReadyForStudents(q), true, q.id);
  }
});

test('generation never silently changes an unsupported requested category or type', () => {
  for (const category of ['memory', 'verbal'] as CognitiveCategory[]) assert.throws(() => generateQuestion({ category, seed: 1 }), /CATEGORY_UNAVAILABLE/);
  for (const category of Object.keys(STUDENT_CATEGORY_TYPES) as CognitiveCategory[]) assert.equal(generateQuestion({ category, seed: 123 }).category, category);
  assert.throws(() => generateQuestion({ type: 'odd_one_out', seed: 1 }), /REVIEW_REQUIRED/);
  assert.throws(() => generateQuestion({ type: 'shape_combination', category: 'memory', seed: 1 }), /CATEGORY_MISMATCH/);
  assert.throws(() => generateQuestion({ seed: NaN }), /INVALID_GENERATION_INPUT/);
  assert.throws(() => generateQuestionByType('unknown' as never, 1), /UNKNOWN_QUESTION_TYPE/);
});

test('diagnostics exercise all 44 types at all six levels, preserve failures and never pass untested engines', async () => {
  const cases = diagnosticCases(1);
  assert.equal(cases.length, ALL_QUESTION_TYPES.length * 6);
  for (const type of ALL_QUESTION_TYPES) assert.deepEqual(cases.filter(c => c.type === type).map(c => c.difficulty), levels);
  const records = summarizeDiagnostics(cases.map(diagnoseSample));
  for (const record of records) {
    assert.equal(record.samples.length, 6);
    if (STUDENT_TYPES.includes(record.type)) assert.equal(record.status, 'passed', JSON.stringify(record));
    else assert.notEqual(record.status, 'passed');
    for (const sample of record.samples) if (sample.status !== 'passed') assert.ok(sample.reasons.length);
  }
  assert.equal(summarizeDiagnostics([]).every(r => r.status === 'untested'), true);
  assert.equal(diagnoseSample({ type: 'odd_one_out', seed: 300000, difficulty: 3 }).status, 'review');
  assert.equal(diagnoseSample({ type: 'logical_sequence', seed: 300000, difficulty: 3 }).status, 'failed');
  const controller = new AbortController(); controller.abort();
  assert.equal(await runEngineDiagnostics(1, () => assert.fail('aborted test reported progress'), controller.signal), null);
});

test('recovered board views expose givens and unknowns, not a hidden answer', () => {
  const render = (type: typeof RECOVERED_TYPES[number]) => renderToStaticMarkup(React.createElement(ProfessionalBoard, { board: generateRecoveredQuestion(type, 497, 3).visualConfig as Board }));
  const symmetry = render('symmetry_completion');
  assert.match(symmetry, /tamamlanacak/); assert.match(symmetry, /stroke-dasharray/);
  const path = render('direction_path'); assert.match(path, /Başla/); assert.match(path, /İzlenecek adımlar/); assert.match(path, /1\. adım/);
  const pyramid = render('number_pyramid'); assert.match(pyramid, /Sayı piramidi/); assert.match(pyramid, /\?/);
  assert.match(render('shape_combination'), /Eksik desen/);
});
