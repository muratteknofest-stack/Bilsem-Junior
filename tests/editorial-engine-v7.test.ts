import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProfessionalQuestion, solveBoard, VERIFIED_TYPES, type Board, type Tile } from '../src/features/questions/professional-engine';
import { generateProfessionalQuestion as previousProfessional } from '../src/features/questions/professional-engine-v6';
import { generateColorfulQuestion as previousColorful } from '../src/features/questions/colorful-engine-v2';
import { generateColorfulQuestion, COLORFUL_TYPES, type ColorfulBoard, type Mosaic } from '../src/features/questions/colorful-engine';
import { independentlySolveBoard } from '../src/features/questions/independent-board-solver';
import { auditQuestion, isQuestionReadyForStudents, questionStimulusKey } from '../src/features/questions/quality';
import { recentQuestionExposure, selectLearningQuestions } from '../server/learning-question-selection';
import { generateQuestion } from '../src/features/questions/generators';

test('interleaved sequence solvers predict a seventh term from six visible givens', () => {
  const board: Board = { displayMode: 'verified_board', kind: 'numbers', rule: 'interleaved', values: [2, 10, 5, 15, 8, 20] };
  assert.deepEqual(solveBoard(board), { textNumber: 11 });
  assert.deepEqual(independentlySolveBoard(board), { textNumber: 11 });
  const broken = { ...board, values: [2, 10, 5, 16, 8, 20] };
  assert.throws(() => solveBoard(broken), /tutarsız/);
  assert.throws(() => independentlySolveBoard(broken), /başarısız/);
  assert.throws(() => solveBoard({ ...board, values: [2, 10, 5, 15] }), /eksik/);
});

test('number patterns include subtraction and separate-progressions with explained misconception choices', () => {
  let descending = 0, interleaved = 0;
  for (let sample = 1; sample <= 100; sample++) {
    const easy = generateQuestion({ type: 'number_pattern', targetGrade: 1, difficulty: 2, seed: sample * 7919 });
    const eb = easy.visualConfig as Board;
    if (eb.values![1] < eb.values![0]) { descending++; assert.match(easy.explanation.summary, /çıkarılır/); }
    assert.ok(eb.values!.every(n => n >= 0 && n <= 30));
    const advanced = generateQuestion({ type: 'number_pattern', targetGrade: 3, difficulty: 4, seed: sample * 3571 });
    if ((advanced.visualConfig as Board).rule === 'interleaved') {
      interleaved++;
      assert.match(advanced.explanation.steps.join(' '), /7\. adım/);
      assert.ok(Object.values(advanced.authoring!.distractorNotes).some(note => note.includes('çift numaralı')));
    }
    assert.equal(isQuestionReadyForStudents(easy), true);
    assert.equal(isQuestionReadyForStudents(advanced), true);
  }
  assert.ok(descending >= 20 && interleaved >= 20);
});

test('matrix analogy uses both reflection axes as well as rotation and grid distractors include equal-density near misses', () => {
  const operations = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) for (const type of ['matrix_2x2', 'matrix_3x3'] as const) {
    const q = generateProfessionalQuestion(type, seed * 7919, 4), b = q.visualConfig as Board;
    if (b.operation) operations.add(b.operation);
    const answer = q.options.find(o => o.id === q.correctOptionId)!.visualData as Tile;
    assert.ok(q.options.some(o => o.id !== q.correctOptionId && (o.visualData as Tile).cells.reduce((a, n) => a + n, 0) === answer.cells.reduce((a, n) => a + n, 0)));
    assert.equal(auditQuestion(q).solverVerified, true);
  }
  assert.deepEqual([...operations].sort(), ['mirrorX', 'mirrorY', 'rotate']);
});

