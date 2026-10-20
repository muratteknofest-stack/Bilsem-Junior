import type { DifficultyLevel, QuestionType } from '../../types';
import { STUDENT_TYPES } from './professional-engine';
import { topicAllowedForGrade } from './topic-catalog';
import type { SchoolGrade } from './quality-policy';

// Direct lookup exercises remain in the workshop, outside the reasoning bank.
const DIRECT_LOOKUP_TYPES: QuestionType[] = ['odd_one_out','classification','logical_sequence','verbal_analogy','detail_detection','balance_scale','gear_rotation','tangram_puzzle'];
export function professionalGradeTypes(grade: SchoolGrade) { return STUDENT_TYPES.filter(t=>topicAllowedForGrade(t,grade)&&!DIRECT_LOOKUP_TYPES.includes(t)); }
const LEVEL_WEIGHTS: Record<SchoolGrade, number[]> = {1:[20,80],2:[0,30,70],3:[0,0,40,60],4:[0,0,0,20,35,45]};
/** Exact quotas keep a mixed session from accidentally drawing mostly easy questions. */
export function reasoningDifficultyPlan(grade:SchoolGrade,count:number,randomIndex:(max:number)=>number):DifficultyLevel[] {
  if(!Number.isInteger(count)||count<1||count>50)throw Error('Geçersiz çalışma uzunluğu.');
  const weights=LEVEL_WEIGHTS[grade],quotas=weights.map(w=>Math.floor(w*count/100));
  const priority=weights.map((w,i)=>({i,remainder:w*count/100-quotas[i],weight:w})).sort((a,b)=>b.remainder-a.remainder||b.weight-a.weight);
  for(let n=quotas.reduce((a,v)=>a+v,0),i=0;n<count;n++,i++)quotas[priority[i].i]++;
  const plan=quotas.flatMap((n,i)=>Array<DifficultyLevel>(n).fill((i+1) as DifficultyLevel));
  for(let i=plan.length-1;i>0;i--){const j=randomIndex(i+1);[plan[i],plan[j]]=[plan[j],plan[i]];}
  return plan;
}
export function professionalDifficulty(grade:SchoolGrade,index:number):DifficultyLevel {
  const slot=(index*37)%100;let cumulative=0;
  for(const [i,w] of LEVEL_WEIGHTS[grade].entries()){cumulative+=w;if(slot<cumulative)return (i+1) as DifficultyLevel;}
  throw Error('Invalid difficulty distribution');
}

