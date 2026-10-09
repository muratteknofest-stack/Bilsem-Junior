import assert from 'node:assert/strict';
import test from 'node:test';
import { generateProfessionalQuestion as generateV2 } from '../src/features/questions/professional-engine-v2';
import { generateProfessionalQuestion as generate, solveBoard, VERIFIED_TYPES, ENGINE_VERSION, type Board } from '../src/features/questions/professional-engine';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';
import type { DifficultyLevel } from '../src/types';

test('v2 published content and v3 questions retain separate reproducible proofs across 660 cases', () => {
  for (const type of VERIFIED_TYPES) for (let d = 1; d <= 6; d++) for (let seed = 1; seed <= 5; seed++) {
    const old = generateV2(type, seed * 937, d as DifficultyLevel);
    const current = generate(type, seed * 937, d as DifficultyLevel);
    assert.equal(isQuestionReadyForStudents(old), true, old.id);
    assert.equal(isQuestionReadyForStudents(current), true, current.id);
    assert.notEqual(old.id, current.id);
    assert.equal(current.authoring?.engine, ENGINE_VERSION);
    old.explanation.summary = 'Bu açıklama sonradan değiştirildi.';
    assert.equal(isQuestionReadyForStudents(old), false);
  }
});

test('readable matrix answers avoid empty/full fields without weakening independent validation', () => {
  for (const type of ['matrix_3x3', 'raven_matrix'] as const) for (let d = 1; d <= 6; d++) for (let seed = 1; seed <= 30; seed++) {
    const q = generate(type, seed * 487, d as DifficultyLevel), b = q.visualConfig as Board;
    const answer = solveBoard(b);
    assert.ok('cells' in answer);
    const filled = answer.cells.reduce((sum, cell) => sum + cell, 0);
    assert.ok(filled >= 2 && filled <= answer.cells.length - 2);
    assert.equal(isQuestionReadyForStudents(q), true);
    assert.ok(new Set(b.tiles!.slice(0, 8).map(t => JSON.stringify(t))).size >= 6);
  }
});

test('numeric distractors represent actual operation errors and explanations include computed results', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const q = generate('operation_machine', seed, 4), b = q.visualConfig as Board;
    const [[x1, y1], [x2, y2]] = b.examples!;
    const multiplier = (y2 - y1) / (x2 - x1), offset = y1 - x1 * multiplier;
    const values = q.options.map(o => (o.visualData as { textNumber: number }).textNumber);
    assert.ok(values.includes(b.input! * multiplier)); // omitted intercept
    assert.ok(values.includes((b.input! + offset) * multiplier)); // reversed operations
    assert.equal(new Set(values).size, 4);
    assert.ok(q.explanation.steps.some(s => s.includes(`${b.input! * multiplier + offset}`)));
    assert.equal(isQuestionReadyForStudents(q), true);
  }
});

test('symbol keys are distinguishable; repetitions, counting loads and ordering increase with difficulty', () => {
  for (let d = 1; d <= 6; d++) for (let seed = 1; seed <= 20; seed++) {
    const symbols = generate('symbol_coding', seed, d as DifficultyLevel).visualConfig as Board;
    assert.equal(new Set(symbols.key!.map(k => k.value)).size, symbols.key!.length);
    if (d >= 3) assert.ok(new Set(symbols.symbols).size < symbols.symbols!.length);
    const count = generate('shape_counting', seed, d as DifficultyLevel).visualConfig as Board;
    assert.ok(count.items!.length >= 12 && count.items!.length <= 36);
    assert.ok(count.items!.filter(s => s === count.target).length >= 2);
    const order = generate('logic_grid', seed, d as DifficultyLevel).visualConfig as Board;
    assert.equal(order.names!.length, d <= 2 ? 4 : d <= 4 ? 5 : 6);
  }
});
