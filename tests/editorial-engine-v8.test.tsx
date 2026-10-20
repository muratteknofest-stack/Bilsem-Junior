import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateProfessionalQuestion as generate, solveBoard, transformTile, VERIFIED_TYPES, type Board, type OrderConstraint, type Tile } from '../src/features/questions/professional-engine';
import { generateProfessionalQuestion as generateV7 } from '../src/features/questions/professional-engine-v7';
import { independentlySolveBoard } from '../src/features/questions/independent-board-solver';
import { ProfessionalBoard } from '../src/features/questions/renderers/ProfessionalBoard';
import { isQuestionReadyForStudents, questionStimulusKey } from '../src/features/questions/quality';
import { questionReasoningKey } from '../src/features/questions/reasoning-identity';
import { professionalGradeTypes, reasoningDifficultyPlan } from '../src/features/questions/reasoning-profile';
import { EDUCATION_PROFILES, inspectEducation } from '../src/features/questions/quality-policy';
import { assertLearningQuestionFormat, currentReasoningCandidate, generateVariedLearningQuestion, recentQuestionExposure, selectLearningQuestions } from '../server/learning-question-selection';
import { learningFormatPath, LEARNING_QUESTION_FORMAT, needsReasoningFormat } from '../src/features/student/learning-question-format';
import { prepareLearningQuestions, publicLearningQuestion, LearningError } from '../server/learning-model';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import type { BaseQuestion, DifficultyLevel } from '../src/types';

test('new number families have hand-calculated next terms and reject inconsistent givens', () => {
  const examples: Array<[Board,number]> = [
    [{displayMode:'verified_board',kind:'numbers',rule:'multiply-add',values:[3,5,15,17,51,53]},159],
    [{displayMode:'verified_board',kind:'numbers',rule:'interleaved-growing',values:[2,8,5,13,10,18,17,23]},26],
  ];
  for(const [b,expected] of examples){
    assert.deepEqual(solveBoard(b),{textNumber:expected});
    assert.deepEqual(independentlySolveBoard(b),{textNumber:expected});
    const broken=structuredClone(b);broken.values![4]++;
    assert.throws(()=>solveBoard(broken));assert.throws(()=>independentlySolveBoard(broken));
  }
});

test('compound transformations require the stated order and both operations', () => {
  let found=0;
  for(const type of ['figure_rotation','matrix_2x2'] as const)for(let seed=1;seed<=40;seed++){
    const q=generate(type,seed*7919,4), b=q.visualConfig as Board;
    if(!b.transformSteps)continue;found++;
    const source=b.tiles!.filter((t):t is Tile=>!!t).at(-1)!, [a,z]=b.transformSteps;
    const first=transformTile(source,a.operation,a.turns);
    const correct=transformTile(first,z.operation,z.turns);
    const reversed=transformTile(transformTile(source,z.operation,z.turns),a.operation,a.turns);
    assert.notDeepEqual(first,correct);assert.notDeepEqual(reversed,correct);
    assert.deepEqual(solveBoard(b),correct);assert.deepEqual(independentlySolveBoard(b),correct);
    assert.ok(q.options.some(o=>JSON.stringify(o.visualData)===JSON.stringify(first)));
    assert.ok(q.options.some(o=>JSON.stringify(o.visualData)===JSON.stringify(reversed)));
    assert.equal(isQuestionReadyForStudents(q),true);
  }
  assert.ok(found>=40);
});

test('advanced matrices infer a unique combination and rotation from both completed rows', () => {
  for(const type of ['matrix_3x3','raven_matrix'] as const)for(let seed=1;seed<=30;seed++){
    const q=generate(type,seed*3571,5),b=q.visualConfig as Board;
    assert.equal(b.matrixMode,'combine-rotate');assert.equal(b.tiles![8],null);
    assert.deepEqual(solveBoard(b),independentlySolveBoard(b));
    assert.equal(isQuestionReadyForStudents(q),true);
    // A family indicator is visible; the inferred operation and angle are absent.
    assert.equal(b.operation,undefined);assert.equal(b.turns,undefined);
    assert.equal(questionReasoningKey(q),questionReasoningKey({...q,type:type==='raven_matrix'?'matrix_3x3':'raven_matrix'}));
  }
});

