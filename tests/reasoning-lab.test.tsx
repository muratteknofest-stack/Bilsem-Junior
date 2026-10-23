import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LAB_MECHANICS, generateLabQuestion, solveLab, validateLabBoard, type LabBoard } from '../src/features/questions/reasoning-lab';
import { independentlySolveLab } from '../src/features/questions/reasoning-lab-solver';
import { auditQuestion, isQuestionReadyForStudents } from '../src/features/questions/quality';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { questionReasoningKey, questionStyleKey } from '../src/features/questions/reasoning-identity';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../src/features/questions/renderers/OptionRenderer';
import { publicLearningQuestion } from '../server/learning-model';
import { assertLearningQuestionFormat, currentReasoningCandidate, generateVariedLearningQuestion } from '../server/learning-question-selection';
import { LEARNING_QUESTION_FORMAT, LEGACY_REASONING_QUESTION_FORMAT, PREVIOUS_PROFESSIONAL_QUESTION_FORMAT } from '../src/features/student/learning-question-format';
import { generateQuestion } from '../src/features/questions/generators';
import { solveQuestion } from '../src/features/questions/universal-solver';

test('all eight new mechanics satisfy both proofs and education limits across 1200 grade/level/seed cases', () => {
  for (const grade of [1, 2, 3, 4] as const) for (let difficulty = 1; difficulty <= EDUCATION_PROFILES[grade].maxDifficulty; difficulty++) for (const mechanic of LAB_MECHANICS) for (let i = 0; i < 10; i++) {
    const q = generateLabQuestion(mechanic, 8911 + i * 173, difficulty as 1, grade), report = auditQuestion(q);
    assert.deepEqual(report.errors, [], q.id); assert.deepEqual(report.reviewRequired, [], q.id);
    assert.ok(report.solverVerified); assert.equal(solveLab(q.visualConfig), independentlySolveLab(q.visualConfig));
    const wrong = q.options.find(o => o.id !== q.correctOptionId)!;
    assert.equal(solveQuestion({ ...q, correctOptionId: wrong.id }).isMatch, false);
  }
});

test('independent fixtures cover wrap boundaries, repeated presses, backwards swaps, exhausted colours and zero paths', () => {
  const cases: Array<[LabBoard, string | number]> = [
    [{ displayMode: 'reasoning_lab', grade: 1, mechanic: 'route-count', size: 3, blocked: [] }, 6],
    [{ displayMode: 'reasoning_lab', grade: 2, mechanic: 'route-count', size: 3, blocked: [1, 3] }, 0],
    [{ displayMode: 'reasoning_lab', grade: 1, mechanic: 'domino-chain', chain: [[1, 2], null, [4, 0]] }, '2 | 4'],
    [{ displayMode: 'reasoning_lab', grade: 1, mechanic: 'box-transfer', initial: [3, 2, 1], transfers: [{ from: 0, to: 1, amount: 2 }, { from: 1, to: 2, amount: 3 }], target: 1 }, 1],
    [{ displayMode: 'reasoning_lab', grade: 1, mechanic: 'switch-parity', lamps: [1, 0, 1], presses: [[0, 1], [0, 2]] }, 2],
    [{ displayMode: 'reasoning_lab', grade: 1, mechanic: 'position-swaps', items: ['A', 'B', 'C', 'D'], swaps: [[0, 1], [1, 2]], target: 2 }, 'A'],
    [{ displayMode: 'reasoning_lab', grade: 1, mechanic: 'boundary-edges', size: 3, cells: [0, 0, 1, 1, 0, 0, 0, 0, 0] }, 8],
    [{ displayMode: 'reasoning_lab', grade: 2, mechanic: 'boundary-edges', size: 3, cells: [1, 1, 1, 1, 0, 1, 1, 1, 1] }, 16],
    [{ displayMode: 'reasoning_lab', grade: 2, mechanic: 'guaranteed-draw', counts: [1, 4, 2], target: 3 }, 6],
    [{ displayMode: 'reasoning_lab', grade: 1, mechanic: 'cheapest-route', routes: [[2, 3], [1, 3], [4, 2]] }, 'B'],
  ];
  for (const [b, expected] of cases) { assert.equal(solveLab(b), expected); assert.equal(independentlySolveLab(b), expected); }
});

