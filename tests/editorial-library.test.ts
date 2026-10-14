import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../src/features/questions/generators';
import { auditEditorialLibrary, indexQuestionVisuals, indexedDuplicates, matchesEditorialScope, hasIndividualReview, needsIndividualReview, nextPendingQuestion } from '../src/features/questions/editorial-library';
import { auditQuestion, questionVisualKey } from '../src/features/questions/quality';
const source=()=>generateQuestion({profile:'complete',type:'paper_folding',targetGrade:1,difficulty:2,seed:91231});
test('indexed duplicate checks preserve the full scan result across edits and answer ordering',()=>{
  const q=source(),duplicate={...structuredClone(q),id:'duplicate',seed:q.seed+1};duplicate.options.reverse();
  const unrelated=generateQuestion({profile:'complete',type:'raven_matrix',targetGrade:1,difficulty:2,seed:719});
  const library=[q,duplicate,unrelated],index=indexQuestionVisuals(library);
  const edited={...q,prompt:q.prompt+' Ek yönerge.'};
  assert.deepEqual(auditQuestion(edited,indexedDuplicates(edited,index)),auditQuestion(edited,library.filter(x=>x.id!==q.id)));
  assert.equal(index.get(questionVisualKey(q))?.length,2);
  assert.deepEqual(indexedDuplicates(unrelated,index),[]);
});
test('background audit yields before work and emits accurate partial counts for 8000 rows',async()=>{
  const q=source(),questions=Array.from({length:8000},(_,i)=>({...q,id:'q-'+i}));
  let yields=0,audits=0,last=0;
  const controller=new AbortController();const report=auditQuestion(q);
  const promise=auditEditorialLibrary(questions,{signal:controller.signal,batchSize:20,audit:()=>{audits++;return report;},yieldToUI:async()=>{yields++;await Promise.resolve();},onProgress:(reports,n)=>{assert.ok(n>last);assert.equal(reports.size,n);assert.equal(audits,n);last=n;}});
  assert.equal(audits,0);
  const results=await promise;assert.equal(last,8000);assert.equal(results?.size,8000);assert.equal(yields,400);
});
test('cancelled library runs cannot replace the next bank or finish a partial audit',async()=>{
  const q=source(),questions=Array.from({length:60},(_,i)=>({...q,id:String(i)})),controller=new AbortController();let audits=0,updates=0;
  const result=await auditEditorialLibrary(questions,{signal:controller.signal,audit:question=>{audits++;return auditQuestion(question);},yieldToUI:async()=>{},onProgress:(reports,n)=>{updates++;assert.equal(n,20);assert.equal(reports.size,20);controller.abort();}});
  assert.equal(result,undefined);assert.equal(audits,20);assert.equal(updates,1);
  const preAborted=new AbortController();preAborted.abort();await auditEditorialLibrary(questions,{signal:preAborted.signal,audit:()=>{throw Error('must not run');},yieldToUI:async()=>{},onProgress:()=>{throw Error('must not update');}});
});
test('background audit still rejects wrong keys rather than trusting publication status',async()=>{
  const q=source();q.status='published';q.correctOptionId=q.options.find(o=>o.id!==q.correctOptionId)!.id;
  const result=await auditEditorialLibrary([q],{signal:new AbortController().signal,yieldToUI:async()=>{},onProgress:()=>{}});
  assert.equal(result?.get(q.id)?.solverVerified,false);assert.ok(result!.get(q.id)!.errors.length>0);
});

test('review scope combines grade, topic and difficulty, including multi-grade records', () => {
  const q = source();
  const scope = { grade: 1 as const, type: 'paper_folding' as const, difficulty: 2 as const };
  assert.equal(matchesEditorialScope(q, scope), true);
  assert.equal(matchesEditorialScope({ ...q, targetGrade: 2, targetGrades: [2] }, scope), false);
  assert.equal(matchesEditorialScope({ ...q, type: 'mirror_reflection' }, scope), false);
  assert.equal(matchesEditorialScope({ ...q, difficulty: 1 }, scope), false);
  assert.equal(matchesEditorialScope({ ...q, targetGrade: 2, targetGrades: [1, 2] }, scope), true);
  assert.equal(matchesEditorialScope(q, { grade: 'all', type: 'all', difficulty: 'all' }), true);
});
test('review queues never infer human approval from automatic release or missing metadata', () => {
  const pending = { ...source(), status: 'published' as const };
  assert.equal(needsIndividualReview(pending), true);
  assert.equal(hasIndividualReview(pending), false);
  assert.equal(needsIndividualReview({ ...pending, status: 'draft' }), false);
  assert.equal(hasIndividualReview({ ...pending, reviewedBy: '  ' }), false);
  const reviewed = { ...pending, reviewedBy: 'educator' };
  assert.equal(hasIndividualReview(reviewed), true);
  assert.equal(needsIndividualReview(reviewed), false);
  const contradictory = { ...reviewed, releaseAuthorization: { individualHumanReview: false } } as typeof reviewed;
  assert.equal(needsIndividualReview(contradictory), true);
});
test('next review wraps inside the filtered list, skips completed records and preserves current question', () => {
  const a = { ...source(), id: 'a', status: 'published' as const };
  const b = { ...a, id: 'b', reviewedBy: 'educator' }, c = { ...a, id: 'c' };
  assert.equal(nextPendingQuestion([a, b, c], 'a')?.id, 'c');
  assert.equal(nextPendingQuestion([a, b, c], 'c')?.id, 'a');
  assert.equal(nextPendingQuestion([b, c], 'a')?.id, 'c');
  assert.equal(nextPendingQuestion([a, b], 'a'), undefined);
  assert.equal(nextPendingQuestion([], 'a'), undefined);
  assert.equal('reviewedBy' in a, false);
});
