import assert from 'node:assert/strict';
import test from 'node:test';
import { runQuestionPipeline } from '../server/ai-question-pipeline';
import { generateProfessionalQuestion, solveBoard, type Board } from '../src/features/questions/professional-engine';
import { generateQuestion, STUDENT_CATEGORY_TYPES } from '../src/features/questions/generators';
import { auditQuestion, isQuestionReadyForStudents } from '../src/features/questions/quality';
import { assessCandidate } from '../src/features/questions/multi-stage-quality';
import { EDUCATION_PROFILES, inspectEducation, type SchoolGrade } from '../src/features/questions/quality-policy';
import { toSupabaseRow, fromSupabaseRow } from '../src/lib/supabase-shape';
import type { BaseQuestion, DifficultyLevel, CognitiveCategory } from '../src/types';

function reviewer(mode = 'pass') {
  const prompts: string[] = [];
  let blindCount = 0, editorialCount = 0;
  const client = { models: { generateContent: async ({ contents }: { contents: string }) => {
    prompts.push(contents);
    if (mode === 'offline') throw new Error('provider unavailable');
    const q = JSON.parse(contents.split('Soru: ')[1]);
    if (!q.explanation) {
      blindCount++;
      const answer = solveBoard(q.visualConfig);
      const correct = q.options.find((o: any) => JSON.stringify(o.visualData) === JSON.stringify(answer)).id;
      return { text: JSON.stringify({ chosenOptionId: mode === 'always-wrong' || (mode === 'first-wrong' && blindCount === 1) ? 'INVALID' : correct, uniqueAnswer: true, sufficientInformation: true, issues: [] }) };
    }
    editorialCount++;
    return { text: JSON.stringify({ explanationCorrect: true, gradeAppropriate: true,
      ageAppropriate: mode !== 'age-veto', difficultyAppropriate: !(mode === 'first-editorial-veto' && editorialCount === 1),
      promptClear: true, distractorsValid: true, issues: [] }) };
  } } };
  return { client: client as any, prompts };
}
const config = { targetGrade: 3 as const, targetAge: 9, difficulty: 3, questionType: 'number_pattern', maxAttempts: 3 };
function seeds(...values: number[]) { let i = 0; return () => values[i++] ?? 777 + i * 937; }

test('every required stage is measured and passed before acceptance; stored reports survive roundtrip', async () => {
  const ai = reviewer();
  const r = await runQuestionPipeline(ai.client, config, { nextSeed: seeds(321) });
  assert.equal(r.success, true, r.rejectionReasons.join(' '));
  assert.equal(r.qualityReport?.stages.length, 9);
  assert.equal(r.qualityReport?.score, 100);
  assert.equal(r.question?.status, 'draft');
  assert.equal(isQuestionReadyForStudents(r.question), true);
  assert.equal(isQuestionReadyForStudents(fromSupabaseRow('questions', toSupabaseRow('questions', r.question!.id, r.question!))), true);
  assert.doesNotMatch(ai.prompts[0], /correctOptionId|explanation|distractorNotes|qualityReport/);
  assert.match(ai.prompts[1], /Yaş|yaş/);
});

test('a blind-solver rejection regenerates a new seed and reruns every gate without fixing the key', async () => {
  const ai = reviewer('first-wrong');
  const r = await runQuestionPipeline(ai.client, config, { nextSeed: seeds(321, 654) });
  assert.equal(r.success, true);
  assert.deepEqual(r.attempts?.map(a => [a.seed, a.outcome]), [[321,'rejected'],[654,'accepted']]);
  assert.equal(r.attempts?.[0].report?.stages.find(s => s.id === 'editorial')?.status, 'pending');
  assert.equal(r.question?.correctOptionId, generateProfessionalQuestion('number_pattern', 654, 3).correctOptionId);
  assert.equal(ai.prompts.length, 3);
});

test('editorial difficulty rejection triggers full regeneration, including a new blind solution', async () => {
  const ai = reviewer('first-editorial-veto');
  const r = await runQuestionPipeline(ai.client, config, { nextSeed: seeds(321,654) });
  assert.equal(r.success, true); assert.equal(ai.prompts.length, 4);
  assert.equal(r.attempts?.[0].report?.stages.find(s => s.id === 'editorial')?.status, 'failed');
});

test('max attempts and age veto are hard limits even with a zero minimum score', async () => {
  for (const mode of ['always-wrong', 'age-veto']) {
    const ai = reviewer(mode);
    const r = await runQuestionPipeline(ai.client, { ...config, maxAttempts: 2, minQualityScore: 0 }, { nextSeed: seeds(321,654) });
    assert.equal(r.success, false); assert.equal(r.attempts?.length, 2);
    assert.equal(r.question?.status, 'review'); assert.equal(r.qualityScore, 0);
    assert.equal(isQuestionReadyForStudents(r.question), false);
  }
});

