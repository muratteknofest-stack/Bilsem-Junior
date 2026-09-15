import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateProfessionalQuestion, solveBoard, transformTile, VERIFIED_TYPES, type Board } from '../src/features/questions/professional-engine.ts';
import { auditQuestion, questionVisualKey, questionContentKey } from '../src/features/questions/quality.ts';
import { parseQuestionImport, selectPublishedPool } from '../src/features/questions/editorial-data.ts';
import { ProfessionalBoard } from '../src/features/questions/renderers/ProfessionalBoard.tsx';
import type { DifficultyLevel } from '../src/types.ts';

test('11 upgraded engines produce deterministic, uniquely solvable items over 3300 cases', () => {
  for (const type of VERIFIED_TYPES) for (let d = 1; d <= 6; d++) for (let seed = 1; seed <= 50; seed++) {
    const q = generateProfessionalQuestion(type, seed * 7919, d as DifficultyLevel);
    const report = auditQuestion(q);
    assert.deepEqual(report.errors, [], type + ' difficulty ' + d + ' seed ' + seed);
    assert.equal(report.solverVerified, true);
    assert.deepEqual(q, generateProfessionalQuestion(type, seed * 7919, d as DifficultyLevel));
    assert.equal(q.status, 'draft');
    assert.equal(new Set(q.options.map(o => JSON.stringify(o.visualData))).size, 4);
  }
});

test('coordinate transforms have independently specified expected outputs', () => {
  const tile = { size: 3, cells: [1, 0, 0, 1, 1, 0, 0, 0, 0] };
  assert.deepEqual(transformTile(tile, 'rotate').cells, [0, 1, 1, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(transformTile(tile, 'mirrorX').cells, [0, 0, 1, 0, 1, 1, 0, 0, 0]);
  assert.deepEqual(transformTile(tile, 'mirrorY').cells, [0, 0, 0, 1, 1, 0, 1, 0, 0]);
  assert.deepEqual(transformTile(tile, 'rotate', 4), tile);
});

test('arithmetic and order solvers calculate from examples, not declared answers', () => {
  assert.deepEqual(solveBoard({ displayMode: 'verified_board', kind: 'machine', examples: [[2, 7], [4, 13], [5, 16]], input: 7 }), { textNumber: 22 });
  assert.deepEqual(solveBoard({ displayMode: 'verified_board', kind: 'numbers', values: [1, 3, 6, 10, 15], rule: 'growing' }), { textNumber: 21 });
  assert.throws(() => solveBoard({ displayMode: 'verified_board', kind: 'order', names: ['Ada', 'Ece', 'Can'], clues: [], position: 1 }), /tek çözümlü/);
});

test('wrong keys, forged option fingerprints and ambiguous matrices are blocked', () => {
  const q = generateProfessionalQuestion('matrix_3x3', 54321, 4);
  const wrong = structuredClone(q); wrong.correctOptionId = q.options.find(o => o.id !== q.correctOptionId)!.id;
  assert.ok(auditQuestion(wrong).errors.some(e => e.includes('cevap anahtarı')));
  const duplicate = structuredClone(q); duplicate.options[1].visualData = duplicate.options[0].visualData;
  duplicate.options[1].fingerprint = 'forged-unique-value';
  assert.ok(auditQuestion(duplicate).errors.some(e => e.includes('aynı olan seçenekler')));
  const empty = { size: 3, cells: Array(9).fill(0) };
  assert.throws(() => solveBoard({ displayMode: 'verified_board', kind: 'matrix', tiles: [...Array(8).fill(empty), null], columns: 3 }), /tek bir ortak kural/);
});

test('novelty ignores seed, IDs and shuffled options; imports are atomic drafts', () => {
  const q = generateProfessionalQuestion('matrix_2x2', 99, 2);
  const clone = structuredClone(q); clone.id = 'other'; clone.seed = 777; clone.options.reverse();
  assert.equal(questionVisualKey(q), questionVisualKey(clone));
  assert.ok(auditQuestion(clone, [q]).errors.some(e => e.includes('zaten var')));
  const imported = parseQuestionImport(JSON.stringify({ questions: [{ ...q, revision: 22, status: 'published', reviewedBy: 'forged' }, clone] }), []);
  assert.equal(imported.length, 1); assert.equal(imported[0].status, 'draft');
  assert.equal('reviewedBy' in imported[0], false);
  assert.throws(() => parseQuestionImport(JSON.stringify([q, { type: 'bad' }]), []));
  assert.throws(() => parseQuestionImport('null', []));
  const edit = { ...q, explanation: { ...q.explanation, summary: 'Yeni eğitmen açıklaması.' } };
  assert.notEqual(questionContentKey(edit), questionContentKey(q));
});

test('published pool excludes drafts and wrong grades and avoids duplicates', () => {
  const q = { ...generateProfessionalQuestion('number_pattern', 5, 2), targetGrade: 1 as const };
  const published = { ...q, id: 'published', status: 'published' as const };
  const selected = selectPublishedPool([q, q], [published, { ...published, id: 'draft', status: 'draft' }]);
  assert.equal(selected[0].id, 'published'); assert.equal(selected[1].id, q.id);
  assert.equal(selectPublishedPool([q], [{ ...published, targetGrade: 4 }])[0].id, q.id);
});

test('every upgraded visual renders a populated question surface at each level', () => {
  for (const type of VERIFIED_TYPES) for (const difficulty of [1, 3, 6] as const) {
    const q = generateProfessionalQuestion(type, 83471, difficulty);
    const html = renderToStaticMarkup(React.createElement(ProfessionalBoard, { board: q.visualConfig as Board }));
    assert.ok(html.length > 300, type);
    assert.doesNotMatch(html, /NaN|undefined/);
  }
});

test('different seeds provide substantive variety', () => {
  for (const type of VERIFIED_TYPES) {
    const keys = new Set(Array.from({ length: 100 }, (_, i) => questionVisualKey(generateProfessionalQuestion(type, (i + 1) * 991, 3))));
    assert.ok(keys.size >= 90, type + ': ' + keys.size + '/100 unique questions');
  }
});
