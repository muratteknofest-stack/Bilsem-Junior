import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {COLORFUL_TYPES,solveColorful,independentlyMatchesColorful,type ColorfulBoard} from '../src/features/questions/colorful-engine';
import {generateQuestion} from '../src/features/questions/generators';
import {auditQuestion,isQuestionReadyForStudents} from '../src/features/questions/quality';
import {generateWorkshopQuestion} from '../src/features/questions/workshop-engine';
import {generateProfessionalQuestion} from '../src/features/questions/professional-engine';
import {ColorfulArt} from '../src/features/questions/renderers/ColorfulBoard';

test('colorful rules agree with manually calculated examples',()=>{
 const mirror:ColorfulBoard={displayMode:'colorful_board',kind:'mirror_reflection',source:{art:'mosaic',size:2,cells:[0,1,2,3]}};
 assert.deepEqual(solveColorful(mirror),{art:'mosaic',size:2,cells:[1,0,3,2]});
 assert.equal(independentlyMatchesColorful(mirror,{art:'mosaic',size:2,cells:[2,3,0,1]}),false);
 const missing:ColorfulBoard={displayMode:'colorful_board',kind:'figure_completion',source:{art:'mosaic',size:2,cells:[2,4,2,4]},missing:3};
 assert.deepEqual(solveColorful(missing),{art:'swatch',color:4});
 assert.deepEqual(solveColorful({displayMode:'colorful_board',kind:'spatial_relationship',layers:[3,1,2,0],angles:[0,45,90,135],targetDepth:1}),{art:'crayon',color:2});
});
test('1,200 grade-aware colorful questions have four distinct choices and one proven answer',()=>{
 for(const type of COLORFUL_TYPES)for(const grade of [1,2,3,4] as const)for(let seed=1;seed<=60;seed++){
  const q=generateQuestion({type,targetGrade:grade,difficulty:6,seed:seed*7919});
  assert.equal(auditQuestion(q).solverVerified,true,q.id);
  assert.deepEqual(q,generateQuestion({type,targetGrade:grade,difficulty:6,seed:seed*7919}));
  const b=q.visualConfig as ColorfulBoard;
  if(b.source?.art==='mosaic')assert.ok(b.source.size<=(grade<=2?3:4));
  const wrong=structuredClone(q);wrong.correctOptionId=q.options.find(o=>o.id!==q.correctOptionId)!.id;assert.equal(isQuestionReadyForStudents(wrong),false);
  const hidden=structuredClone(q);(hidden.options[0].visualData as any).invisible='different';assert.equal(isQuestionReadyForStudents(hidden),false);
 }
});
test('shadow candidates have distinct silhouettes and historical engines remain certified',()=>{
 for(let shape=0;shape<3;shape++)assert.equal(new Set([0,1,2,3].map(variant=>renderToStaticMarkup(<ColorfulArt value={{art:'object',shape,variant,tilt:0}} shadow/>))).size,4);
 for(const type of COLORFUL_TYPES){const old=type==='mirror_reflection'?generateProfessionalQuestion(type,321,3):generateWorkshopQuestion(type,321,3);assert.equal(isQuestionReadyForStudents(old),true);}
});
