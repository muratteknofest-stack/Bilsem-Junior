import test from 'node:test';
import assert from 'node:assert/strict';
import { scaffoldDifficultyPlan, orderTestQuestions, describeTestAssembly } from '../src/features/questions/test-assembly';
import { reasoningDifficultyPlan } from '../src/features/questions/reasoning-profile';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { generateQuestion } from '../src/features/questions/generators';
import { isQuestionReadyForStudents, questionStimulusKey, questionVisualKey } from '../src/features/questions/quality';
import { solveQuestion } from '../src/features/questions/universal-solver';
import { recentQuestionExposure, selectLearningQuestions, generateVariedLearningQuestion, learningStimulusKey } from '../server/learning-question-selection';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import type { BaseQuestion } from '../src/types';
import { LearningError } from '../server/learning-model';
import { questionReasoningKey, questionStyleKey } from '../src/features/questions/reasoning-identity';
import { professionalGradeTypes } from '../src/features/questions/reasoning-profile';
import { STUDENT_CATEGORY_TYPES } from '../src/features/questions/generators';
import { generateProfessionalQuestion } from '../src/features/questions/professional-engine';
import { chooseDiverseCandidate } from '../src/features/questions/novelty';
import { QuestionDiversityError,readQuestionDiversityError } from '../src/features/questions/test-diversity';
import { DiversityRecoveryNotice } from '../src/components/student/DiversityRecoveryNotice';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
  assert.throws(() => selectLearningQuestions(options), QuestionDiversityError);
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
    const questions=selectLearningQuestions({count:20,category:'mixed',redistributeRepeatedCategories:true,requireDistinctStyles:true,
      candidates:[],exposure:new Map(),difficultyPlan:plan,canUse:q=>q.targetGrade===grade&&isQuestionReadyForStudents(q),randomIndex,
      generate:(category,typeCounts,difficulty,reasoningCounts)=>generateVariedLearningQuestion({grade,category,difficulty:difficulty!,typeCounts,reasoningCounts,seed:++seed,randomIndex})});
    assert.deepEqual(questions.map(q=>q.difficulty),plan);
    assert.equal(new Set(questions.map(questionReasoningKey)).size,20);
    assert.equal(new Set(questions.map(questionStyleKey)).size,20);
    assert.equal(new Set(questions.map(q=>q.category)).size,10);
  }
});

test('strict selection refuses a repeated style even with fresh IDs, new angles and explicit history reuse', () => {
  const candidates=Array.from({length:40},(_,i)=>generateQuestion({targetGrade:4,type:'figure_rotation',difficulty:2,seed:(i+1)*7919}));
  const input=JSON.stringify(candidates);
  for(const repeatPolicy of ['unseen','oldest-first'] as const)assert.throws(()=>selectLearningQuestions({
    count:2,category:'spatial',candidates,requireDistinctStyles:true,repeatPolicy,
    exposure:new Map(),canUse:isQuestionReadyForStudents,generate:()=>candidates[30],
  }),error=>error instanceof QuestionDiversityError&&error.preparedCount===1&&error.requestedCount===2);
  assert.equal(JSON.stringify(candidates),input);
  assert.throws(()=>chooseDiverseCandidate(candidates.slice(1),[candidates[0]],true),QuestionDiversityError);
});

test('engine changes and superficial transform changes cannot create a new style', () => {
  const question=(type:BaseQuestion['type'],profile:'professional'|'complete',seed=7919)=>generateQuestion({type,profile,targetGrade:4,difficulty:4,seed});
  for(const type of ['figure_rotation','number_pattern','number_pyramid','shape_equation','shadow_matching','word_scramble_logic','paper_folding'] as const){
    const normal=question(type,'professional'),complete=question(type,'complete');
    if(type==='figure_rotation') {
      const direct=Array.from({length:40},(_,i)=>question(type,'professional',(i+1)*997)).find(q=>!(q.visualConfig as {transformSteps?:unknown}).transformSteps)!;
      assert.equal(questionStyleKey(direct),questionStyleKey(complete));
    } else if(type==='number_pattern') {
      const easy=generateQuestion({type,profile:'professional',targetGrade:4,difficulty:1,seed:7919});
      assert.equal(questionStyleKey(easy),questionStyleKey(complete));
    } else assert.equal(questionStyleKey(normal),questionStyleKey(complete),type);
  }
  const left=question('dice_unfold','professional'),right=question('spatial_origami','professional',19937);
  assert.equal(questionStyleKey(left),questionStyleKey(right));
  const folds=question('punch_folding','professional');
  assert.equal(questionStyleKey(folds),questionStyleKey({...folds,visualConfig:{...folds.visualConfig,folds:['y','x'],size:3}}));
});

