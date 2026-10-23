import { readFile, writeFile } from 'node:fs/promises';
import type { BaseQuestion, CognitiveCategory, QuestionType } from '../src/types';
import { selectLearningQuestions, generateVariedLearningQuestion, currentReasoningCandidate, recentQuestionExposure } from '../server/learning-question-selection';
import { reasoningDifficultyPlan } from '../src/features/questions/reasoning-profile';
import { scaffoldDifficultyPlan } from '../src/features/questions/test-assembly';
import { questionReasoningKey, questionStyleKey } from '../src/features/questions/reasoning-identity';
import { isQuestionReadyForStudents, questionStimulusKey, questionVisualKey } from '../src/features/questions/quality';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { englishBankForGrade } from '../server/english-learning-bank';
import { SeededRNG } from '../src/lib/rng';
import { generateDiverseQuestion } from '../src/features/questions/generators';

// Input is an owner-authorized bank snapshot; no database or account writes.
const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw Error('Usage: audit-session-diversity.ts bank.json report.json');
const bank = (JSON.parse(await readFile(source, 'utf8')) as {questions: BaseQuestion[]}).questions;
const failures: string[] = [], cases: Record<string, unknown>[] = [];
const ready = bank.filter(isQuestionReadyForStudents);
if (ready.length !== bank.length) failures.push(`Invalid bank questions: ${bank.length-ready.length}`);
for (const grade of [1,2,3,4] as const) {
  const approved = ready.filter(q=>q.targetGrade===grade);
  const modern = approved.filter(q=>currentReasoningCandidate(q,grade,true));
  const run = (mode: string, count: number, category: CognitiveCategory|'mixed', candidates: BaseQuestion[], topic?: QuestionType, session=0, history=new Map<string,number>()) => {
    const rng=new SeededRNG(grade*100003+count*997+session*1009+cases.length*37);
    const randomIndex=(max:number)=>rng.nextInt(0,max-1);
    const plan=topic || mode==='english' ? undefined : scaffoldDifficultyPlan(reasoningDifficultyPlan(grade,count,randomIndex));
    const canUse=(q:BaseQuestion)=>q.targetGrade===grade&&(!topic||q.type===topic)&&isQuestionReadyForStudents(q);
    const selected=selectLearningQuestions({count,category,candidates,exposure:history,canUse,randomIndex,
      difficultyPlan:plan,preferDiverseTypes:!topic,redistributeRepeatedCategories:!topic&&mode!=='english',
      allowGeneration:!topic&&mode!=='english',repeatPolicy:topic||mode==='english'?'oldest-first':'unseen',
      ...(mode==='english'?{categories:[...new Set(candidates.map(q=>q.category))]}:{}),
      generate:(area,typeCounts,difficulty,reasoningCounts)=>generateVariedLearningQuestion({grade,category:area,typeCounts,reasoningCounts,
        difficulty:difficulty!,seed:rng.nextInt(1,2147483646),randomIndex,exposure:history}),
    });
    const stimuli=selected.map(questionStimulusKey),visuals=selected.map(questionVisualKey),families=selected.map(questionReasoningKey),styles=selected.map(questionStyleKey);
    const maxStyle=Math.max(...styles.map(s=>styles.filter(x=>x===s).length));
    if((mode==='bank'||mode==='generated')&&(count<=30||grade>1)&&new Set(families).size!==count)
      failures.push(`${grade}/${mode}/${count}: repeated rule before curriculum exhaustion`);
    if((mode==='bank'||mode==='generated')&&count===20&&new Set(styles).size!==20)
      failures.push(`${grade}/${mode}/20: repeated exercise style`);
    if(selected.length!==count||new Set(stimuli).size!==count||new Set(visuals).size!==count)failures.push(`${grade}/${mode}/${category}/${count}: length or duplicate`);
    if(plan&&JSON.stringify(plan)!==JSON.stringify(selected.map(q=>q.difficulty)))failures.push(`${grade}/${mode}/${count}: difficulty blueprint`);
    if(category!=='mixed'&&selected.some(q=>q.category!==category))failures.push(`${grade}/${mode}: category escaped`);
    if(!topic&&mode!=='english'&&stimuli.some(k=>history.has(k)))failures.push(`${grade}/${mode}: history repeated`);
    cases.push({grade,mode,category,topic,count,session,types:new Set(selected.map(q=>q.type)).size,families:new Set(families).size,
      styles:new Set(styles).size,repeatedRules:count-new Set(families).size,maxStyle,adjacentStyles:styles.slice(1).filter((s,i)=>s===styles[i]).length});
    for(const [key,value] of recentQuestionExposure([{questions:selected,created_at:new Date(1792700000000+session*3600000).toISOString()}],true))history.set(key,value);
  };
  for(const mode of ['bank','generated'])for(const count of [5,15,20,30,45]) {
    const history=new Map<string,number>();
    for(let session=0;session<2;session++)run(mode,count,'mixed',mode==='bank'?modern:[],undefined,session,history);
  }
  for(const category of AVAILABLE_CATEGORIES)run('area',5,category,modern.filter(q=>q.category===category));
  for(const topic of [...new Set(approved.map(q=>q.type))]) {
    const candidates=approved.filter(q=>q.type===topic);
    run('topic',Math.min(15,new Set(candidates.map(questionStimulusKey)).size),candidates[0].category,candidates,topic);
  }
  const english=englishBankForGrade(grade);
  for(const count of [5,15,30,45])run('english',count,'mixed',english);
  for(const mode of ['demo','daily']) {
    const questions:BaseQuestion[]=[];
    for(let slot=0;slot<3;slot++)questions.push(generateDiverseQuestion({targetGrade:grade,difficulty:2,
      ...(mode==='daily'?{profile:'professional' as const}:{}),seed:grade*100003+slot*7919},questions));
    if(new Set(questions.map(questionStimulusKey)).size!==3||new Set(questions.map(questionStyleKey)).size!==3)
      failures.push(`${grade}/${mode}: repeated exercise`);
    cases.push({grade,mode,count:3,types:new Set(questions.map(q=>q.type)).size,families:new Set(questions.map(questionReasoningKey)).size,
      styles:new Set(questions.map(questionStyleKey)).size,repeatedRules:3-new Set(questions.map(questionReasoningKey)).size});
  }
}
const mixed=cases.filter(c=>c.mode==='bank'||c.mode==='generated');
const totals={sessions:cases.length,questions:cases.reduce((n,c)=>n+Number(c.count),0),mixedSessions:mixed.length,
  mixedRepeatedRules:mixed.reduce((n,c)=>n+Number(c.repeatedRules),0),mixedStyles:mixed.reduce((n,c)=>n+Number(c.styles),0),
  mixedAdjacentStyles:mixed.reduce((n,c)=>n+Number(c.adjacentStyles),0)};
await writeFile(destination,JSON.stringify({checkedAt:new Date().toISOString(),bankQuestions:bank.length,ready:ready.length,totals,failures,cases,
  scope:'Deterministic selection QA, using the same rule/style identities for the before and after measurements. Topic tests intentionally retain their chosen topic; limited curricula may repeat a rule after distinct eligible rules are exhausted.'},null,2)+'\n');
console.log(JSON.stringify({totals,failures}));
if(failures.length)process.exitCode=1;
