import test from 'node:test';
import assert from 'node:assert/strict';
import { scaffoldDifficultyPlan, orderTestQuestions, describeTestAssembly } from '../src/features/questions/test-assembly';
import { reasoningDifficultyPlan } from '../src/features/questions/reasoning-profile';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { generateQuestion } from '../src/features/questions/generators';
import { isQuestionReadyForStudents, questionStimulusKey, questionVisualKey } from '../src/features/questions/quality';
import { solveQuestion } from '../src/features/questions/universal-solver';
import { recentQuestionExposure, selectLearningQuestions, generateVariedLearningQuestion } from '../server/learning-question-selection';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import type { BaseQuestion } from '../src/types';
import { LearningError } from '../server/learning-model';
import { questionReasoningKey, questionStyleKey } from '../src/features/questions/reasoning-identity';
import { professionalGradeTypes } from '../src/features/questions/reasoning-profile';
import { STUDENT_CATEGORY_TYPES } from '../src/features/questions/generators';
import { generateProfessionalQuestion } from '../src/features/questions/professional-engine';
import { chooseDiverseCandidate } from '../src/features/questions/novelty';

function seededRandom(seed: number) {
  return (maximum: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor(seed / 4294967296 * maximum);
  };
}

test('scaffolding preserves exact grade quotas for short, adventure and full-length tests', () => {
  for (const grade of [1, 2, 3, 4] as const) for (const count of [1, 5, 20, 45, 50]) {
    const original = reasoningDifficultyPlan(grade, count, seededRandom(grade * 100 + count));
    const snapshot = [...original], plan = scaffoldDifficultyPlan(original);
    assert.deepEqual(original, snapshot);
    assert.deepEqual([...plan].sort(), [...original].sort());
    assert.ok(plan.every(level => level >= 1 && level <= EDUCATION_PROFILES[grade].maxDifficulty));
    if (count >= 5) assert.equal(plan[0], Math.min(...original));
  }
});

test('real twenty-question adventures retain category quotas, planned difficulty, proof and novelty across sessions', () => {
  for (const grade of [1, 2, 3, 4] as const) {
    let seed = grade * 800001;
    const history = new Map<string, number>();
    for (let session = 0; session < 3; session++) {
      const randomIndex = seededRandom(grade * 9107 + session);
      const plan = scaffoldDifficultyPlan(reasoningDifficultyPlan(grade, 20, randomIndex));
      const selected = selectLearningQuestions({
        count: 20, category: 'mixed', preferDiverseTypes: true,
        candidates: [], exposure: history, randomIndex, difficultyPlan: plan,
        canUse: q => q.targetGrade === grade && isQuestionReadyForStudents(q),
        generate: (category, typeCounts, difficulty, reasoningCounts) => generateVariedLearningQuestion({
          grade, category, difficulty: difficulty!, seed: ++seed, typeCounts, reasoningCounts,
          exposure: history, randomIndex,
        }),
      });
      assert.deepEqual(selected.map(q => q.difficulty), plan);
      assert.equal(new Set(selected.map(questionStimulusKey)).size, 20);
      assert.equal(new Set(selected.map(questionVisualKey)).size, 20);
      for (const category of AVAILABLE_CATEGORIES) assert.equal(selected.filter(q => q.category === category).length, 2);
      for (const q of selected) {
        assert.ok(!history.has(questionStimulusKey(q)) && !history.has(questionVisualKey(q)));
        const proof = solveQuestion(q);
        assert.ok(proof.canSolve && proof.isMatch && !proof.ambiguityDetected);
      }
      const report = describeTestAssembly(selected);
      assert.equal(report.count, 20);
      assert.ok(Object.keys(report.types).length >= 10);
      assert.ok(report.reasoningFamilies >= 10);
      const exposure = recentQuestionExposure([{questions: selected, created_at: `2026-10-${19 + session}T09:00:00Z`}], true);
      for (const [key, time] of exposure) history.set(key, time);
    }
  }
});

