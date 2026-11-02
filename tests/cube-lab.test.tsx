import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CUBE_MECHANICS,CUBE_NETS,CUBE_TOPICS,cubeAllowed,foldCubeNet,generateCubeQuestion,solveCube,validateCubeBoard,type CubeBoard} from '../src/features/questions/cube-lab';
import {independentlySolveCube,independentlyMatchesCube} from '../src/features/questions/cube-solver';
import {cubeIsometricGeometry} from '../src/features/questions/cube-isometric';
import {auditQuestion,isQuestionReadyForStudents,questionStimulusKey} from '../src/features/questions/quality';
import {questionStyleKey} from '../src/features/questions/reasoning-identity';
import {QuestionRenderer} from '../src/features/questions/renderers/QuestionRenderer';
import {OptionRenderer} from '../src/features/questions/renderers/OptionRenderer';
import {publicVisualConfig} from '../src/features/questions/public-visual';
import {LEARNING_QUESTION_FORMAT,PREVIOUS_PERCEPTUAL_QUESTION_FORMAT} from '../src/features/student/learning-question-format';
import {assertLearningQuestionFormat,currentReasoningCandidate,generateVariedLearningQuestion} from '../server/learning-question-selection';
import {generateQuestion} from '../src/features/questions/generators';
import {generatePerceptualQuestion} from '../src/features/questions/perceptual-engine';