test('different seeds, grades and difficulty labels cannot manufacture extra lab styles', () => {
  const styles = new Set<string>(), rules = new Set<string>();
  for (const mechanic of LAB_MECHANICS) {
    const variants = [generateLabQuestion(mechanic, 17391, 2, 1), generateLabQuestion(mechanic, 990071, 6, 4)];
    assert.equal(questionStyleKey(variants[0]), questionStyleKey(variants[1]));
    assert.equal(questionReasoningKey(variants[0]), questionReasoningKey(variants[1]));
    styles.add(questionStyleKey(variants[0])); rules.add(questionReasoningKey(variants[0]));
  }
  assert.equal(styles.size, 8); assert.equal(rules.size, 8);
});

test('every given is rendered from the public board and no answer/seed/certificate enters its DTO', () => {
  for (const mechanic of LAB_MECHANICS) {
    const q = generateLabQuestion(mechanic, 8911, 2, 1), dto = publicLearningQuestion(q);
    assert.deepEqual(dto.visualConfig, q.visualConfig);
    assert.equal('seed' in dto, false); assert.equal('correctOptionId' in dto, false); assert.equal('authoring' in dto, false); assert.equal('explanation' in dto, false);
    const html = renderToStaticMarkup(<QuestionRenderer question={dto as typeof q}/>);
    const marker = { 'route-count': 'Yol ızgarası', 'boundary-edges': 'Birim karelerden', 'domino-chain': 'Domino', 'box-transfer': 'Başlangıçtaki top', 'switch-parity': 'Lambaların başlangıç', 'position-swaps': 'Kartların başlangıç', 'guaranteed-draw': 'Torbanın içi', 'cheapest-route': 'bölüm uzunlukları' }[mechanic];
    assert.ok(html.includes(marker), mechanic);
    assert.doesNotMatch(html, /NaN|undefined|çizimi eksik/);
    for (const option of q.options) assert.ok(renderToStaticMarkup(<OptionRenderer option={option} questionType={q.type}/>).includes('button'));
  }
});

test('altered instructions, options, topic, hidden metadata and invalid boards fail closed', () => {
  for (const mechanic of LAB_MECHANICS) {
    const q = generateLabQuestion(mechanic, 8911, 2, 1);
    for (const change of [
      { prompt: q.prompt + ' Farklı bir kural kullan.' }, { type: 'visual_memory' },
      { visualConfig: { ...q.visualConfig, hiddenAnswer: 42 } },
      { options: q.options.map((o, i) => i ? o : { ...o, visualData: { ...o.visualData, invisible: true } }) },
      { authoring: { ...q.authoring, engine: 'unreviewed' } },
    ]) assert.equal(isQuestionReadyForStudents({ ...q, ...change }), false, mechanic);
  }
  for (const board of [
    { displayMode: 'reasoning_lab', grade: 1, mechanic: 'route-count', size: 3, blocked: [0] },
    { displayMode: 'reasoning_lab', grade: 1, mechanic: 'box-transfer', initial: [1, 1, 1], transfers: [{ from: 0, to: 1, amount: 2 }, { from: 1, to: 2, amount: 1 }], target: 1 },
    { displayMode: 'reasoning_lab', grade: 1, mechanic: 'switch-parity', lamps: [1, 0], presses: [[0, 0], [1]] },
    { displayMode: 'reasoning_lab', grade: 1, mechanic: 'cheapest-route', routes: [[1, 2], [2, 1], [4, 4]] },
  ]) assert.throws(() => validateLabBoard(board));
});

test('older installed clients retain their supported engines and cannot resume a lab snapshot', () => {
  const q = generateLabQuestion('position-swaps', 8911, 2, 1);
  for (const format of [undefined, LEGACY_REASONING_QUESTION_FORMAT, PREVIOUS_PROFESSIONAL_QUESTION_FORMAT]) assert.throws(() => assertLearningQuestionFormat([q], format));
  assert.doesNotThrow(() => assertLearningQuestionFormat([q], LEARNING_QUESTION_FORMAT));
  assert.equal(currentReasoningCandidate(q, 1, true), true); assert.equal(currentReasoningCandidate(q, 1, false), false);
  for (const lab of [false, true]) for (let i = 0; i < 8; i++) {
    const selected = generateVariedLearningQuestion({ grade: 1, category: 'coding', difficulty: 2, seed: 8150 + i, typeCounts: new Map(), lab });
    assert.ok(isQuestionReadyForStudents(selected));
    if (!lab) assert.notEqual(selected.authoring?.engine, 'reasoning-lab-1');
  }
  const old = generateQuestion({ targetGrade: 2, type: 'number_pattern', difficulty: 2, seed: 8911 });
  assert.doesNotThrow(() => assertLearningQuestionFormat([old], PREVIOUS_PROFESSIONAL_QUESTION_FORMAT));
});
