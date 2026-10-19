import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_CHAPTERS, STORY_STAGES, storyStageAt, advanceStory, emptyStoryProgress, parseStoryProgress, stageStatus, storyStorageKey, isStoryStageComplete } from '../src/features/student/story-adventure';
import type { LearningSessionView } from '../src/features/student/learning-contract';
import { generateQuestion } from '../src/features/questions/generators';
import { selectSessionCategory, learningStartSchema, sameLearningSelection, type LearningSelection } from '../src/features/student/learning-selection';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { selectLearningQuestions } from '../server/learning-question-selection';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';
import { answerLearningSession, finishLearningSession, learningView, prepareLearningQuestions, type LearningSession } from '../server/learning-model';
const questions=['visual_sequence','number_pattern','mirror_reflection'].map((type,i)=>generateQuestion({type:type as 'visual_sequence'|'number_pattern'|'mirror_reflection',targetGrade:2,difficulty:1,seed:1234+i*997}));
const session:LearningSessionView={id:'acknowledged-session',mode:'adaptive',title:'Story',expiresAt:'2030-01-01',questions,answers:Object.fromEntries(questions.map((q,i)=>[String(i),{response:{mode:'choice',optionId:q.correctOptionId}}])),result:{totalQuestions:3,correctAnswers:3,wrongAnswers:0,blankAnswers:0,scorePercentage:100,xp:42,totalTimeSeconds:60}};
test('story advances only the current stop after a complete acknowledged mixed session of the correct grade',()=>{
 const empty=emptyStoryProgress(),next=advanceStory(empty,STORY_STAGES[0].id,session,2);
 assert.equal(next.completedCount,1);assert.equal(stageStatus(next,0),'complete');assert.equal(stageStatus(next,1),'current');assert.equal(stageStatus(next,2),'locked');
 for(const invalid of [{...session,result:null},{...session,result:{...session.result!,blankAnswers:1}},{...session,answers:{}},{...session,mode:'practice' as const},{...session,questions:session.questions.map(q=>({...q,category:'attention' as const}))}])assert.strictEqual(advanceStory(empty,STORY_STAGES[0].id,invalid,2),empty);
 assert.strictEqual(advanceStory(empty,STORY_STAGES[1].id,session,2),empty);
 assert.strictEqual(advanceStory(empty,STORY_STAGES[0].id,session,3),empty);
 assert.strictEqual(advanceStory(next,STORY_STAGES[0].id,session,2),next);
 assert.strictEqual(advanceStory(next,STORY_STAGES[1].id,session,2),next);
 assert.equal(advanceStory(empty,STORY_STAGES[0].id,{...session,result:{...session.result!,correctAnswers:0,wrongAnswers:3}},2).completedCount,1);
 assert.equal(isStoryStageComplete(next,storyStageAt(0)),true);assert.equal(isStoryStageComplete(next,storyStageAt(1)),false);
});
test('legacy progress migrates without losing stops; storage remains bounded and isolates accounts and grades',()=>{
 assert.notEqual(storyStorageKey('one',1),storyStorageKey('two',1));assert.notEqual(storyStorageKey('one',1),storyStorageKey('one',2));
 for(const raw of ['broken','null','{}','{"version":1,"completed":[],"sessions":null}','{"version":2,"completedCount":-1,"sessions":[]}','{"version":2,"completedCount":1.1,"sessions":[]}'])assert.deepEqual(parseStoryProgress(raw),emptyStoryProgress());
 assert.equal(parseStoryProgress(JSON.stringify({version:1,completed:[STORY_STAGES[1].id],sessions:[]})).completedCount,0);
 for(const count of [0,1,17,18])assert.equal(parseStoryProgress(JSON.stringify({version:1,completed:STORY_STAGES.slice(0,count).map(s=>s.id),sessions:['old-session']})).completedCount,count);
 const valid=advanceStory(emptyStoryProgress(),STORY_STAGES[0].id,session,2);assert.deepEqual(parseStoryProgress(JSON.stringify(valid)),valid);
 assert.equal(STORY_CHAPTERS.length,6);assert.equal(STORY_STAGES.length,18);
 let progress=emptyStoryProgress();for(let i=0;i<1000;i++)progress=advanceStory(progress,storyStageAt(i).id,{...session,id:`session-${i}`},2);
 assert.equal(progress.completedCount,1000);assert.equal(progress.sessions.length,64);assert.ok(JSON.stringify(progress).length<2000);assert.deepEqual(parseStoryProgress(JSON.stringify(progress)),progress);
 for(const index of [17,18,35,36,999,1_000_000]){assert.equal(storyStageAt(index).index,index);assert.equal(storyStageAt(index).category,'mixed');assert.notEqual(storyStageAt(index).id,storyStageAt(index+1).id);}
 assert.equal(storyStageAt(18).round,2);assert.equal(storyStageAt(36).round,3);
});
test('mixed adventure selection retains distinct areas while ordinary adaptive selection stays targeted',()=>{
 const masteries=AVAILABLE_CATEGORIES.map(category=>({category,mastery:category==='numerical'?0:100}));
 assert.equal(selectSessionCategory('mixed',masteries),'numerical');assert.equal(selectSessionCategory('mixed',masteries,true),'mixed');assert.equal(selectSessionCategory('pattern',masteries,true),'pattern');
 assert.equal(learningStartSchema.safeParse({mode:'adaptive',category:'mixed',mixCategories:true}).success,true);
 for(const body of [{mode:'practice'},{mode:'exam'},{mode:'adaptive',category:'pattern'},{mode:'adaptive',topic:'paper_folding'},{mode:'adaptive',locale:'en'}])assert.equal(learningStartSchema.safeParse({...body,mixCategories:true}).success,false);
 const selection:LearningSelection={grade:2,difficulty:'mixed',category:'mixed',count:3,exam:'',bankVersion:'test',mixCategories:true};assert.equal(sameLearningSelection({...selection,mixCategories:false},selection),false);
});
test('two full tours and the next tour unlock for every grade using real balanced, proved questions',()=>{
 for(const grade of [1,2,3,4] as const){
  let progress=emptyStoryProgress(),seed=grade*100000;
  for(let index=0;index<37;index++){
   const stage=storyStageAt(index);
   const questions=selectLearningQuestions({count:3,category:'mixed',candidates:[],exposure:new Map(),canUse:isQuestionReadyForStudents,generate:category=>generateQuestion({profile:'professional',category,targetGrade:grade,difficulty:1,seed:++seed})});
   assert.equal(new Set(questions.map(q=>q.category)).size,3);
   const now=Date.now();let saved:LearningSession={id:crypto.randomUUID(),student_id:'story-student',mode:'adaptive',title:stage.title,questions:prepareLearningQuestions(questions),answers:{},created_at:new Date(now).toISOString(),expires_at:new Date(now+3600000).toISOString(),finished_at:null,result:null,revision:0,rewarded_xp:0};
   for(let i=0;i<3;i++)saved=answerLearningSession(saved,i,{mode:'choice',optionId:saved.questions[i].correctOptionId},now+1000+i);
   assert.strictEqual(advanceStory(progress,stage.id,learningView(saved),grade),progress);
   saved=finishLearningSession(saved,now+4000);progress=advanceStory(progress,stage.id,learningView(saved),grade);
   assert.equal(progress.completedCount,index+1);assert.deepEqual(parseStoryProgress(JSON.stringify(progress)),progress);
  }
 }
});
