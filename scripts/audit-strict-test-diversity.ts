import {readFile,writeFile} from 'node:fs/promises';
import type {BaseQuestion,CognitiveCategory,QuestionType} from '../src/types';
import {selectLearningQuestions,generateVariedLearningQuestion,currentReasoningCandidate,recentQuestionExposure} from '../server/learning-question-selection';
import {reasoningDifficultyPlan} from '../src/features/questions/reasoning-profile';
import {scaffoldDifficultyPlan} from '../src/features/questions/test-assembly';
import {questionReasoningKey,questionStyleKey} from '../src/features/questions/reasoning-identity';
import {QuestionDiversityError} from '../src/features/questions/test-diversity';
import {isQuestionReadyForStudents,questionStimulusKey,questionVisualKey} from '../src/features/questions/quality';
import {generateDiverseQuestion} from '../src/features/questions/generators';
import {selectPublishedPool} from '../src/features/questions/editorial-data';
import {AVAILABLE_CATEGORIES} from '../src/features/student/available-categories';
import {englishBankForGrade} from '../server/english-learning-bank';
import {SeededRNG} from '../src/lib/rng';

const [source,destination]=process.argv.slice(2);
if(!source||!destination)throw Error('Usage: audit-strict-test-diversity.ts bank.json report.json');
const bank=(JSON.parse(await readFile(source,'utf8')) as {questions:BaseQuestion[]}).questions;
const failures:string[]=[],cases:Array<(string|number)[]>=[];
const ready=bank.filter(isQuestionReadyForStudents);
if(ready.length!==bank.length)failures.push(`Invalid bank questions: ${bank.length-ready.length}`);
let accepted=0,blocked=0,checkedQuestions=0,adventures=0,duplicateStyles=0,duplicateRules=0;
for(const grade of [1,2,3,4] as const) {
  const approved=ready.filter(q=>q.targetGrade===grade),modern=approved.filter(q=>currentReasoningCandidate(q,grade,true));
  const run=(mode:string,count:number,category:CognitiveCategory|'mixed',candidates:BaseQuestion[],topic?:QuestionType,session=0,history=new Map<string,number>())=>{
    const rng=new SeededRNG(grade*100003+count*997+session*1009+cases.length*37),randomIndex=(max:number)=>rng.nextInt(0,max-1);
    const plan=topic||mode==='english'?undefined:scaffoldDifficultyPlan(reasoningDifficultyPlan(grade,count,randomIndex));
    const snapshot=JSON.stringify(candidates);
    try {
      const selected=selectLearningQuestions({count,category,candidates,exposure:history,difficultyPlan:plan,randomIndex,
        requireDistinctStyles:true,redistributeRepeatedCategories:category==='mixed',allowGeneration:!topic&&mode!=='english',
        repeatPolicy:topic||mode==='english'?'oldest-first':'unseen',
        ...(mode==='english'?{categories:[...new Set(candidates.map(q=>q.category))]}:{}),
        canUse:q=>q.targetGrade===grade&&(!topic||q.type===topic)&&isQuestionReadyForStudents(q),
        generate:(area,typeCounts,difficulty,reasoningCounts)=>generateVariedLearningQuestion({grade,category:area,typeCounts,reasoningCounts,
          difficulty:difficulty!,seed:rng.nextInt(1,2147483646),randomIndex,exposure:history}),
      });
      const rules=new Set(selected.map(questionReasoningKey)).size,styles=new Set(selected.map(questionStyleKey)).size;
      duplicateRules+=count-rules;duplicateStyles+=count-styles;
      if(selected.length!==count||rules!==count||styles!==count||new Set(selected.map(questionStimulusKey)).size!==count||new Set(selected.map(questionVisualKey)).size!==count)
        failures.push(`${grade}/${mode}/${category}/${count}: duplicate or length mismatch`);
      if(plan&&JSON.stringify(plan)!==JSON.stringify(selected.map(q=>q.difficulty)))failures.push(`${grade}/${mode}/${count}: difficulty plan`);
      if(category!=='mixed'&&selected.some(q=>q.category!==category))failures.push(`${grade}/${mode}: category escaped`);
      if(!topic&&mode!=='english'&&selected.some(q=>history.has(questionStimulusKey(q))))failures.push(`${grade}/${mode}: exact history repeated`);
      accepted++;checkedQuestions+=selected.length;
      if((mode==='bank'||mode==='generated')&&count===20)adventures++;
      cases.push([grade,mode,category,topic||'mixed',count,session,'accepted',selected.length,rules,styles]);
      for(const [key,value] of recentQuestionExposure([{questions:selected,created_at:new Date(1792700000000+session*3600000).toISOString()}],true))history.set(key,value);
    } catch(error) {
      if(!(error instanceof QuestionDiversityError))throw error;
      blocked++;
      if(error.requestedCount!==count||error.preparedCount<0||error.preparedCount>=count)failures.push('Invalid shortage metadata');
      if((mode==='bank'||mode==='generated')&&count<=20||mode==='english'&&count===5||topic&&count===1)
        failures.push(`${grade}/${mode}/${category}/${count}: required short/adventure/topic session unavailable`);
      cases.push([grade,mode,category,topic||'mixed',count,session,'blocked',error.preparedCount,0,0]);
    }
    if(JSON.stringify(candidates)!==snapshot)failures.push(`${grade}/${mode}: bank mutated`);
  };
  for(const mode of ['bank','generated'])for(const count of [5,15,20,30,45]) {
    const history=new Map<string,number>();
    for(let session=0;session<2;session++)run(mode,count,'mixed',mode==='bank'?modern:[],undefined,session,history);
  }
  for(const category of AVAILABLE_CATEGORIES)run('area',5,category,modern.filter(q=>q.category===category));
  for(const topic of [...new Set(approved.map(q=>q.type))]) {
    const candidates=approved.filter(q=>q.type===topic);
    run('topic',1,candidates[0].category,candidates,topic);
    run('topic',15,candidates[0].category,candidates,topic);
  }
  const english=englishBankForGrade(grade),englishHistory=new Map<string,number>();
  for(const count of [5,15,30,45])run('english',count,'mixed',english,undefined,0,englishHistory);
  // A repeat across days is allowed in a finite curriculum, never inside a test.
  run('english',5,'mixed',english,undefined,1,englishHistory);
  for(const mode of ['demo','daily']) {
    const questions:BaseQuestion[]=[];
    for(let slot=0;slot<3;slot++)questions.push(generateDiverseQuestion({targetGrade:grade,difficulty:2,
      ...(mode==='daily'?{profile:'professional' as const}:{}),seed:grade*100003+slot*7919},questions,true));
    const selected=mode==='demo'?selectPublishedPool(questions,[]):questions;
    const rules=new Set(selected.map(questionReasoningKey)).size,styles=new Set(selected.map(questionStyleKey)).size;
    if(rules!==3||styles!==3)failures.push(`${grade}/${mode}: duplicate`);
    accepted++;checkedQuestions+=3;cases.push([grade,mode,'mixed','mixed',3,0,'accepted',3,rules,styles]);
  }
}
if(adventures!==16)failures.push('All sixteen twenty-question adventure scenarios must complete');
const report={checkedAt:new Date().toISOString(),policy:'distinct-styles-3',bankQuestions:bank.length,ready:ready.length,
  totals:{requests:cases.length,accepted,blocked,checkedQuestions,adventures,duplicateStyles,duplicateRules},failures,
  columns:['grade','mode','category','topic','requestedCount','session','outcome','preparedCount','rules','styles'],cases,
  scope:'Every successful test has the requested length and unique rule/style keys. Shortage is an explicit refusal, not a partial test or fallback to similar questions. Bank snapshot QA only; no live account/database writes.'};
await writeFile(destination,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({totals:report.totals,failures}));
if(failures.length)process.exitCode=1;
