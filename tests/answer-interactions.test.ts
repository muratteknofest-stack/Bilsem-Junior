import assert from 'node:assert/strict';
import test from 'node:test';
import { generateProfessionalQuestion, type Board, VERIFIED_TYPES } from '../src/features/questions/professional-engine';
import { generateProfessionalQuestion as generateLegacyQuestion } from '../src/features/questions/professional-engine-v5';
import { independentlySolveBoard } from '../src/features/questions/independent-board-solver';
import { emptyResponse, evaluateResponse, interactionModes, placeInOrder } from '../src/features/questions/answer-interactions';

test('all verified question types support selection and placement without changing their content', () => {
  for (const type of VERIFIED_TYPES) for (let seed = 1; seed <= 20; seed++) {
    const q = generateProfessionalQuestion(type, seed, 3);
    const before = JSON.stringify(q);
    for (const mode of interactionModes(q)) assert.equal(evaluateResponse(q, emptyResponse(mode, q)).complete, false);
    for (const mode of ['choice', 'place'] as const) {
      assert.deepEqual(evaluateResponse(q, { mode, optionId: q.correctOptionId }), { complete: true, correct: true });
      assert.deepEqual(evaluateResponse(q, { mode, optionId: q.options.find(o => o.id !== q.correctOptionId)!.id }), { complete: true, correct: false });
      assert.equal(evaluateResponse(q, { mode, optionId: 'unknown' }).complete, false);
    }
    assert.equal(JSON.stringify(q), before);
  }
});

test('numeric answers require a complete integer and use an independent solution', () => {
  for (const type of ['number_pattern', 'operation_machine', 'shape_counting'] as const) for (let seed = 1; seed <= 20; seed++) {
    const q = generateProfessionalQuestion(type, seed, 3);
    const answer = independentlySolveBoard(q.visualConfig as Board) as { textNumber: number };
    assert.equal(evaluateResponse(q, { mode: 'number', value: String(answer.textNumber) }).correct, true);
    assert.deepEqual(evaluateResponse(q, { mode: 'number', value: String(answer.textNumber + 1) }), { complete: true, correct: false });
    for (const value of ['', ' ', 'Infinity', 'NaN', '1e2', '12abc', '9007199254740992']) assert.equal(evaluateResponse(q, { mode: 'number', value }).complete, false);
  }
});

test('every ordering constraint matters, even if the originally requested person is correct', () => {
  const q = generateLegacyQuestion('logic_grid', 61, 4), b = q.visualConfig as Board;
  const order = [b.names!.find(n => !b.clues!.some(([, right]) => right === n))!];
  while (order.length < b.names!.length) order.push(b.clues!.find(([left]) => left === order.at(-1))![1]);
  assert.equal(evaluateResponse(q, { mode: 'order', slots: order }).correct, true);
  const wrong = [...order], others = order.map((_, i) => i).filter(i => i !== b.position! - 1);
  [wrong[others[0]], wrong[others[1]]] = [wrong[others[1]], wrong[others[0]]];
  assert.deepEqual(evaluateResponse(q, { mode: 'order', slots: wrong }), { complete: true, correct: false });
  assert.equal(evaluateResponse(q, { mode: 'order', slots: order.map(() => order[0]) }).complete, false);
  assert.deepEqual(placeInOrder(['Ada', 'Can', null], 'Ada', 1), [null, 'Ada', null]);
  assert.deepEqual(placeInOrder(['Ada'], 'Can', 9), ['Ada']);
});

test('matching checks each pair and the total; repeated symbols count each time', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const q = generateProfessionalQuestion('symbol_coding', seed, 4), b = q.visualConfig as Board;
    const pairs = Object.fromEntries(b.key!.map(k => [k.symbol, String(k.value)]));
    const total = String(b.symbols!.reduce((sum, s) => sum + Number(pairs[s]), 0));
    assert.equal(evaluateResponse(q, { mode: 'match', pairs, total }).correct, true);
    assert.equal(evaluateResponse(q, { mode: 'match', pairs, total: String(Number(total) + 1) }).correct, false);
    assert.equal(evaluateResponse(q, { mode: 'match', pairs: { ...pairs, [b.symbols![0]]: '999' }, total }).correct, false);
    assert.equal(evaluateResponse(q, { mode: 'match', pairs: {}, total }).complete, false);
  }
});

test('tampered questions and inappropriate interaction types fail closed', () => {
  const q = generateProfessionalQuestion('figure_rotation', 7, 3);
  assert.equal(evaluateResponse(q, { mode: 'number', value: '1' }).complete, false);
  q.correctOptionId = q.options.find(o => o.id !== q.correctOptionId)!.id;
  assert.equal(evaluateResponse(q, { mode: 'place', optionId: q.correctOptionId }).complete, false);
});