test('incompatible age/grade/difficulty and retry settings stop before provider calls', async () => {
  for (const patch of [{ targetAge: 6 }, { targetGrade: 1 as const, difficulty: 6 }, { maxAttempts: 100 }, { minQualityScore: NaN }]) {
    const ai = reviewer();
    const r = await runQuestionPipeline(ai.client, { ...config, ...patch });
    assert.equal(r.success, false); assert.equal(ai.prompts.length, 0); assert.equal(r.attempts?.length, 0);
  }
});

test('a numeric profile violation is regenerated before spending AI calls', async () => {
  const ai = reviewer();
  const r = await runQuestionPipeline(ai.client, { targetGrade: 1, difficulty: 2, questionType: 'number_pattern', maxAttempts: 4 }, { nextSeed: seeds(5,1,2,3) });
  assert.equal(r.attempts?.[0].report?.stages.find(s => s.id === 'difficulty')?.status, 'failed');
  assert.equal(r.success, true, r.rejectionReasons.join(' ')); assert.equal(ai.prompts.length, 2);
  assert.ok(r.qualityReport!.metrics.maxNumber <= 30);
});

test('duplicates are rejected in the given comparison pool and regenerated', async () => {
  const previous = generateProfessionalQuestion('number_pattern',321,3);
  const ai = reviewer();
  const r = await runQuestionPipeline(ai.client, config, { existingQuestions: [previous], nextSeed: seeds(321,654) });
  assert.equal(r.success, true); assert.equal(r.attempts?.[0].report?.stages.find(s=>s.id==='novelty')?.status, 'failed');
  assert.equal(r.qualityReport?.metrics.comparedQuestions, 2); assert.equal(ai.prompts.length, 2);
});

test('provider failure stops rather than accepting deterministic proof alone or looping through candidates', async () => {
  const ai = reviewer('offline');
  const r = await runQuestionPipeline(ai.client, config, { nextSeed: seeds(321) });
  assert.equal(r.success, false); assert.equal(r.attempts?.length,1); assert.equal(r.attempts?.[0].outcome,'unavailable');
  assert.equal(ai.prompts.length,1); assert.equal(isQuestionReadyForStudents(r.question),false);
});

test('a stale passed report cannot survive altered audience, key, explanation or distractor feedback', async () => {
  const r = await runQuestionPipeline(reviewer().client, config, { nextSeed: seeds(321) });
  for (const change of [(q:BaseQuestion)=>{q.targetAge=8;},(q:BaseQuestion)=>{q.targetGrade=2;},
    (q:BaseQuestion)=>{q.correctOptionId=q.options.find(o=>o.id!==q.correctOptionId)!.id;},
    (q:BaseQuestion)=>{q.authoring!.distractorNotes.A='Uydurma gerekçe';},
    (q:BaseQuestion)=>{q.qualityReport!.stages.pop();},(q:BaseQuestion)=>{q.explanation.steps[0]='Değiştirilen açıklama.';}]) {
    const q=structuredClone(r.question!); change(q); assert.equal(isQuestionReadyForStudents(q),false);
  }
});

test('student generation enforces grade profiles before delivery over 504 requests', () => {
  for (const grade of [1,2,3,4] as SchoolGrade[]) for (const category of Object.keys(STUDENT_CATEGORY_TYPES) as CognitiveCategory[]) for(let d=1;d<=6;d++) for(let n=1;n<=3;n++) {
    const q=generateQuestion({targetGrade:grade,category,difficulty:d as DifficultyLevel,seed:n*917});
    assert.equal(q.targetGrade,grade); assert.ok(q.difficulty<=EDUCATION_PROFILES[grade].maxDifficulty);
    assert.equal(isQuestionReadyForStudents(q),true,JSON.stringify(auditQuestion(q)));
    const report=inspectEducation(q,grade); assert.deepEqual([...report.audience,...report.difficulty,...report.visual],[]);
  }
});

test('profiled visual load and machine prerequisites are checked even when the answer is mathematically correct', () => {
  const q=generateProfessionalQuestion('matrix_3x3',917,6);q.targetGrade=1;q.ageGroup='1-2';
  const r=assessCandidate(q,{grade:1,difficulty:6});
  assert.equal(r.stages.find(s=>s.id==='answer')?.status,'passed');
  assert.equal(r.stages.find(s=>s.id==='audience')?.status,'failed');
  assert.equal(r.stages.find(s=>s.id==='difficulty')?.status,'failed');
  assert.equal(r.stages.find(s=>s.id==='visual')?.status,'failed');
  assert.equal(r.eligible,false);
});


test('recovered engines traverse all nine AI pipeline gates with a mocked reviewer', async () => {
  for (const questionType of ['symmetry_completion', 'shape_combination', 'direction_path', 'number_pyramid']) {
    const ai = reviewer();
    const result = await runQuestionPipeline(ai.client, { ...config, questionType }, { nextSeed: seeds(321) });
    assert.equal(result.success, true, result.rejectionReasons.join(' '));
    assert.equal(result.question?.authoring?.engine, 'verified-4');
    assert.equal(result.qualityReport?.stages.every(stage => stage.status === 'passed'), true);
    assert.equal(isQuestionReadyForStudents(result.question), true);
    assert.equal(ai.prompts.length, 2);
  }
});
