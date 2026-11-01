import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {LESSON_CATALOG} from '../src/features/lessons/catalog';
import {lessonDocument} from '../server/lesson-content';
import {STEPS_PER_LESSON,buildVoiceKit,estimatedSeconds,kitMarkdown,voiceKitHash} from '../scripts/voice-recording-kit.mjs';
import {currentLessonVersions,summarizeReview,summarizeVoice} from '../scripts/content-coverage.mjs';
import {checkEducatorReview,checkVoiceCoverage,checkVoiceKit} from '../scripts/release-closure.mjs';

const kit=()=>JSON.parse(readFileSync(resolve('content/voice/recording-kit.json'),'utf8'));
const versions=currentLessonVersions();

function allRecordings(){
  return Object.entries(versions).flatMap(([lesson_id,lesson_version])=>
    Array.from({length:STEPS_PER_LESSON},(_,step)=>({lesson_id,lesson_version,step,human_recording:true,object_path:`${lesson_id}/v${lesson_version}/${step}.wav`})));
}

test('the recording kit covers every current lesson step with the exact narration',()=>{
  const fresh=buildVoiceKit();
  assert.equal(fresh.format,'bilsem-voice-recording-kit-v1');
  assert.equal(fresh.lessons.length,LESSON_CATALOG.length);
  assert.equal(fresh.totals.lessons,LESSON_CATALOG.length);
  assert.equal(fresh.totals.steps,LESSON_CATALOG.length*STEPS_PER_LESSON);
  assert.equal(fresh.totals.steps,72);
  const files=new Set<string>();
  for(const lesson of fresh.lessons){
    const document=lessonDocument(lesson.id);
    assert.ok(document,lesson.id);
    assert.equal(lesson.version,document!.version);
    assert.equal(lesson.steps.length,STEPS_PER_LESSON);
    lesson.steps.forEach((step:any,index:number)=>{
      assert.equal(step.step,index);
      assert.equal(step.text,document!.steps[index].narration,`${lesson.id}:${index}`);
      assert.equal(step.characters,step.text.length);
      assert.equal(step.estimatedSeconds,estimatedSeconds(step.text));
      assert.match(step.file,new RegExp(`^${lesson.id}-v${document!.version}-${index}\\.wav$`));
      assert.ok(!files.has(step.file),`Duplicate file name ${step.file}`);
      files.add(step.file);
    });
  }
  assert.equal(files.size,72);
  assert.ok(fresh.totals.estimatedMinutes>=8&&fresh.totals.estimatedMinutes<=20);
});

test('the committed kit is not stale against the lesson content',()=>{
  const committed=kit();
  assert.equal(committed.format,'bilsem-voice-recording-kit-v1');
  assert.equal(committed.contentHash,voiceKitHash(buildVoiceKit()));
  assert.equal(checkVoiceKit(committed).ok,true);
  const markdown=kitMarkdown(buildVoiceKit());
  for(const lesson of committed.lessons.slice(0,3)){
    assert.ok(markdown.includes(lesson.title),lesson.title);
    assert.ok(markdown.includes(lesson.steps[0].file));
    assert.ok(markdown.includes(lesson.steps[0].text.slice(0,40)));
  }
  assert.match(markdown,/gerçek insan kaydı/i);
  assert.match(markdown,/haklar/i);
});

test('voice coverage counts only current-version, human, complete steps',()=>{
  const now=new Date('2026-11-01T12:00:00Z');
  const complete=summarizeVoice(allRecordings(),{now,versions});
  assert.equal(complete.expectedSteps,72);
  assert.equal(complete.humanRecordedSteps,72);
  assert.deepEqual(complete.missingSteps,[]);
  assert.equal(complete.personalDataIncluded,false);
  assert.equal(checkVoiceCoverage(complete,{now:now.getTime()}).ok,true);

  const partial=summarizeVoice(allRecordings().slice(0,70),{now,versions});
  assert.equal(partial.humanRecordedSteps,70);
  assert.equal(partial.missingSteps.length,2);
  assert.equal(partial.lessonsWithoutAnyRecording.length,0);

  const wrongVersion=summarizeVoice(allRecordings().map((row:any)=>({...row,lesson_version:99})),{now,versions});
  assert.equal(wrongVersion.humanRecordedSteps,0);
  assert.equal(wrongVersion.missingSteps.length,72);

  const withoutOne=allRecordings().filter((row:any)=>!(row.lesson_id==='visual_sequence'&&row.step===3));
  const synthetic=summarizeVoice([
    ...withoutOne,
    {lesson_id:'visual_sequence',lesson_version:1,step:3,human_recording:false,object_path:'x'},
  ],{now,versions});
  assert.equal(synthetic.humanRecordedSteps,71);
  assert.ok(synthetic.missingSteps.includes('visual_sequence:3'));
});

test('voice coverage ignores unknown lessons, bad steps and missing objects',()=>{
  const now=new Date('2026-11-01T12:00:00Z');
  const report=summarizeVoice([
    {lesson_id:'not_a_lesson',lesson_version:1,step:0,human_recording:true,object_path:'x'},
    {lesson_id:'visual_sequence',lesson_version:1,step:9,human_recording:true,object_path:'x'},
    {lesson_id:'visual_sequence',lesson_version:1,step:0,human_recording:true,object_path:''},
    {lesson_id:'visual_sequence',lesson_version:1,step:1,human_recording:'true',object_path:'x'},
  ],{now,versions});
  assert.equal(report.humanRecordedSteps,0);
});

test('educator review coverage requires a real reviewer and no explicit machine-only flag',()=>{
  const now=new Date('2026-11-01T12:00:00Z');
  const rows=[
    {status:'published',reviewedBy:'admin-1',humanReview:'true'},
    {status:'published',reviewedBy:'admin-2',humanReview:null},
    {status:'published',reviewedBy:'',humanReview:'true'},
    {status:'published',reviewedBy:'admin-3',humanReview:'false'},
    {status:'archived',reviewedBy:'admin-1',humanReview:'true'},
  ];
  const report=summarizeReview(rows,{now});
  assert.equal(report.published.total,4);
  assert.equal(report.published.individuallyReviewed,2);
  assert.equal(report.published.missing,2);
  assert.equal(report.format,'bilsem-educator-review-v1');
  assert.equal(checkEducatorReview(report,{now:now.getTime()}).ok,false);
  const complete=summarizeReview([{status:'published',reviewedBy:'admin-1',humanReview:'true'}],{now});
  assert.equal(checkEducatorReview(complete,{now:now.getTime()}).ok,true);
});
