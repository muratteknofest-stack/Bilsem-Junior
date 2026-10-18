import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_CHAPTERS, STORY_STAGES, advanceStory, emptyStoryProgress, parseStoryProgress, stageStatus, storyStorageKey } from '../src/features/student/story-adventure';
import type { LearningSessionView } from '../src/features/student/learning-contract';
import { generateQuestion } from '../src/features/questions/generators';
import { selectAdaptiveCategory } from '../src/features/student/learning-selection';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { answerLearningSession, finishLearningSession, learningView, prepareLearningQuestions, type LearningSession } from '../server/learning-model';
const question=generateQuestion({type:'visual_sequence',targetGrade:2,difficulty:1,seed:1234});
const session:LearningSessionView={id:'acknowledged-session',mode:'adaptive',title:'Story',expiresAt:'2030-01-01',questions:[question,question,question],answers:{'0':{response:{mode:'choice',optionId:question.correctOptionId}},'1':{response:{mode:'choice',optionId:question.correctOptionId}},'2':{response:{mode:'choice',optionId:question.correctOptionId}}},result:{totalQuestions:3,correctAnswers:3,wrongAnswers:0,blankAnswers:0,scorePercentage:100,xp:42,totalTimeSeconds:60}};
test('story advances only the current stop after a complete acknowledged session of the correct grade and category',()=>{
 const empty=emptyStoryProgress();const next=advanceStory(empty,STORY_STAGES[0].id,session,2);
 assert.equal(next.completed.length,1);assert.equal(stageStatus(next,0),'complete');assert.equal(stageStatus(next,1),'current');assert.equal(stageStatus(next,2),'locked');
 for(const invalid of [{...session,result:null},{...session,result:{...session.result!,blankAnswers:1}},{...session,answers:{}},{...session,mode:'practice' as const},{...session,questions:session.questions.map(q=>({...q,category:'attention' as const}))}])assert.strictEqual(advanceStory(empty,STORY_STAGES[0].id,invalid,2),empty);
 assert.strictEqual(advanceStory(empty,STORY_STAGES[1].id,session,2),empty);
 assert.strictEqual(advanceStory(empty,STORY_STAGES[0].id,session,3),empty);
 assert.strictEqual(advanceStory(next,STORY_STAGES[0].id,session,2),next);
 assert.strictEqual(advanceStory({...next,sessions:[session.id]},STORY_STAGES[1].id,session,2).completed,next.completed);
 // Effort completes the story stop; scoring and XP remain the learning server's responsibility.
 assert.equal(advanceStory(empty,STORY_STAGES[0].id,{...session,result:{...session.result!,correctAnswers:0,wrongAnswers:3}},2).completed.length,1);
});
test('story storage isolates accounts and grades and rejects gaps or malformed records',()=>{
 assert.notEqual(storyStorageKey('one',1),storyStorageKey('two',1));assert.notEqual(storyStorageKey('one',1),storyStorageKey('one',2));
 for(const raw of ['broken','null','{}','{"version":1,"completed":[],"sessions":null}'])assert.deepEqual(parseStoryProgress(raw),emptyStoryProgress());
 assert.equal(parseStoryProgress(JSON.stringify({version:1,completed:[STORY_STAGES[1].id],sessions:[]})).completed.length,0);
 const valid=advanceStory(emptyStoryProgress(),STORY_STAGES[0].id,session,2);assert.deepEqual(parseStoryProgress(JSON.stringify(valid)),valid);
 assert.equal(STORY_CHAPTERS.length,6);assert.equal(STORY_STAGES.length,18);assert.equal(new Set(STORY_STAGES.map(s=>s.id)).size,18);
});

test('all 18 story stops unlock across every grade with the server category policy and acknowledged answers',()=>{
 const masteries=AVAILABLE_CATEGORIES.map(category=>({category,mastery:category==='numerical'?0:100}));
 assert.equal(selectAdaptiveCategory('mixed',masteries),'numerical');
 for(const grade of [1,2,3,4] as const){
  let progress=emptyStoryProgress();
  for(const [index,stage] of STORY_STAGES.entries()){
   const category=selectAdaptiveCategory(stage.category,masteries);
   if(stage.category!=='mixed')assert.equal(category,stage.category);
   const questions=Array.from({length:3},(_,i)=>generateQuestion({profile:'professional',category,targetGrade:grade,difficulty:1,seed:grade*100000+index*997+i*37+1}));
   const now=Date.now();
   let saved:LearningSession={id:crypto.randomUUID(),student_id:'story-student',mode:'adaptive',title:stage.title,questions:prepareLearningQuestions(questions),answers:{},created_at:new Date(now).toISOString(),expires_at:new Date(now+3600000).toISOString(),finished_at:null,result:null,revision:0,rewarded_xp:0};
   for(let i=0;i<3;i++)saved=answerLearningSession(saved,i,{mode:'choice',optionId:saved.questions[i].correctOptionId},now+1000+i);
   assert.strictEqual(advanceStory(progress,stage.id,learningView(saved),grade),progress,'Unfinished work must not unlock a stop');
   saved=finishLearningSession(saved,now+4000);
   progress=advanceStory(progress,stage.id,learningView(saved),grade);
   assert.equal(progress.completed.length,index+1,`${grade}. grade / ${stage.id}`);
   assert.deepEqual(parseStoryProgress(JSON.stringify(progress)),progress);
  }
 }
});
