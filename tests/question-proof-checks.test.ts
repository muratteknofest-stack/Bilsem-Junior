import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesVisibleMosaic,checkArithmeticExplanations} from '../scripts/question-proof-checks';
import {generateColorfulQuestion} from '../src/features/questions/colorful-engine';

test('missing-tile proof uses visible rows rather than the stored answer colour',()=>{
 for(const difficulty of [1,2,3,4,5,6] as const){
  const q=generateColorfulQuestion('figure_completion',113,difficulty),b=q.visualConfig as any,answer=q.options.find(o=>o.id===q.correctOptionId)!.visualData as any;
  b.source.cells[b.missing]=(answer.color+1)%6;
  assert.equal(matchesVisibleMosaic(q,answer),true);
  assert.equal(q.options.filter(o=>matchesVisibleMosaic(q,o.visualData as any)).length,1);
 }
});
test('visible-row conflicts cannot be certified as an inferable missing tile',()=>{
 const q=generateColorfulQuestion('figure_completion',113,1),b=q.visualConfig as any;
 for(let i=0;i<b.source.cells.length;i++)if(i!==b.missing&&i%2!==b.missing%2)b.source.cells[i]=i;
 assert.equal(q.options.some(o=>matchesVisibleMosaic(q,o.visualData as any)),false);
});
test('explanation arithmetic uses precedence, negative terms and every equality on a line',()=>{
 const result=checkArithmeticExplanations({explanation:{ruleTitle:'test',summary:'12 − 3 × 2 = 6.',steps:['1 + 2 = 3; 3 + 4 = 7.','4 + -2 × 3 = -2.']}});
 assert.equal(result.checked.length,4);assert.deepEqual(result.errors,[]);
 const wrong=checkArithmeticExplanations({explanation:{ruleTitle:'test',summary:'12 − 3 × 2 = 18.',steps:['1 + 2 = 4.']}});
 assert.equal(wrong.errors.length,2);
});