test('subtractive machines have nonnegative examples and match independently checked arithmetic', () => {
  let found = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const q = generateProfessionalQuestion('operation_machine', seed * 7919, 4), b = q.visualConfig as Board;
    const [[x, y], [xx, yy]] = b.examples!, m = (yy - y) / (xx - x), offset = y - m * x;
    if (offset < 0) { found++; assert.match(q.prompt, /çıkarıyor/); assert.match(q.explanation.steps[1], /çıkarılanı bul/); assert.doesNotMatch(q.explanation.steps.join(' '), /=\s*-\d/); }
    assert.ok(b.examples!.flat().every(n => n >= 0));
    assert.deepEqual(solveBoard(b), independentlySolveBoard(b));
    assert.deepEqual(auditQuestion(q).errors, []);
  }
  assert.ok(found >= 20);
});

test('colorful choices retain all colour counts while including a two-position near miss and actionable feedback', () => {
  for (const type of ['visual_memory', 'mirror_reflection'] as const) for (let seed = 1; seed <= 40; seed++) {
    const q = generateColorfulQuestion(type, seed * 7919, 4), answer = q.options.find(o => o.id === q.correctOptionId)!.visualData as Mosaic;
    const palette = [...answer.cells].sort();
    for (const o of q.options) assert.deepEqual([...(o.visualData as Mosaic).cells].sort(), palette);
    assert.ok(q.options.some(o => (o.visualData as Mosaic).cells.filter((n, i) => n !== answer.cells[i]).length === 2));
    for (const o of q.options.filter(o => o.id !== q.correctOptionId)) assert.match(q.authoring!.distractorNotes[o.id], /satır.*sütunda.*yerine/);
    assert.equal(auditQuestion(q).solverVerified, true);
  }
});

test('visible givens define exposure even with fresh wrong choices or a different hidden tile', () => {
  const q = generateColorfulQuestion('figure_completion', 7919, 4), variant = structuredClone(q);
  variant.id = 'fresh-looking-id';
  const b = variant.visualConfig as ColorfulBoard, source = b.source as Mosaic;
  source.cells[b.missing!] = (source.cells[b.missing!] + 1) % 6;
  variant.options[0].visualData = { art: 'swatch', color: 5 };
  assert.equal(questionStimulusKey(q), questionStimulusKey(variant));
  const history = recentQuestionExposure([{ questions: [q], created_at: '2026-10-19T07:00:00Z' }]);
  assert.equal(history.get(questionStimulusKey(variant)), Date.parse('2026-10-19T07:00:00Z'));
  const mirror: Board = { displayMode: 'verified_board', kind: 'transform', operation: 'mirrorX', turns: 1, tiles: [{size:3,cells:[1,0,0,1,1,0,0,0,0]},null] };
  assert.equal(questionStimulusKey({type:'mirror_reflection',visualConfig:mirror}), questionStimulusKey({type:'mirror_reflection',visualConfig:{...mirror,turns:3}}));
  const numeric = generateQuestion({ type: 'number_pattern', targetGrade: 2, difficulty: 2, seed: 73 });
  const recollected = structuredClone(numeric); recollected.id = 'new'; recollected.options.reverse();
  // Changing only wrong answers must not fill two session places.
  const wrong = recollected.options.find(o => o.id !== recollected.correctOptionId)!; wrong.visualData = { textNumber: 99 };
  assert.throws(() => selectLearningQuestions({ count: 2, category: 'numerical', candidates: [numeric, recollected], exposure: new Map(), canUse: () => true, generate: () => { throw Error('No new content'); } }), /yeterli farklı/);
});

test('saved previous engine versions retain their original templates and keys', () => {
  for (const type of VERIFIED_TYPES) for (const difficulty of [2, 4, 6] as const) {
    const old = previousProfessional(type, 7919, difficulty);
    assert.equal(old.authoring!.engine, 'verified-6');
    assert.equal(isQuestionReadyForStudents(old), true, old.id);
  }
  for (const type of COLORFUL_TYPES) {
    const old = previousColorful(type, 7919, 4);
    assert.equal(old.authoring!.engine, 'colorful-2');
    assert.equal(isQuestionReadyForStudents(old), true, old.id);
  }
});