test('inverse machines draw the unknown input on the left and explain a forward check', () => {
  let found=0;
  for(let seed=1;seed<=50;seed++){
    const q=generate('operation_machine',seed*997,4),b=q.visualConfig as Board;
    if(!b.machineQuery)continue;found++;
    const [[x,y],[xx,yy]]=b.examples!,m=(yy-y)/(xx-x),offset=y-m*x;
    const expected=(b.input!-offset)/m;
    assert.deepEqual(solveBoard(b),{textNumber:expected});
    assert.deepEqual(independentlySolveBoard(b),{textNumber:expected});
    const html=renderToStaticMarkup(<ProfessionalBoard board={b}/>);
    assert.match(html,new RegExp('class="qb-unknown">\\?</span><span[^>]*>→</span><span[^>]*>'+b.input+'</span>'));
    assert.ok(q.explanation.steps.some(s=>s.startsWith('Kontrol:')&&s.includes(`= ${b.input}.`)));
  }
  assert.ok(found>=15);
});

test('conditional attention counts have targets inside and outside every requested region', () => {
  const scopes=new Set<string>();
  for(const level of [2,3,4,5,6] as DifficultyLevel[])for(let seed=1;seed<=30;seed++){
    const q=generate('shape_counting',seed*487,level),b=q.visualConfig as Board;
    scopes.add(b.countScope!);
    const cols=b.columns!,rows=b.items!.length/cols;
    const selected=(i:number)=>{
      const r=Math.floor(i/cols),c=i%cols,border=r===0||r===rows-1||c===0||c===cols-1;
      return b.countScope==='border'?border:b.countScope==='inside'?!border:b.countScope==='oddRows'?r%2===0:r%2===1;
    };
    const expected=b.items!.filter((s,i)=>s===b.target&&selected(i)).length;
    assert.ok(expected>=2);assert.ok(b.items!.filter(s=>s===b.target).length>expected);
    assert.deepEqual(solveBoard(b),{textNumber:expected});
    assert.deepEqual(independentlySolveBoard(b),{textNumber:expected});
    assert.equal(isQuestionReadyForStudents(q),true);
  }
  assert.deepEqual([...scopes].sort(),['border','evenRows','inside','oddRows']);
});

const permutations=(names:string[]):string[][]=>names.length?names.flatMap(n=>permutations(names.filter(v=>v!==n)).map(rest=>[n,...rest])):[[]];
function satisfies(row:string[],clues:OrderConstraint[]){
  return clues.every(c=>{
    if(c.kind==='position')return row[c.position-1]===c.name;
    const l=row.indexOf(c.left),r=row.indexOf(c.right);
    return c.kind==='before'?l<r:c.kind==='distance'?r-l===c.distance:Math.abs(r-l)!==1;
  });
}
test('deduction orders have one full solution and the asked person needs multiple clues', () => {
  for(const level of [3,4,6] as const)for(let seed=1;seed<=12;seed++){
    const q=generate('logic_grid',seed*3571,level),b=q.visualConfig as Board,all=permutations(b.names!),clues=b.constraints!;
    const answers=all.filter(row=>satisfies(row,clues));assert.equal(answers.length,1);
    const subsets=level===3?clues.map(c=>[c]):clues.flatMap((c,i)=>clues.slice(i+1).map(d=>[c,d]));
    for(const subset of subsets)assert.ok(new Set(all.filter(row=>satisfies(row,subset)).map(row=>row[b.position!-1])).size>1);
    assert.deepEqual(independentlySolveBoard(b),{textNumber:answers[0][b.position!-1]});
    assert.equal(isQuestionReadyForStudents(q),true);
  }
});

