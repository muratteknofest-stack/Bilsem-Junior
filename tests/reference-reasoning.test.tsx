import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateQuestionByType } from '../src/features/questions/generators';
import { analyzeQuestionMechanics, visibleOptionKey } from '../src/features/questions/mechanical-quality';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';
import { makeFigureTask, validateFigureTask } from '../src/features/questions/figure-analogy';
import { solveSymbolDeduction } from '../src/features/questions/symbol-deduction';
import { WorkshopBoard } from '../src/features/questions/renderers/WorkshopBoard';
import { AnalogyFigure } from '../src/features/questions/renderers/AnalogyFigure';
import { generateWorkshopQuestion as legacy } from '../src/features/questions/workshop-engine-v2';
import type { WorkshopBoard as Board } from '../src/features/questions/workshop-mechanics';
test('reference symbol codes require one inferred mapping across unordered rows',()=>{
  assert.equal(solveSymbolDeduction({cipherRows:[['▲','●','■'],['■','●','▲'],['▲','■','●'],['●','▲','■']],numberCodes:['784','478','847','487'],querySymbols:['●','■','▲']}),'874');
  assert.throws(()=>solveSymbolDeduction({cipherRows:[['▲','●','■'],['■','●','▲'],['▲','■','●'],['●','▲','■']],numberCodes:['123','123','123','123'],querySymbols:['●','■','▲']}));
});
test('new families produce deterministic, distinct choices with two agreeing proofs',()=>{
  const families=new Set<string>();
  for(let seed=1;seed<=100;seed++)for(const difficulty of [1,2,3,4,5,6] as const)for(const type of ['visual_analogy','cryptogram'] as const){
    const q=generateQuestionByType(type,seed,difficulty),b=q.visualConfig as unknown as Board;
    assert.deepEqual(q,generateQuestionByType(type,seed,difficulty));
    assert.equal(analyzeQuestionMechanics(q).passed,true,`${type}/${seed}/${difficulty}`);
    assert.equal(isQuestionReadyForStudents(q),true,`${type}/${seed}/${difficulty}`);
    assert.equal(new Set(q.options.map(o=>visibleOptionKey(o.visualData))).size,4);
    if(b.figureTask)families.add(b.figureTask);
  }
  assert.deepEqual([...families].sort(),['fill_exchange','half_completion','line_union']);
});
test('invisible figure metadata and ambiguous rules are rejected',()=>{
  const task=makeFigureTask(9,3);
  const tampered=structuredClone(task.figures);(tampered[0] as any).answer='A';
  assert.throws(()=>validateFigureTask(task.task,tampered));
  const f={shape:'circle',inner:'triangle',outerFill:'empty',innerFill:'empty',lines:3,half:false} as const;
  assert.equal(visibleOptionKey({figure:f}),visibleOptionKey({figure:{...f,inner:'diamond'}}));
});
test('new diagrams render every given and unique SVG definitions; old questions remain valid',()=>{
  for(let seed=1;seed<=20;seed++){
    const q=generateQuestionByType('visual_analogy',seed,3),b=q.visualConfig as unknown as Board;
    const markup=renderToStaticMarkup(<><WorkshopBoard board={b}/>{q.options.map(o=><AnalogyFigure key={o.id} figure={(o.visualData as any).figure}/>)}</>);
    assert.equal((markup.match(/data-analogy-figure=/g)||[]).length,b.figures!.length+4);
    const ids=[...markup.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
    assert.doesNotMatch(markup,/correctOptionId|distractorNotes|undefined/);
    assert.equal(isQuestionReadyForStudents(legacy('visual_analogy',seed,3)),true);
    assert.equal(isQuestionReadyForStudents(legacy('cryptogram',seed,3)),true);
  }
});