test('normal tests fail on exhausted fresh content; only an explicit repetition policy may reuse history', () => {
  const q = generateQuestion({targetGrade: 2, type: 'number_pattern', difficulty: 2, seed: 82001});
  const options = {
    count: 1, category: 'numerical' as const, candidates: [q],
    exposure: new Map([[questionStimulusKey(q), 100]]),
    canUse: isQuestionReadyForStudents, allowGeneration: false,
    generate: () => { throw Error('Generation was disabled'); },
  };
  assert.throws(() => selectLearningQuestions(options), LearningError);
  assert.equal(selectLearningQuestions({...options, repeatPolicy: 'oldest-first'})[0].id, q.id);
});

test('ordering cannot change a difficulty blueprint or silently discard a question', () => {
  const questions = [1, 2, 3].map(difficulty => generateQuestion({
    targetGrade: 4, type: 'number_pattern', difficulty: difficulty as 1 | 2 | 3, seed: 90100 + difficulty,
  }));
  const selected = orderTestQuestions(questions, [3, 1, 2]);
  assert.deepEqual(selected.map(q => q.difficulty), [3, 1, 2]);
  assert.deepEqual(new Set(selected.map(q => q.id)), new Set(questions.map(q => q.id)));
  assert.throws(() => orderTestQuestions(questions, [1]), /TEST_PLAN_LENGTH/);
  assert.throws(() => orderTestQuestions(questions, [1, 1, 1]), /TEST_PLAN_DIFFICULTY/);
});

test('invalid lengths are rejected before selection or generation', () => {
  for (const count of [0, -1, 1.5, 51, Number.NaN]) {
    assert.throws(() => selectLearningQuestions({
      count, category: 'mixed', candidates: [], exposure: new Map(), canUse: () => true,
      generate: () => { assert.fail('Invalid request reached generation'); },
    }), LearningError);
  }
});

test('aliases and cosmetic complexity cannot masquerade as different mechanics', () => {
  const question=(type:BaseQuestion['type'],seed=7919)=>generateQuestion({targetGrade:2,type,difficulty:2,seed});
  const cube=question('dice_unfold'),origami=question('spatial_origami',19937);
  assert.equal(questionReasoningKey(cube),questionReasoningKey(origami));
  assert.equal(questionStyleKey(cube),questionStyleKey(origami));
  assert.equal(questionReasoningKey(question('paper_folding')),questionReasoningKey(question('punch_folding')));
  assert.equal(questionReasoningKey(question('matrix_2x2')),questionReasoningKey(question('figure_rotation')));
  const mirror=question('mirror_reflection');
  const tileMirror=Array.from({length:10},(_,i)=>generateProfessionalQuestion('mirror_reflection',7919+i,2))
    .find(q=>(q.visualConfig as {operation?:string}).operation==='mirrorX')!;
  assert.equal(questionReasoningKey(mirror),questionReasoningKey(tileMirror));
  const memory=question('visual_memory');
  assert.equal(questionReasoningKey(memory),questionReasoningKey({...memory,visualConfig:{...memory.visualConfig,source:{size:4}}}));
});

test('analogy rules remain distinct instead of collapsing genuine fill, union and completion tasks', () => {
  const questions=Array.from({length:60},(_,i)=>generateQuestion({targetGrade:2,type:'visual_analogy',difficulty:2,seed:(i+1)*7919}));
  assert.equal(new Set(questions.map(questionReasoningKey)).size,3);
  assert.equal(new Set(questions.map(questionStyleKey)).size,3);
});

test('two topic aliases cannot displace a different eligible task in the bank', () => {
  const candidates=['dice_unfold','spatial_origami','top_view'].map((type,i)=>generateQuestion({targetGrade:2,type:type as BaseQuestion['type'],difficulty:2,seed:7919+i*997}));
  const questions=selectLearningQuestions({count:2,category:'spatial',candidates,allowGeneration:false,
    exposure:new Map(),canUse:isQuestionReadyForStudents,randomIndex:max=>max-1,generate:()=>{throw Error('disabled');}});
  assert.equal(new Set(questions.map(questionReasoningKey)).size,2);
  assert.ok(questions.some(q=>q.type==='top_view'));
});

