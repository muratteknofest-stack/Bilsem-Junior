import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { generateProfessionalQuestion, solveBoard, VERIFIED_TYPES, type Board } from '../src/features/questions/professional-engine';
import { independentlySolveBoard } from '../src/features/questions/independent-board-solver';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';
import { inspectEducation } from '../src/features/questions/quality-policy';
import { TILE_MOTIFS, VISUAL_SYMBOL_IDS, questionVisualTheme } from '../src/features/questions/visual-vocabulary';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { AnswerWorkspace } from '../src/features/questions/renderers/AnswerWorkspace';
import { SymbolDiagram } from '../src/features/questions/renderers/VisualGlyph';
import type { DifficultyLevel } from '../src/types';

test('published v3 proofs remain unchanged and accepted at every difficulty', () => {
  const frozen = {
    symbol_coding: 'd296a561329c6fc2704db4aa768cdc9186f67f5c4f7a52ccd1ea898593e9a77a',
    shape_counting: '640d3a3ac5a54d55338d820bc2143fadca411e049b4efc69d25b43d0265ad20c',
    matrix_3x3: '6184007b6216832c6111c02b2d750ae704439c3797f935d15f7a4036815adf7d',
    figure_rotation: 'df4e7c1c1701220d107054a6223b40d8e3b850bf893c29326fc4ef1be5170acf',
  };
  for (const type of Object.keys(frozen) as (keyof typeof frozen)[]) {
    const q = generateProfessionalQuestion(type, 4829, 2, true);
    assert.equal(createHash('sha256').update(JSON.stringify(q)).digest('hex'), frozen[type]);
  }
  for (const type of VERIFIED_TYPES) for (let d = 1; d <= 6; d++) for (let seed = 1; seed <= 5; seed++) {
    const q = generateProfessionalQuestion(type, seed * 937, d as DifficultyLevel, true);
    assert.equal(q.authoring?.engine, 'verified-3');
    assert.equal(isQuestionReadyForStudents(q), true, q.id);
  }
});

test('the richer symbol pool has twelve distinct drawings and two solvers agree in 720 cases', () => {
  const seen = new Set<string>();
  for (const type of ['shape_counting', 'symbol_coding'] as const) for (let d = 1; d <= 6; d++) for (let seed = 1; seed <= 60; seed++) {
    const q = generateProfessionalQuestion(type, seed * 139, d as DifficultyLevel);
    const board = q.visualConfig as Board;
    (board.items || board.key!.map(k => k.symbol)).forEach(s => seen.add(s));
    assert.deepEqual(solveBoard(board), independentlySolveBoard(board));
    assert.equal(isQuestionReadyForStudents(q), true, q.id);
  }
  assert.deepEqual([...seen].sort(), [...VISUAL_SYMBOL_IDS].sort());
  const drawings = VISUAL_SYMBOL_IDS.map(symbol => renderToStaticMarkup(<SymbolDiagram symbol={symbol} />));
  assert.equal(new Set(drawings.map(html => html.match(/ d="([^"]+)"/)![1])).size, 12);
  assert.ok(drawings.every(html => /aria-label="[^"]+"/.test(html)));
});

test('question and answer cards share a stable motif without reading the answer key', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 30; seed++) {
    const q = generateProfessionalQuestion('figure_rotation', seed, 2);
    const theme = questionVisualTheme(q);
    seen.add(theme.motif);
    const shuffled = { ...q, correctOptionId: 'changed', options: [...q.options].reverse() };
    assert.deepEqual(questionVisualTheme(shuffled), theme);
    const board = renderToStaticMarkup(<QuestionRenderer question={q} />);
    const options = renderToStaticMarkup(<AnswerWorkspace question={q} response={null} onChange={() => {}} />);
    assert.ok(board.includes(`data-motif="${theme.motif}"`));
    assert.equal((options.match(new RegExp(`data-motif="${theme.motif}"`, 'g')) || []).length, 4);
  }
  assert.equal(seen.size, Object.keys(TILE_MOTIFS).length);
});

test('unknown symbol drawings are rejected and never displayed as another shape', () => {
  const q = generateProfessionalQuestion('shape_counting', 157, 1);
  const b = q.visualConfig as Board;
  b.items![0] = 'unsupported';
  assert.ok(inspectEducation(q, 1).visual.some(reason => reason.includes('SYMBOL_RENDERING')));
  const html = renderToStaticMarkup(<SymbolDiagram symbol="unsupported" />);
  assert.ok(html.includes('Tanımsız sembol'));
  assert.ok(!html.includes('<path'));
});
