import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateCurriculumV2, CURRICULUM_V2 } from '../src/features/questions/curriculum-v2';
import { generateCompleteCurriculum, solveComplete, independentlyMatchesComplete, type CompleteBoard } from '../src/features/questions/complete-curriculum';
import { nextPatternNumber, matchesPatternNumber } from '../src/features/questions/curriculum-rules';
import { auditQuestion } from '../src/features/questions/quality';
import { checkArithmeticExplanations } from '../scripts/question-proof-checks';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { publicVisualConfig } from '../src/features/questions/public-visual';
import { LEARNING_QUESTION_FORMAT, PREVIOUS_LAB_QUESTION_FORMAT, needsReasoningFormat } from '../src/features/student/learning-question-format';
import { assertLearningQuestionFormat, currentReasoningCandidate } from '../server/learning-question-selection';
import { generateLabQuestion } from '../src/features/questions/reasoning-lab';
import { questionStyleKey } from '../src/features/questions/reasoning-identity';

test('new number families agree with hand-calculated answers and reject wrong continuations', () => {
  for (const [values, rule, answer] of [
    [[4, 6, 11, 13, 18], 'alternating-add', 20],
    [[2, 6, 18, 54, 162], 'multiply', 486],
    [[2, 5, 10, 17, 26], 'growing-difference', 37],
  ] as const) {
    assert.equal(nextPatternNumber(values, rule), answer);
    assert.ok(matchesPatternNumber(values, rule, answer));
    for (const wrong of [answer - 1, answer + 1, values.at(-1)!]) assert.equal(matchesPatternNumber(values, rule, wrong), false);
  }
  assert.throws(() => nextPatternNumber([1, 3, 8, 10, 16], 'alternating-add'));
  assert.throws(() => nextPatternNumber([2, 4, 8, 17, 34], 'multiply'));
  assert.throws(() => nextPatternNumber([1, 4, 9, 16, 26], 'growing-difference'));
});

test('legacy curriculum proofs and old lab clients remain supported while new drawings require the new client', () => {
  const old = generateCompleteCurriculum('shape_equation', 71371, 2, 1);
  assert.equal(auditQuestion(old).solverVerified, true);
  assert.deepEqual(auditQuestion(old).reviewRequired, []);
  const fresh = generateCurriculumV2('shape_equation', 71371, 2, 1);
  assert.ok(needsReasoningFormat(fresh));
  assert.throws(() => assertLearningQuestionFormat([fresh], PREVIOUS_LAB_QUESTION_FORMAT));
  assert.doesNotThrow(() => assertLearningQuestionFormat([fresh], LEARNING_QUESTION_FORMAT));
  assert.equal(currentReasoningCandidate(fresh, 1, true, true), true);
  assert.equal(currentReasoningCandidate(fresh, 1, true, false), false);
  assert.equal(currentReasoningCandidate(fresh, 2, true, true), false);
  const lab = generateLabQuestion('route-count', 71371, 1, 1);
  assert.doesNotThrow(() => assertLearningQuestionFormat([lab], PREVIOUS_LAB_QUESTION_FORMAT));
});

test('new visual and arithmetic rules have a single answer, clear renderings and no hidden inverse input', () => {
  const rules = new Set<string>(), styles = new Set<string>();
  for (const type of ['visual_sequence', 'number_pattern', 'operation_machine', 'shape_equation', 'balance_scale'] as const) for (let seed = 1; seed <= 60; seed++) {
    const q = generateCurriculumV2(type, seed * 104729, 4, 3), b = q.visualConfig as CompleteBoard;
    assert.equal(q.authoring?.engine, CURRICULUM_V2);
    const report = auditQuestion(q);
    assert.equal(report.solverVerified, true, q.id); assert.deepEqual([...report.errors, ...report.reviewRequired], [], q.id);
    assert.deepEqual(checkArithmeticExplanations(q).errors, [], q.id);
    assert.equal(q.options.filter(o => independentlyMatchesComplete(b, o.visualData as never)).length, 1);
    if (b.numberRule) rules.add(b.numberRule);
    styles.add(questionStyleKey(q));
    const visible = publicVisualConfig(q) as CompleteBoard;
    if (b.machineQuery === 'input') { assert.equal(visible.input, undefined); assert.ok(Number.isInteger(visible.outputTarget)); }
    if (b.objects) {
      const html = renderToStaticMarkup(<QuestionRenderer question={{ ...q, visualConfig: visible }} />);
      assert.match(html, /question-objects\/v1\//); assert.match(html, /data-real-object=/);
      assert.doesNotMatch(html, /correctOptionId|distractorNotes|NaN/);
      const forged = { ...q, visualConfig: { ...b, objects: ['apple', 'apple'] } };
      assert.equal(auditQuestion(forged).solverVerified, false);
    }
    const wrong = { ...q, correctOptionId: q.options.find(o => o.id !== q.correctOptionId)!.id };
    assert.equal(auditQuestion(wrong).solverVerified, false);
    if (b.numberRule) { const changed = structuredClone(b); changed.values![2] += 1; assert.throws(() => solveComplete(changed)); }
    if (b.sequenceRule) { const changed = structuredClone(b); changed.sequence![3]!.color = (changed.sequence![3]!.color + 1) % 6; assert.throws(() => solveComplete(changed)); }
  }
  assert.equal(rules.size, 3); assert.ok(styles.size >= 5);
});
