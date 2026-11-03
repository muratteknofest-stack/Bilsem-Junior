import type { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../src/types';
import { PRECISION_TYPES, generatePrecisionQuestion, precisionAllowed } from '../src/features/questions/precision-lab';
import { EDUCATION_PROFILES, type SchoolGrade } from '../src/features/questions/quality-policy';
import { isQuestionReadyForStudents, questionStimulusKey } from '../src/features/questions/quality';
import { TOPIC_CATEGORY, topicAllowedForGrade } from '../src/features/questions/topic-catalog';

/** Finite per-request refresh, using the same delivery proof as stored questions.
 * No table rewrite: previously assigned sessions keep their exact snapshots. */
export function createPrecisionLearningPool(options:{grade:SchoolGrade;difficulty:DifficultyLevel|'mixed';category:CognitiveCategory|'mixed';topic:QuestionType|'mixed';count:number;seed:number}):BaseQuestion[]{
  if(!Number.isInteger(options.count)||options.count<1||options.count>50)throw Error('INVALID_PRECISION_POOL_COUNT');
  const types=PRECISION_TYPES.filter(t=>(options.topic==='mixed'||t===options.topic)&&(options.category==='mixed'||TOPIC_CATEGORY[t]===options.category)&&topicAllowedForGrade(t,options.grade));
  const levels:DifficultyLevel[]=options.difficulty==='mixed'?Array.from({length:EDUCATION_PROFILES[options.grade].maxDifficulty},(_,i)=>(i+1) as DifficultyLevel):[options.difficulty];
  const perLevel=options.topic==='mixed'?2:Math.ceil(options.count/levels.length)+1,questions:BaseQuestion[]=[],seen=new Set<string>();
  for(const [index,type] of types.entries())for(const level of levels)if(precisionAllowed(type,options.grade,level)){
    let accepted=0;for(let attempt=0;attempt<perLevel*4&&accepted<perLevel;attempt++){
      const seed=(options.seed+index*1000003+level*104729+attempt*10007)%2147483647||1;
      try{const q=generatePrecisionQuestion(type,seed,level,options.grade),key=questionStimulusKey(q);if(seen.has(key)||!isQuestionReadyForStudents(q))continue;seen.add(key);questions.push(q);accepted++;}catch{/* Failed or ambiguous candidates do not enter the pool. */}
    }
  }
  return questions;
}
