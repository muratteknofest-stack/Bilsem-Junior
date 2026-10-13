import {z} from 'zod';
import {ENGLISH_AREAS} from './english-content';
export const ENGLISH_PROGRESS_KEY='zekapark-english-progress-v1';
const area=z.enum(ENGLISH_AREAS.map(a=>a.id));
const answer=z.object({id:z.string().max(160),area,correct:z.boolean(),answered:z.boolean()}).strict().refine(a=>!a.correct||a.answered);
const summary=z.object({id:z.string().max(100),date:z.string().datetime(),level:z.number().int().min(1).max(4),mode:z.enum(['practice','challenge']),answers:z.array(answer).min(1).max(10),seconds:z.number().int().min(0).max(86400)}).strict();
const schema=z.object({version:z.literal(1),sessions:z.array(summary).max(30)}).strict();
export type EnglishSummary=z.infer<typeof summary>;
export type EnglishProgress=z.infer<typeof schema>;
export const emptyEnglishProgress=():EnglishProgress=>({version:1,sessions:[]});
export function parseEnglishProgress(value:string|null):EnglishProgress {
  if(!value||value.length>100000)return emptyEnglishProgress();try{const result=schema.safeParse(JSON.parse(value));return result.success?result.data:emptyEnglishProgress();}catch{return emptyEnglishProgress();}
}
export function recordEnglishSession(progress:EnglishProgress,value:EnglishSummary):EnglishProgress{
  const safe=summary.parse(value);
  if(progress.sessions.some(s=>s.id===safe.id))return progress;
  return {version:1,sessions:[safe,...progress.sessions].slice(0,30)};
}
export function englishProgressStats(progress:EnglishProgress){
  const answers=progress.sessions.flatMap(s=>s.answers),attempts=answers.filter(a=>a.answered).length,correct=answers.filter(a=>a.correct).length;
  return {sessions:progress.sessions.length,attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):null,
    areas:ENGLISH_AREAS.map(a=>{const values=answers.filter(v=>v.area===a.id&&v.answered);return {...a,attempts:values.length,correct:values.filter(v=>v.correct).length};})};
}
