import test from 'node:test';
import assert from 'node:assert/strict';
import {generateColorfulQuestion,solveColorful,independentlyMatchesColorful,type ColorfulBoard,type MosaicRule} from '../src/features/questions/colorful-engine';
import {generateProfessionalQuestion,solveBoard,type Board,orderSatisfies,VERIFIED_TYPES} from '../src/features/questions/professional-engine';
import {generateProfessionalQuestion as legacyProfessional} from '../src/features/questions/professional-engine-v5';
import {independentlySolveBoard} from '../src/features/questions/independent-board-solver';
import {auditQuestion,isQuestionReadyForStudents} from '../src/features/questions/quality';
import {evaluateResponse} from '../src/features/questions/answer-interactions';
import {generateQuestion,ALL_QUESTION_TYPES} from '../src/features/questions/generators';
import {gradeDifficulty} from '../src/features/questions/quality-policy';
import {topicAllowedForGrade} from '../src/features/questions/topic-catalog';
import {checkArithmeticExplanations} from '../src/features/questions/explanation-arithmetic';

const permute=(names:string[]):string[][]=>names.length?names.flatMap(n=>permute(names.filter(x=>x!==n)).map(rest=>[n,...rest])):[[]];
test('all four mosaic layouts infer every hidden position from visible cells only',()=>{
 const examples:Record<MosaicRule,number[]>={
  'repeat-row':[0,1,2,0,1,2,0,1,2], 'repeat-column':[0,0,0,1,1,1,2,2,2],
  'shift-row':[0,1,2,1,2,0,2,0,1], 'shift-column':[0,2,1,1,0,2,2,1,0],
 };
 for(const [rule,cells] of Object.entries(examples))for(let missing=0;missing<9;missing++){
  const b:ColorfulBoard={displayMode:'colorful_board',kind:'figure_completion',mosaicRule:rule as MosaicRule,source:{art:'mosaic',size:3,cells:[...cells]},missing};
  // A wrong hidden value must have no influence on either proof.
  if(b.source?.art==='mosaic')b.source.cells[missing]=(cells[missing]+1)%6;
  assert.deepEqual(solveColorful(b),{art:'swatch',color:cells[missing]});
  assert.deepEqual([0,1,2,3,4,5].filter(color=>independentlyMatchesColorful(b,{art:'swatch',color})),[cells[missing]]);
  const broken=structuredClone(b);if(broken.source?.art==='mosaic'){const index=broken.source.cells.findIndex((_,i)=>i!==missing);broken.source.cells[index]=5;}
  assert.throws(()=>solveColorful(broken),/Görünen/);
 }
});
test('relative order puzzles prove the entire arrangement, including ambiguous same-answer cases',()=>{
 const b:Board={displayMode:'verified_board',kind:'order',names:['Ada','Bora','Can','Duru'],clues:[],position:3,constraints:[{kind:'position',name:'Ada',position:1},{kind:'distance',left:'Bora',right:'Duru',distance:2}]};
 assert.deepEqual(solveBoard(b),{textNumber:'Can'});assert.deepEqual(independentlySolveBoard(b),{textNumber:'Can'});
 const ambiguous=structuredClone(b);ambiguous.constraints=[{kind:'position',name:'Ada',position:1},{kind:'before',left:'Bora',right:'Duru'}];ambiguous.position=1;
 assert.throws(()=>solveBoard(ambiguous),/tek çözümlü/);assert.throws(()=>independentlySolveBoard(ambiguous),/tek sıra/);
 for(const difficulty of [3,4,6] as const){
  const q=generateProfessionalQuestion('logic_grid',7919,difficulty),board=q.visualConfig as Board;
  const valid=permute(board.names!).filter(order=>orderSatisfies(board,order));assert.equal(valid.length,1);
  assert.equal(evaluateResponse(q,{mode:'order',slots:valid[0]}).correct,true);
  const wrong=[...valid[0]],other=wrong.map((_,i)=>i).filter(i=>i!==board.position!-1);[wrong[other[0]],wrong[other[1]]]=[wrong[other[1]],wrong[other[0]]];
  assert.deepEqual(evaluateResponse(q,{mode:'order',slots:wrong}),{complete:true,correct:false});
 }
});
test('new visual patterns use connected pieces with at most one corner marker; reflection and memory choices preserve the palette',()=>{
 for(let seed=1;seed<=80;seed++){
  const q=generateProfessionalQuestion('figure_rotation',seed*7919,4),tile=(q.visualConfig as Board).tiles![0]!;
  const start=tile.cells.findIndex((v,i)=>v&&[i-tile.size,i+tile.size,...(i%tile.size?[i-1]:[]),...(i%tile.size<tile.size-1?[i+1]:[])].some(j=>tile.cells[j]===1)),seen=new Set([start]),todo=[start];
  while(todo.length){const i=todo.pop()!;for(const j of [i-tile.size,i+tile.size,...(i%tile.size?[i-1]:[]),...(i%tile.size<tile.size-1?[i+1]:[])])if(tile.cells[j]===1&&!seen.has(j)){seen.add(j);todo.push(j);}}
  assert.ok(tile.cells.filter(Boolean).length-seen.size<=1);assert.ok(seen.size>=3&&seen.size<=8);
  for(const type of ['visual_memory','mirror_reflection'] as const){
   const colorful=generateQuestion({type,targetGrade:3,seed:seed*3571,difficulty:4});
   const palettes=colorful.options.map(o=>JSON.stringify([...(o.visualData as any).cells].sort()));
   assert.equal(new Set(palettes).size,1,'No option can be eliminated by a new colour or changed colour count.');
  }
 }
});
test('old saved questions remain verifiable and arithmetic errors block publication',()=>{
 for(const type of VERIFIED_TYPES)assert.equal(isQuestionReadyForStudents(legacyProfessional(type,113,3)),true,type);
 for(const type of ['figure_completion','mirror_reflection','visual_memory'] as const)assert.equal(isQuestionReadyForStudents(generateColorfulQuestion(type,113,3,true)),true,type);
 const q=generateProfessionalQuestion('number_pattern',123,3);q.explanation.steps.push('12 − 3 × 2 = 18.');
 assert.ok(auditQuestion(q).errors.some(e=>e.includes('işlem hatası')));
});
test('thousands of grade-aware samples across both profiles pass independent proof, uniqueness and arithmetic checks',t=>{
 let count=0;
 for(const targetGrade of [1,2,3,4] as const)for(const profile of ['professional','complete'] as const)for(const type of ALL_QUESTION_TYPES){
  if(profile==='professional'&&!topicAllowedForGrade(type,targetGrade))continue;
  for(let sample=0;sample<10;sample++){
   // The normal profile keeps direct lookup topics too, so every supported type is audited.
   const q=generateQuestion({profile:profile==='complete'?'complete':undefined,targetGrade,type,difficulty:gradeDifficulty(targetGrade,1+sample%6),seed:100003+sample*7919+targetGrade*1543});
   const report=auditQuestion(q);assert.equal(report.solverVerified,true,`${q.id}: ${JSON.stringify(report.errors)}`);
   assert.deepEqual(report.errors,[]);assert.deepEqual(checkArithmeticExplanations(q).errors,[]);
   assert.equal(report.mechanics?.matchingOptions,1);assert.equal(report.mechanics?.uniqueVisibleOptions,4);count++;
  }
 }
 t.diagnostic(`Audited ${count} grade-aware samples`);assert.ok(count>=3000);
});
