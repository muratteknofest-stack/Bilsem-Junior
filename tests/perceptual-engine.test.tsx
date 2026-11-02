import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generatePerceptualQuestion, PERCEPTUAL_MECHANICS, PERCEPTUAL_TOPICS, perceptualAllowed, solvePerceptual, validatePerceptualBoard, type PerceptualValue } from '../src/features/questions/perceptual-engine';
import { independentlyMatchesPerceptual } from '../src/features/questions/perceptual-solver';
import { auditQuestion, isQuestionReadyForStudents, questionStimulusKey } from '../src/features/questions/quality';
import { questionReasoningKey, questionStyleKey } from '../src/features/questions/reasoning-identity';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../src/features/questions/renderers/OptionRenderer';
import { publicVisualConfig } from '../src/features/questions/public-visual';
import { LEARNING_QUESTION_FORMAT, PREVIOUS_CURRICULUM_QUESTION_FORMAT, PREVIOUS_LAB_QUESTION_FORMAT } from '../src/features/student/learning-question-format';
import { assertLearningQuestionFormat, currentReasoningCandidate, generateVariedLearningQuestion } from '../server/learning-question-selection';
import { generateCurriculumV2 } from '../src/features/questions/curriculum-v2';
import { generateQuestion } from '../src/features/questions/generators';
import { generatePerceptualBank, verifyPerceptualBank } from '../scripts/generate-perceptual-bank';

const card = (count: number, rotation = 0, filled = false, shape: PerceptualValue['shape'] = 'arrow'): PerceptualValue => ({ perceptual: 'card', shape, count, rotation, filled });
const base = { displayMode: 'perceptual_board', grade: 2 } as const;

test('two examples distinguish doubling from addition and all features have hand-calculated answers', () => {
  const b = { ...base, mechanic: 'paired-analogy', cards: [card(1), card(2, 1, true), card(2, 1, true, 'key'), card(4, 2, false, 'key'), card(3, 2, true, 'flag'), null] };
  const answer = card(6, 3, false, 'flag');
  assert.deepEqual(solvePerceptual(b), answer);
  assert.ok(independentlyMatchesPerceptual(b, answer));
  for (const wrong of [card(4, 3, false, 'flag'), card(6, 2, false, 'flag'), card(6, 3, true, 'flag'), card(6, 3, false)]) assert.equal(independentlyMatchesPerceptual(b, wrong), false);
  assert.throws(() => solvePerceptual({ ...b, cards: [card(1), card(2, 1, true), card(1), card(2, 1, true), card(3), null] }), /tek ve tutarlı/);
});

test('matrix completion must satisfy every row and column, direction and fill', () => {
  const b = { ...base, mechanic: 'matrix-attributes', cards: [card(1), card(2, 1, true), card(3, 2), card(2, 1, true), card(3, 2), card(1, 3, true), card(3, 2), card(1, 3, true), null] };
  assert.deepEqual(solvePerceptual(b), card(2));
  assert.ok(independentlyMatchesPerceptual(b, card(2)));
  for (const wrong of [card(1), card(2, 1), card(2, 0, true)]) assert.equal(independentlyMatchesPerceptual(b, wrong), false);
  const changed = structuredClone(b); changed.cards[5] = card(2, 3, true);
  assert.throws(() => solvePerceptual(changed));
  assert.equal(independentlyMatchesPerceptual(changed, card(2)), false);
});

test('interleaved streams advance separately and shared-feature choices satisfy every common condition', () => {
  const b = { ...base, mechanic: 'interleaved-sequence', cards: [card(1), card(2, 0, false, 'key'), card(2, 1, true), card(2, 2, false, 'key'), card(3, 2), card(2, 0, false, 'key'), null] };
  assert.deepEqual(solvePerceptual(b), card(4, 3, true));
  assert.ok(independentlyMatchesPerceptual(b, card(4, 3, true)));
  assert.equal(independentlyMatchesPerceptual(b, card(2, 2, false, 'key')), false);
  const classification = { ...base, mechanic: 'feature-classification', cards: [card(2, 0, true), card(2, 1, true, 'key'), card(2, 2, true, 'leaf')] };
  const choices = [card(2, 3, true, 'flag'), card(3, 3, true, 'flag'), card(2, 3, false, 'flag'), card(3, 3, false, 'flag')];
  assert.deepEqual(solvePerceptual(classification, choices), choices[0]);
  assert.deepEqual(choices.map(c => independentlyMatchesPerceptual(classification, c)), [true, false, false, false]);
  assert.throws(() => solvePerceptual(classification, [...choices.slice(0, 3), card(2, 1, true)]), /tek seçenek/);
});

test('strict visible-given and choice schemas reject hidden answers, invalid holes and grade overload', () => {
  const b = { ...base, mechanic: 'attribute-sequence', cards: [card(1), card(2), card(3), null] };
  assert.throws(() => validatePerceptualBoard({ ...b, answer: card(4) }));
  assert.throws(() => validatePerceptualBoard({ ...b, cards: [card(1), null, card(3), card(4)] }));
  assert.throws(() => validatePerceptualBoard({ ...b, grade: 1, cards: [card(3), card(4), card(5), null] }));
  assert.equal(independentlyMatchesPerceptual(b, { ...card(4), hidden: true }), false);
  assert.throws(() => generatePerceptualQuestion('matrix-attributes', 7, 2, 1));
  assert.throws(() => generatePerceptualQuestion('interleaved-sequence', 7, 1, 2));
});

