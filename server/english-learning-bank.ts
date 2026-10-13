import {generateQuestion} from '../src/features/questions/generators';
import {ENGLISH_AREAS} from '../src/features/international/english-content';
import {englishPuzzle} from '../src/features/international/english-puzzles';
import {generateVisualFingerprint} from '../src/features/questions/fingerprint';
import {isQuestionReadyForStudents} from '../src/features/questions/quality';
import {EDUCATION_PROFILES,type SchoolGrade} from '../src/features/questions/quality-policy';
import type {BaseQuestion,DifficultyLevel} from '../src/types';
/** Private server bank. Only opaque, masked session DTOs are sent to the browser. */
export const ENGLISH_BANK_VERSION='thinkharbor-visual-1';
let cached:BaseQuestion[]|undefined;
export function englishLearningBank(){
 if(cached)return cached;
 const bank:BaseQuestion[]=[],seen=new Set<string>();
 for(const grade of [1,2,3,4] as const){
  const counts=new Map<string,number>();let accepted=0;
  for(let attempt=0;accepted<1000&&attempt<100000;attempt++){
   const types=ENGLISH_AREAS.filter(a=>a.id!=='shadow_matching'||(counts.get(a.id)||0)<8).sort((a,b)=>(counts.get(a.id)||0)-(counts.get(b.id)||0));
   // Round-robin among viable rules; finite curricula are redistributed without seed-only duplicates.
   const type=types[attempt%types.length].id;
   const difficulty=(1+(Math.floor(attempt/types.length)%EDUCATION_PROFILES[grade].maxDifficulty)) as DifficultyLevel;
   const seed=(170113+grade*10000019+attempt*104729)%2147483647||1;
   let q:BaseQuestion;
   try{q=generateQuestion({type,targetGrade:grade,difficulty,seed});}catch{continue;}
   const visual=generateVisualFingerprint({prompt:q.prompt,board:q.visualConfig});
   if(seen.has(visual)||!isQuestionReadyForStudents(q))continue;
   englishPuzzle(q,grade);seen.add(visual);
   bank.push({...q,id:`${ENGLISH_BANK_VERSION}-g${grade}-${String(++accepted).padStart(4,'0')}`,status:'published'});
   counts.set(type,(counts.get(type)||0)+1);
  }
  if(accepted!==1000)throw Error('The English visual bank could not be verified.');
 }
 cached=bank;return bank;
}
export function englishBankForGrade(grade:SchoolGrade){return englishLearningBank().filter(q=>q.targetGrade===grade);}