test('diversity shortage metadata is bounded and recovery choices do not silently start or truncate a test', () => {
  const error=new QuestionDiversityError(45,23);
  const restored=readQuestionDiversityError({code:error.code,requestedCount:45,preparedCount:23});
  assert.ok(restored instanceof QuestionDiversityError);
  for(const payload of [null,{code:error.code,requestedCount:51,preparedCount:3},{code:error.code,requestedCount:5,preparedCount:5},
    {code:error.code,requestedCount:'5',preparedCount:2},{code:error.code,requestedCount:5,preparedCount:-1}])assert.equal(readQuestionDiversityError(payload),null);
  let starts=0;
  const html=renderToStaticMarkup(React.createElement(DiversityRecoveryNotice,{error,busy:false,shorterCount:15,onMixed:()=>starts++,onShorter:()=>starts++}));
  assert.equal(starts,0);
  assert.match(html,/45/);assert.match(html,/23/);assert.match(html,/15 soruluk hedef seç/);
  assert.match(html,/kendiliğinden değiştirilmez/);
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

test('normal mixed sessions fill fifty verified slots for every grade without duplicate stimuli or changing the difficulty plan', () => {
  for (const grade of [1, 2, 3, 4] as const) {
    const randomIndex = seededRandom(grade * 10931);
    const plan = scaffoldDifficultyPlan(reasoningDifficultyPlan(grade, 50, randomIndex));
    let seed = grade * 100003;
    const questions = selectLearningQuestions({
      count: 50, category: 'mixed', candidates: [], exposure: new Map(), difficultyPlan: plan,
      redistributeRepeatedCategories: true, randomIndex,
      canUse: q => q.targetGrade === grade && isQuestionReadyForStudents(q),
      generate: (category, typeCounts, difficulty, reasoningCounts, acceptCandidate) => generateVariedLearningQuestion({
        grade, category, difficulty: difficulty!, seed: ++seed, typeCounts, reasoningCounts, acceptCandidate, randomIndex,
      }),
    });
    assert.equal(questions.length, 50);
    assert.deepEqual(questions.map(q => q.difficulty), plan);
    assert.equal(new Set(questions.map(questionStimulusKey)).size, 50);
    assert.equal(new Set(questions.map(questionVisualKey)).size, 50);
    assert.equal(new Set(questions.map(q => q.category)).size, AVAILABLE_CATEGORIES.length);
    const areaCounts = AVAILABLE_CATEGORIES.map(area => questions.filter(q => q.category === area).length);
    assert.ok(Math.max(...areaCounts) - Math.min(...areaCounts) <= 1);
    assert.ok(new Set(questions.map(questionStyleKey)).size >= 15);
    for (const q of questions) {
      const proof = solveQuestion(q);
      assert.ok(proof.canSolve && proof.isMatch && !proof.ambiguityDetected);
    }
  }
});

test('generation searches other verified types when a seed cannot satisfy the current session constraints', () => {
  let inspected = 0;
  const q = generateVariedLearningQuestion({
    grade: 1, category: 'numerical', difficulty: 1, seed: 29137,
    typeCounts: new Map(), randomIndex: () => 0,
    acceptCandidate: candidate => { inspected++; return candidate.type === 'number_pyramid'; },
  });
  assert.equal(q.type, 'number_pyramid');
  assert.ok(inspected > 1);
  assert.ok(isQuestionReadyForStudents(q));
});

test('twenty-question first-grade sessions remain fresh across repeated starts', () => {
  const exposure = new Map<string, number>();
  let seed = 700003;
  for (let session = 0; session < 3; session++) {
    const randomIndex = seededRandom(9001 + session);
    const plan = scaffoldDifficultyPlan(reasoningDifficultyPlan(1, 20, randomIndex));
    const questions = selectLearningQuestions({
      count: 20, category: 'mixed', candidates: [], exposure, difficultyPlan: plan,
      redistributeRepeatedCategories: true, randomIndex,
      canUse: q => q.targetGrade === 1 && isQuestionReadyForStudents(q),
      generate: (category, typeCounts, difficulty, reasoningCounts, acceptCandidate) => generateVariedLearningQuestion({
        grade: 1, category, difficulty: difficulty!, seed: ++seed, typeCounts, reasoningCounts, acceptCandidate, exposure, randomIndex,
      }),
    });
    assert.equal(questions.length, 20);
    assert.ok(questions.every(q => !exposure.has(questionStimulusKey(q)) && !exposure.has(questionVisualKey(q))));
    for (const [key, time] of recentQuestionExposure([{ questions, created_at: new Date(1700000000000 + session * 1000).toISOString() }], true)) exposure.set(key, time);
  }
});

test('balanced practice rejects identical displayed tasks under different topic aliases, including history', () => {
  const original = generateQuestion({ targetGrade: 2, type: 'dice_unfold', difficulty: 2, seed: 7919 });
  const alias = { ...original, id: 'renamed-topic', type: 'spatial_origami' as const };
  assert.equal(learningStimulusKey(original), learningStimulusKey(alias));
  const base = { category: 'spatial' as const, candidates: [original, alias], allowGeneration: false,
    canUse: () => true, generate: () => { throw Error('disabled'); }, randomIndex: () => 0 };
  assert.throws(() => selectLearningQuestions({ ...base, count: 2, exposure: new Map() }),
    error => error instanceof QuestionDiversityError && error.preparedCount === 1);
  const exposure = recentQuestionExposure([{ questions: [original], created_at: '2026-10-24T09:00:00Z' }]);
  assert.throws(() => selectLearningQuestions({ ...base, candidates: [alias], count: 1, exposure }),
    error => error instanceof QuestionDiversityError && error.preparedCount === 0);
});