const stack={displayMode:'cube_lab',grade:3,size:3,heights:[1,3,0,2,1,0,2,1,1]} as const;
const board=(mechanic:string,extra:Record<string,number>={})=>({...stack,mechanic,...extra});
test('hand-calculated cube counts, layer thresholds, completion volume and direction conventions agree',()=>{
 for(const [b,answer] of [[board('total'),{textNumber:11}],[board('layer-count',{layer:2}),{textNumber:3}],[board('complete-block',{targetHeight:3}),{textNumber:16}],
  [board('front-view'),{cubeView:true,width:3,height:3,cells:[0,1,0,1,1,0,1,1,1]}],
  [board('right-view'),{cubeView:true,width:3,height:3,cells:[0,0,1,1,1,1,1,1,1]}],
  [board('top-view'),{cubeView:true,width:3,height:3,cells:[1,1,0,1,1,0,1,1,1]}],
  [board('rotated-top',{turns:1}),{cubeView:true,width:3,height:3,cells:[1,1,1,1,1,1,1,0,0]}]] as const){
  assert.deepEqual(solveCube(b),answer);assert.deepEqual(independentlySolveCube(b),answer);assert.ok(independentlyMatchesCube(b,answer));
 }
});
test('all eleven free cube nets fold to six different directions and known opposite pairs are exact',()=>{
 assert.equal(CUBE_NETS.length,11);
 for(const coords of CUBE_NETS){const faces=coords.map(([x,y],i)=>({x,y,label:i+1}));assert.equal(new Set([...foldCubeNet(faces).values()].map(v=>v.join(','))).size,6);
  for(let target=1;target<=6;target++){const b={displayMode:'cube_lab',grade:2,mechanic:'net-opposite',faces,target};assert.deepEqual(solveCube(b),independentlySolveCube(b));}
 }
 const faces=[[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]].map(([x,y],i)=>({x,y,label:i+1}));
 for(const [target,opposite] of [[1,5],[2,4],[3,6]])assert.deepEqual(solveCube({displayMode:'cube_lab',grade:2,mechanic:'net-opposite',faces,target}),{textNumber:opposite});
 assert.throws(()=>foldCubeNet([[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]].map(([x,y],i)=>({x,y,label:i+1}))));
});
test('unsupported grade loads, disconnected solids, hidden keys and impossible layers fail closed',()=>{
 for(const b of [{...board('total'),answer:11},{...board('total'),heights:[1,0,0,0,0,0,0,0,1]},board('layer-count',{layer:4}),board('complete-block',{targetHeight:2}),{...board('total'),grade:1}])assert.throws(()=>validateCubeBoard(b));
 assert.equal(independentlyMatchesCube(board('total'),{textNumber:11,hidden:true}),false);
 assert.equal(cubeAllowed('net-opposite',1,2),false);assert.equal(cubeAllowed('total',4,6),false);
});
test('every supported grade/difficulty/mechanic has deterministic proofs and forged keys/explanations are rejected',()=>{
 let count=0;
 for(const g of [1,2,3,4] as const)for(let d=1;d<=6;d++)for(const m of CUBE_MECHANICS)if(cubeAllowed(m,g,d))for(let i=1;i<=20;i++){
  const q=generateCubeQuestion(m,104729*i,d as 1,g),r=auditQuestion(q);count++;
  assert.deepEqual([...r.errors,...r.reviewRequired],[],`${g}/${d}/${m}/${i}`);assert.equal(r.solverVerified,true);assert.equal(q.type,CUBE_TOPICS[m]);
  assert.equal(q.options.filter(o=>independentlyMatchesCube(q.visualConfig,o.visualData)).length,1);
  assert.deepEqual(generateCubeQuestion(m,104729*i,d as 1,g),q);
  if(i===1){assert.equal(auditQuestion({...q,correctOptionId:q.options.find(o=>o.id!==q.correctOptionId)!.id}).solverVerified,false);
   const changed=structuredClone(q);changed.options[1].visualData=changed.options[0].visualData;assert.equal(auditQuestion(changed).solverVerified,false);
   assert.ok(auditQuestion({...q,explanation:{...q.explanation,summary:'Yanlış çözüm'}}).reviewRequired.length);
  }
 }
 assert.ok(count>1500);
});
test('isometric unit edges are equal, hidden faces are culled and the viewBox contains every face',()=>{
 const one=cubeIsometricGeometry(1,[1]);for(const face of [one.cubes[0].top!,one.cubes[0].left!,one.cubes[0].right!])for(let i=0;i<4;i++)assert.ok(Math.abs(Math.hypot(face[i][0]-face[(i+1)%4][0],face[i][1]-face[(i+1)%4][1])-32)<1e-8);
 const adjacent=cubeIsometricGeometry(2,[1,1,0,0]);assert.equal(adjacent.cubes.reduce((n,c)=>n+Number(!!c.top)+Number(!!c.left)+Number(!!c.right),0),5);
 for(const heights of [[4,0,0,0],[4,4,4,4],Array.from({length:16},(_,i)=>i%4+1)]){
  const s=Math.sqrt(heights.length),geometry=cubeIsometricGeometry(s,heights),[x,y,w,h]=geometry.viewBox;
  for(const c of geometry.cubes)for(const p of [...(c.top||[]),...(c.left||[]),...(c.right||[])])assert.ok(p[0]>x&&p[0]<x+w&&p[1]>y&&p[1]<y+h);
 }
});
test('student diagrams remain visible-only, grid options render in SVG, old clients cannot receive cube-lab',()=>{
 for(const m of CUBE_MECHANICS){const q=generateCubeQuestion(m,81719,3,3),visible=publicVisualConfig(q);assert.deepEqual(visible,q.visualConfig);assert.doesNotMatch(JSON.stringify(visible),/correctOptionId|answer|seed|distractorNotes/);
  const html=renderToStaticMarkup(<><QuestionRenderer question={q}/>{q.options.map(o=><OptionRenderer key={o.id} option={o}/>)}</>);assert.match(html,/bj-cube-lab/);assert.doesNotMatch(html,/NaN|undefined|\[object Object\]/);
  for(const format of [undefined,'reasoning-8','professional-v2','reasoning-lab-1','reasoning-lab-2',PREVIOUS_PERCEPTUAL_QUESTION_FORMAT])assert.throws(()=>assertLearningQuestionFormat([q],format));
  assert.doesNotThrow(()=>assertLearningQuestionFormat([q],LEARNING_QUESTION_FORMAT));assert.equal(currentReasoningCandidate(q,3,true,true,true,true),true);assert.equal(currentReasoningCandidate(q,3,true,true,true,false),false);
 }
 const p=generatePerceptualQuestion('attribute-sequence',81719,3,2);assert.doesNotThrow(()=>assertLearningQuestionFormat([p],PREVIOUS_PERCEPTUAL_QUESTION_FORMAT));
 const generated=generateVariedLearningQuestion({grade:3,category:'attention',difficulty:3,seed:104729,typeCounts:new Map(),curriculumV2:true,perceptual:true,cube:true,acceptCandidate:q=>q.authoring?.engine==='cube-lab-1',randomIndex:()=>0});assert.equal(generated.authoring?.engine,'cube-lab-1');assert.ok(isQuestionReadyForStudents(generated));
 assert.equal(generateQuestion({profile:'professional-v2',targetGrade:2,type:'cube_counting',difficulty:2,seed:104729}).authoring?.engine,'cube-lab-1');
});
test('a changed cube height is new visible content but does not disguise the exercise style',()=>{
 const a=generateCubeQuestion('total',104729,2,2),b=generateCubeQuestion('total',81719,2,2);assert.notEqual(questionStimulusKey(a),questionStimulusKey(b));assert.equal(questionStyleKey(a),questionStyleKey(b));
});
