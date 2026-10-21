import type {DifficultyLevel} from '../../types';
import {gradeDifficulty,type SchoolGrade} from './quality-policy';
export interface AnswerEvidence {grade:SchoolGrade;difficulty:DifficultyLevel;correct:boolean}
export interface DifficultyRecommendation {adjustment:-1|0|1;sampleSize:number;accuracy:number|null;reason:'insufficient-history'|'more-support'|'ready-for-challenge'|'steady'}
/** Product heuristic, bounded by grade. Newest answers first. */
export function recommendDifficulty(grade:SchoolGrade,evidence:readonly AnswerEvidence[]):DifficultyRecommendation {
 const recent=evidence.filter(a=>a.grade===grade&&typeof a.correct==='boolean'&&Number.isInteger(a.difficulty)&&a.difficulty>=1&&a.difficulty<=6).slice(0,20);
 if(recent.length<8)return {adjustment:0,sampleSize:recent.length,accuracy:null,reason:'insufficient-history'};
 const accuracy=recent.filter(a=>a.correct).length/recent.length;
 return {adjustment:accuracy<.45?-1:accuracy>=.85?1:0,sampleSize:recent.length,accuracy,reason:accuracy<.45?'more-support':accuracy>=.85?'ready-for-challenge':'steady'};
}
export function adaptDifficultyPlan(grade:SchoolGrade,plan:readonly DifficultyLevel[],recommendation:DifficultyRecommendation):DifficultyLevel[]{return plan.map(level=>gradeDifficulty(grade,level+recommendation.adjustment));}
