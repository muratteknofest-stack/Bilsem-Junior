import type {BaseQuestion} from '../../types';
import {questionStimulusKey,questionVisualKey,type QuestionVisualReference} from './quality';
import {questionReasoningKey,questionStyleKey} from './reasoning-identity';
export interface QuestionNovelty {stimulusKey:string;reasoningKey:string;duplicateIds:string[];relatedRuleCount:number;comparedQuestions:number}
export function inspectQuestionNovelty(question:QuestionVisualReference,existing:readonly QuestionVisualReference[]):QuestionNovelty {
 const stimulusKey=questionStimulusKey(question),visualKey=questionVisualKey(question),reasoningKey=questionReasoningKey(question),compared=existing.filter(q=>q.id!==question.id);
 return {stimulusKey,reasoningKey,comparedQuestions:compared.length,duplicateIds:compared.filter(q=>questionStimulusKey(q)===stimulusKey||questionVisualKey(q)===visualKey).map(q=>q.id),relatedRuleCount:compared.filter(q=>questionReasoningKey(q)===reasoningKey).length};
}
/** New seeds, changed distractors and reusing an ID cannot disguise repetition. */
export function chooseDiverseCandidate(candidates:readonly BaseQuestion[],existing:readonly QuestionVisualReference[]):BaseQuestion {
 const stimuli=new Set(existing.map(questionStimulusKey)),visuals=new Set(existing.map(questionVisualKey)),counts=new Map<string,number>();
 for(const q of existing)for(const key of [questionReasoningKey(q),questionStyleKey(q),q.type])counts.set(key,(counts.get(key)||0)+1);
 let selected:BaseQuestion|undefined,least:number[]|undefined;
 for(const q of candidates){
   if(stimuli.has(questionStimulusKey(q))||visuals.has(questionVisualKey(q)))continue;
   const rank=[counts.get(questionReasoningKey(q))||0,counts.get(questionStyleKey(q))||0,counts.get(q.type)||0];
   const index=least?rank.findIndex((value,i)=>value!==least![i]):-1;
   if(least&&(index<0||rank[index]>=least[index]))continue;
   selected=q;least=rank;
 }
 if(!selected)throw Error('NOVELTY_EXHAUSTED: Farklı ve doğrulanmış soru hazırlanamadı.');return selected;
}
