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

test('four age groups each have four distinct complete story arcs with 48 sequential missions',async()=>{
 const {STORY_CAMPAIGNS,campaignsForGrade,campaignLength}=await import('../src/features/student/story-catalog');
 const {campaignStageAt}=await import('../src/features/student/story-adventure');
 assert.equal(STORY_CAMPAIGNS.length,16);
 assert.equal(new Set(STORY_CAMPAIGNS.map(s=>s.id)).size,16);
 const openings=new Set<string>(),ids=new Set<string>();
 for(const grade of [1,2,3,4]) {
  const stories=campaignsForGrade(grade);assert.equal(stories.length,4);
  for(const story of stories) {
   assert.equal(story.chapters.length,8);assert.equal(campaignLength(story),48);assert.ok(story.premise.length>90);assert.ok(story.ending.length>70);
   for(const chapter of story.chapters){assert.ok(chapter.opening.length>65);assert.ok(chapter.discovery.length>40);assert.ok(!openings.has(chapter.opening));openings.add(chapter.opening);}
   for(let i=0;i<48;i++){const stage=campaignStageAt(story.id,i);assert.equal(stage.chapter,Math.floor(i/6));assert.ok(stage.narrative!.startsWith(story.chapters[stage.chapter].opening));assert.ok(!ids.has(stage.id));ids.add(stage.id);}
   for(const i of [-1,48,NaN,1.5])assert.throws(()=>campaignStageAt(story.id,i));
  }
 }
 assert.equal(ids.size,768);assert.equal(openings.size,128);assert.equal(campaignsForGrade(5).length,0);
});

test('campaign rewards, story skills, replay and persistence remain isolated and idempotent',async()=>{
 const {campaignStageAt,campaignCompleted,storyCollection,storyBadges,nextCampaignStage,storyPracticeLevel}=await import('../src/features/student/story-adventure');
 const {campaignsForGrade}=await import('../src/features/student/story-catalog');
 const [story,other]=campaignsForGrade(2);
 let progress=emptyStoryProgress();
 const first=campaignStageAt(story.id,0);
 assert.strictEqual(advanceStory(progress,campaignStageAt(story.id,1).id,session,2),progress);
 assert.strictEqual(advanceStory(progress,first.id,session,1),progress);
 assert.strictEqual(advanceStory(progress,first.id,{...session,result:null},2),progress);
 for(let i=0;i<48;i++) {
  const stage=campaignStageAt(story.id,i),saved={...session,id:`campaign-${i}`};
  const before=storyCollection(progress,2).points;
  const next=advanceStory(progress,stage.id,saved,2);
  assert.equal(campaignCompleted(next,story.id),i+1);
  assert.equal(storyCollection(next,2).points-before,20+(i%6===5?60:0)+(i===47?240:0));
  assert.equal(isStoryStageComplete(next,stage),true);
  assert.strictEqual(advanceStory(next,stage.id,saved,2),next);
  assert.deepEqual(parseStoryProgress(JSON.stringify(next)),next);progress=next;
 }
 assert.equal(progress.completedCount,0);assert.equal(campaignCompleted(progress,other.id),0);
 assert.equal(Object.values(progress.skillPractice!).reduce((sum,n)=>sum+n,0),144);
 assert.equal(storyCollection(progress,2).points,1680);assert.equal(storyCollection(progress,2).finished.length,1);
 assert.equal(storyBadges(progress,2).filter(b=>b.unlocked).length,5);assert.equal(nextCampaignStage(progress,story.id),undefined);
 const otherFirst=campaignStageAt(other.id,0);
 assert.strictEqual(advanceStory(progress,otherFirst.id,{...session,id:'campaign-47'},2),progress);
 progress=advanceStory(progress,otherFirst.id,{...session,id:'new-story'},2);
 assert.equal(campaignCompleted(progress,other.id),1);assert.equal(campaignCompleted(progress,story.id),48);
 assert.equal(storyCollection(progress,3).points,0);
 assert.equal(storyPracticeLevel(0).level,0);assert.equal(storyPracticeLevel(12).level,2);assert.equal(storyPracticeLevel(120).next,null);
 const old=parseStoryProgress(JSON.stringify({version:2,completedCount:999,sessions:[]}));
 const migrated=advanceStory(old,first.id,session,2);assert.equal(migrated.completedCount,999);assert.equal(campaignCompleted(migrated,story.id),1);
 const bad=parseStoryProgress(JSON.stringify({...migrated,campaigns:{[story.id]:49,[other.id]:-1,unknown:100},skillPractice:{pattern:Infinity,logic:-1,unknown:999},selectedStoryId:'unknown'}));
 assert.deepEqual(bad.campaigns,{});assert.deepEqual(bad.skillPractice,{});assert.equal(bad.selectedStoryId,undefined);
 assert.ok(JSON.stringify(progress).length<4000);
});

test('real acknowledged sessions advance across every chapter and finale for each age group',async()=>{
 const {campaignStageAt,campaignCompleted,storyCollection}=await import('../src/features/student/story-adventure');
 const {campaignsForGrade}=await import('../src/features/student/story-catalog');
 for(const grade of [1,2,3,4] as const) {
  const story=campaignsForGrade(grade)[0];let progress=emptyStoryProgress(),seed=grade*1000000;
  for(let index=0;index<48;index++) {
   const stage=campaignStageAt(story.id,index);
   const questions=selectLearningQuestions({count:3,category:'mixed',candidates:[],exposure:new Map(),canUse:isQuestionReadyForStudents,generate:category=>generateQuestion({profile:'professional',category,targetGrade:grade,difficulty:1,seed:++seed})});
   const now=Date.now();let saved:LearningSession={id:crypto.randomUUID(),student_id:'story-student',mode:'adaptive',title:stage.title,questions:prepareLearningQuestions(questions),answers:{},created_at:new Date(now).toISOString(),expires_at:new Date(now+3600000).toISOString(),finished_at:null,result:null,revision:0,rewarded_xp:0};
   for(let i=0;i<3;i++)saved=answerLearningSession(saved,i,{mode:'choice',optionId:saved.questions[i].correctOptionId},now+1000+i);
   assert.strictEqual(advanceStory(progress,stage.id,learningView(saved),grade),progress);
   saved=finishLearningSession(saved,now+4000);progress=advanceStory(progress,stage.id,learningView(saved),grade);
   assert.equal(campaignCompleted(progress,story.id),index+1);
  }
  assert.equal(storyCollection(progress,grade).finished.length,1);
 }
});