test('every supported mechanic/grade/level has deterministic unique proofs and rejects forged keys, choices and explanations', () => {
  for (const grade of [1, 2, 3, 4] as const) for (let level = 1; level <= EDUCATION_PROFILES[grade].maxDifficulty; level++) for (const mechanic of PERCEPTUAL_MECHANICS) {
    if (!perceptualAllowed(mechanic, grade, level)) continue;
    for (let i = 1; i <= 30; i++) {
      const q = generatePerceptualQuestion(mechanic, i * 104729, level as 1, grade), report = auditQuestion(q);
      assert.deepEqual([...report.errors, ...report.reviewRequired], [], q.id);
      assert.equal(report.solverVerified, true, q.id);
      assert.equal(q.options.filter(o => independentlyMatchesPerceptual(q.visualConfig, o.visualData)).length, 1, q.id);
      assert.equal(q.type, PERCEPTUAL_TOPICS[mechanic]);
      assert.deepEqual(generatePerceptualQuestion(mechanic, i * 104729, level as 1, grade), q);
      assert.ok(Object.values(q.authoring!.distractorNotes).every(note => !note.includes('  ilişkisi')));
      if (i === 1) {
        assert.equal(auditQuestion({ ...q, correctOptionId: q.options.find(o => o.id !== q.correctOptionId)!.id }).solverVerified, false);
        const duplicate = structuredClone(q); duplicate.options[1].visualData = duplicate.options[0].visualData;
        assert.equal(auditQuestion(duplicate).solverVerified, false);
        assert.equal(auditQuestion({ ...q, explanation: { ...q.explanation, summary: 'Yanlış bir çözüm açıklaması.' } }).solverVerified, false);
      }
    }
  }
});

test('student projection and original SVG choices contain visible givens and accessible descriptions', () => {
  for (const mechanic of PERCEPTUAL_MECHANICS) {
    const q = generatePerceptualQuestion(mechanic, 982451, 3, 2), visible = publicVisualConfig(q);
    assert.deepEqual(visible, q.visualConfig);
    assert.doesNotMatch(JSON.stringify(visible), /correctOptionId|answer|seed|step|turns|flip|distractorNotes/);
    const html = renderToStaticMarkup(<><QuestionRenderer question={{ ...q, visualConfig: visible }}/>{q.options.map(option => <OptionRenderer key={option.id} option={option}/>)}</>);
    assert.match(html, /data-perceptual-card="true"/); assert.match(html, /aria-label="[1-6] /);
    assert.doesNotMatch(html, /NaN|undefined|correctOptionId|distractorNotes/);
  }
});

test('new clients receive new mechanics, previous curriculum clients keep their compatible questions', () => {
  const q = generatePerceptualQuestion('paired-analogy', 81719, 3, 2);
  for (const format of [undefined, 'reasoning-8', 'professional-v2', PREVIOUS_LAB_QUESTION_FORMAT, PREVIOUS_CURRICULUM_QUESTION_FORMAT]) assert.throws(() => assertLearningQuestionFormat([q], format));
  assert.doesNotThrow(() => assertLearningQuestionFormat([q], LEARNING_QUESTION_FORMAT));
  const previous = generateCurriculumV2('visual_sequence', 81719, 3, 2);
  for (const format of [PREVIOUS_CURRICULUM_QUESTION_FORMAT, LEARNING_QUESTION_FORMAT]) assert.doesNotThrow(() => assertLearningQuestionFormat([previous], format));
  assert.equal(currentReasoningCandidate(q, 2, true, true, true), true);
  assert.equal(currentReasoningCandidate(q, 2, true, true, false), false);
  assert.equal(currentReasoningCandidate(q, 1, true, true, true), false);
  const generated = generateVariedLearningQuestion({ grade: 2, category: q.category, difficulty: 3, seed: 982451, typeCounts: new Map(), curriculumV2: true, perceptual: true, acceptCandidate: c => c.authoring?.engine === 'perceptual-1', randomIndex: () => 0 });
  assert.equal(generated.authoring?.engine, 'perceptual-1'); assert.ok(isQuestionReadyForStudents(generated));
  assert.equal(generateQuestion({ profile: 'professional-v2', type: 'visual_analogy', targetGrade: 2, difficulty: 3, seed: 982451 }).authoring?.engine, 'perceptual-1');
});

test('glyph replacements are not new reasoning rules or exercise styles', () => {
  const q = generatePerceptualQuestion('attribute-sequence', 81719, 3, 2), changed = structuredClone(q);
  for (const c of (changed.visualConfig as { cards: Array<PerceptualValue | null> }).cards) if (c) c.shape = c.shape === 'key' ? 'flag' : 'key';
  assert.notEqual(questionStimulusKey(q), questionStimulusKey(changed));
  assert.equal(questionReasoningKey(q), questionReasoningKey(changed));
  assert.equal(questionStyleKey(q), questionStyleKey(changed));
});

test('a generated bank covers every supported cell, removes cross-grade repetitions and cannot hide a missing quota', () => {
  const bank = generatePerceptualBank({ perCell: 2, seed: 20261102, batchId: 'test-perceptual', generatedAt: '2026-11-02T07:00:00Z' });
  assert.equal(bank.questions.length, 122);
  assert.equal(verifyPerceptualBank(bank).uniqueVisibleGivens, 122);
  assert.ok(bank.questions.every(q => q.status === 'review' && q.batchValidation.individualHumanReview === false));
  const missing = structuredClone(bank); missing.questions.splice(0, 2); missing.summary.total -= 2; missing.summary.uniqueVisibleGivens -= 2; delete missing.summary.cells['1:1:analogy-grid'];
  assert.throws(() => verifyPerceptualBank(missing));
  const wrong = structuredClone(bank); wrong.questions[0].correctOptionId = wrong.questions[0].options.find(o => o.id !== wrong.questions[0].correctOptionId)!.id;
  assert.throws(() => verifyPerceptualBank(wrong));
  assert.throws(() => generatePerceptualQuestion('paired-analogy', 7, 6, 4));
});