test('20-question sessions use exact class quotas, balanced areas and independent proofs on modern and old clients', () => {
  const expected=[[4,16],[0,6,14],[0,0,8,12],[0,0,0,4,7,9]];
  for(const grade of [1,2,3,4] as const)for(const legacy of [false,true]){
    let seed=grade*910003;
    const difficultyPlan=reasoningDifficultyPlan(grade,20,()=>0);
    assert.deepEqual(Array.from({length:EDUCATION_PROFILES[grade].maxDifficulty},(_,i)=>difficultyPlan.filter(d=>d===i+1).length),expected[grade-1]);
    const questions=selectLearningQuestions({count:20,category:'mixed',candidates:[],exposure:new Map(),difficultyPlan,preferDiverseTypes:true,randomIndex:()=>0,
      canUse:q=>currentReasoningCandidate(q,grade,!legacy)&&isQuestionReadyForStudents(q),
      generate:(category,typeCounts,difficulty,reasoningCounts)=>generateVariedLearningQuestion({grade,category,difficulty:difficulty!,seed:++seed,typeCounts,reasoningCounts,legacy,randomIndex:()=>0}),
    });
    assert.deepEqual([...questions.map(q=>q.difficulty)].sort(),[...difficultyPlan].sort());
    assert.equal(new Set(questions.map(questionStimulusKey)).size,20);
    for(const category of AVAILABLE_CATEGORIES)assert.equal(questions.filter(q=>q.category===category).length,2);
    for(const q of questions){
      assert.ok(professionalGradeTypes(grade).includes(q.type));
      const report=inspectEducation(q,grade);assert.deepEqual([...report.audience,...report.difficulty,...report.visual],[]);
      if(legacy)assert.equal(needsReasoningFormat(q),false);
    }
  }
});

test('semantic exposure follows the rule across new numbers and selection prefers an unused rule', () => {
  const all=Array.from({length:80},(_,i)=>generate('number_pattern',(i+1)*7919,4));
  const first=all[0],same=all.find(q=>questionReasoningKey(q)===questionReasoningKey(first)&&questionStimulusKey(q)!==questionStimulusKey(first))!;
  const different=all.find(q=>questionReasoningKey(q)!==questionReasoningKey(first))!;
  assert.ok(same&&different);
  const history=recentQuestionExposure([{created_at:'2026-10-20T09:00:00Z',questions:[first]}],true);
  assert.equal(history.has(questionStimulusKey(same)),false);assert.equal(history.has(questionReasoningKey(same)),true);
  const chosen=selectLearningQuestions({count:1,category:'numerical',candidates:[same,different],exposure:history,canUse:isQuestionReadyForStudents,generate:()=>{throw Error('No generation');},randomIndex:()=>0});
  assert.equal(chosen[0].id,different.id);
});

test('saved v7 snapshots retain their keys and new-client negotiation prevents incompatible resumes', () => {
  for(const type of VERIFIED_TYPES)for(const level of [2,4,6] as const){
    const q=generateV7(type,7919,level);
    assert.equal(q.authoring?.engine,'verified-7');assert.equal(isQuestionReadyForStudents(q),true,q.id);
    assert.equal(needsReasoningFormat(q),false);assert.doesNotThrow(()=>assertLearningQuestionFormat([q],undefined));
  }
  const fresh=Array.from({length:20},(_,i)=>generate('figure_rotation',(i+1)*997,4)).find(needsReasoningFormat)!;
  const snapshot=JSON.stringify(fresh);
  assert.throws(()=>assertLearningQuestionFormat([fresh],undefined),(e:unknown)=>e instanceof LearningError&&e.status===426);
  assert.doesNotThrow(()=>assertLearningQuestionFormat([fresh],LEARNING_QUESTION_FORMAT));
  assert.equal(JSON.stringify(fresh),snapshot);
  for(const path of ['start','sessions/id','sessions/id/answer?view=update','sessions/id/finish?view=update']){
    const url=new URL(learningFormatPath(path),'https://test.invalid/api/learning/');
    assert.equal(url.searchParams.get('questionFormat'),LEARNING_QUESTION_FORMAT);
    if(path.includes('view=update'))assert.equal(url.searchParams.get('view'),'update');
  }
  const publicQ=publicLearningQuestion(prepareLearningQuestions([fresh])[0]);
  for(const secret of ['seed','authoring','correctOptionId','explanation'])assert.equal(Object.hasOwn(publicQ,secret),false);
  assert.deepEqual(publicQ.visualConfig,fresh.visualConfig);
});
