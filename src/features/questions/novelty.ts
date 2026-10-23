import type {BaseQuestion} from '../../types';
import {questionStimulusKey,questionVisualKey,type QuestionVisualReference} from './quality';
import {questionReasoningKey} from './reasoning-identity';
export interface QuestionNovelty {stimulusKey:string;reasoningKey:string;duplicateIds:string[];relatedRuleCount:number;comparedQuestions:number}
export function inspectQuestionNovelty(question:QuestionVisualReference,existing:readonly QuestionVisualReference[]):QuestionNovelty {
 const stimulusKey=questionStimulusKey(question),visualKey=questionVisualKey(question),reasoningKey=questionReasoningKey(question),compared=existing.filter(q=>q.id!==question.id);
 return {stimulusKey,reasoningKey,comparedQuestions:compared.length,duplicateIds:compared.filter(q=>questionStimulusKey(q)===stimulusKey||questionVisualKey(q)===visualKey).map(q=>q.id),relatedRuleCount:compared.filter(q=>questionReasoningKey(q)===reasoningKey).length};
}
/** New seeds, changed distractors and reusing an ID cannot disguise repetition. */
export function chooseDiverseCandidate(candidates:readonly BaseQuestion[],existing:readonly QuestionVisualReference[]):BaseQuestion {
 const stimuli=new Set(existing.map(questionStimulusKey)),visuals=new Set(existing.map(questionVisualKey)),counts=new Map<string,number>();
 for(const q of existing){const key=questionReasoningKey(q);counts.set(key,(counts.get(key)||0)+1);}
 let selected:BaseQuestion|undefined,least=Infinity;
 for(const q of candidates){const count=counts.get(questionReasoningKey(q))||0;if(stimuli.has(questionStimulusKey(q))||visuals.has(questionVisualKey(q))||count>=least)continue;selected=q;least=count;}
 if(!selected)throw Error('NOVELTY_EXHAUSTED: Farklı ve doğrulanmış soru hazırlanamadı.');return selected;
}
