import type { DifficultyLevel, QuestionType } from '../../types';
import { STUDENT_TYPES } from './professional-engine';
import { topicAllowedForGrade } from './topic-catalog';
import type { SchoolGrade } from './quality-policy';

// Direct lookup exercises remain in the workshop, outside the reasoning bank.
const DIRECT_LOOKUP_TYPES: QuestionType[] = ['odd_one_out','classification','logical_sequence','verbal_analogy','shadow_matching','spatial_relationship','detail_detection','balance_scale','gear_rotation','tangram_puzzle'];
export function professionalGradeTypes(grade: SchoolGrade) { return STUDENT_TYPES.filter(t=>topicAllowedForGrade(t,grade)&&!DIRECT_LOOKUP_TYPES.includes(t)); }
const LEVEL_WEIGHTS: Record<SchoolGrade, number[]> = {1:[25,75],2:[15,35,50],3:[10,20,35,35],4:[5,10,15,20,25,25]};
export function professionalDifficulty(grade:SchoolGrade,index:number):DifficultyLevel {
  const slot=(index*37)%100;let cumulative=0;
  for(const [i,w] of LEVEL_WEIGHTS[grade].entries()){cumulative+=w;if(slot<cumulative)return (i+1) as DifficultyLevel;}
  throw Error('Invalid difficulty distribution');
}