test('a generated new rule outranks an unassigned bank variant of an already selected rule', () => {
  const all=Array.from({length:40},(_,i)=>generateQuestion({targetGrade:2,type:'number_pattern',difficulty:2,seed:(i+1)*7919}));
  const first=all[0],same=all.find(q=>q.id!==first.id&&questionReasoningKey(q)===questionReasoningKey(first))!;
  const other=all.find(q=>questionReasoningKey(q)!==questionReasoningKey(first))!;
  const questions=selectLearningQuestions({count:2,category:'numerical',candidates:[first,same],exposure:new Map(),
    canUse:isQuestionReadyForStudents,randomIndex:max=>max-1,generate:()=>other});
  assert.equal(new Set(questions.map(questionReasoningKey)).size,2);
});

test('generation searches other types when the least-used type has no new rule', () => {
  const grade=2,category='numerical',typeCounts=new Map<BaseQuestion['type'],number>();
  for(const type of professionalGradeTypes(grade).filter(type=>STUDENT_CATEGORY_TYPES[category].includes(type)))typeCounts.set(type,type==='weight_comparison'?0:1);
  const used=generateQuestion({targetGrade:grade,type:'weight_comparison',difficulty:2,seed:7919});
  const q=generateVariedLearningQuestion({grade,category,difficulty:2,seed:19937,typeCounts,
    reasoningCounts:new Map([[questionReasoningKey(used),1],[questionStyleKey(used),1]]),randomIndex:()=>0});
  assert.notEqual(q.type,'weight_comparison');
  assert.notEqual(questionReasoningKey(q),questionReasoningKey(used));
});

test('mixed adventures transfer exhausted area quotas while retaining grade, length and difficulty slots', () => {
  for(const grade of [1,2,3,4] as const) {
    const randomIndex=seededRandom(grade*971),plan=scaffoldDifficultyPlan(reasoningDifficultyPlan(grade,20,randomIndex));
    let seed=grade*100003;
    const questions=selectLearningQuestions({count:20,category:'mixed',redistributeRepeatedCategories:true,
      candidates:[],exposure:new Map(),difficultyPlan:plan,canUse:q=>q.targetGrade===grade&&isQuestionReadyForStudents(q),randomIndex,
      generate:(category,typeCounts,difficulty,reasoningCounts)=>generateVariedLearningQuestion({grade,category,difficulty:difficulty!,typeCounts,reasoningCounts,seed:++seed,randomIndex})});
    assert.deepEqual(questions.map(q=>q.difficulty),plan);
    assert.equal(new Set(questions.map(questionReasoningKey)).size,20);
    assert.equal(new Set(questions.map(q=>q.category)).size,10);
  }
});

test('limited topic pools spread all eligible rules before repeating one', () => {
  const candidates=Array.from({length:90},(_,i)=>generateQuestion({targetGrade:2,type:'number_pattern',difficulty:2,seed:(i+1)*7919}));
  const questions=selectLearningQuestions({count:12,category:'numerical',candidates,exposure:new Map(),allowGeneration:false,
    canUse:isQuestionReadyForStudents,randomIndex:seededRandom(71),generate:()=>{throw Error('disabled');}});
  const counts=new Map<string,number>();
  for(const q of questions)counts.set(questionReasoningKey(q),(counts.get(questionReasoningKey(q))||0)+1);
  assert.equal(counts.size,3);
  assert.deepEqual([...counts.values()],[4,4,4]);
});

test('shared daily/demo novelty selection prefers a different style over a new angle of a used style', () => {
  const rotations=Array.from({length:80},(_,i)=>generateProfessionalQuestion('figure_rotation',(i+1)*7919,4));
  const rotation=rotations.find(q=>!(q.visualConfig as {transformSteps?:unknown}).transformSteps)!;
  const related=rotations.find(q=>questionReasoningKey(q)!==questionReasoningKey(rotation)&&questionStyleKey(q)===questionStyleKey(rotation))!;
  assert.ok(related);
  const other=generateQuestion({targetGrade:4,type:'top_view',difficulty:4,seed:19937});
  assert.equal(chooseDiverseCandidate([related,other],[rotation]).id,other.id);
});
