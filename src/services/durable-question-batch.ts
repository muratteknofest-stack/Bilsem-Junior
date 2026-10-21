import {z} from 'zod';import type {BaseQuestion} from '../types';import {authenticatedFetch} from '../lib/api-client';import {validateQuestion} from '../features/questions/validator';
const acknowledgement=z.object({questions:z.array(z.custom<BaseQuestion>(value=>{try{return validateQuestion(value as BaseQuestion).isValid;}catch{return false;}}))});
export function validateDraftAcknowledgement(value:unknown,requested:readonly BaseQuestion[]):BaseQuestion[]{const result=acknowledgement.parse(value),ids=new Set(requested.map(q=>q.id));if(result.questions.length!==requested.length||new Set(result.questions.map(q=>q.id)).size!==requested.length||result.questions.some(q=>!ids.has(q.id)||q.revision!==1||!['draft','review'].includes(q.status||'')))throw Error('Sunucu kayıt onayı taslaklarla eşleşmiyor.');return result.questions;}
export class BulkQuestionSaveError extends Error{constructor(public readonly savedCount:number,public readonly failedQuestions:BaseQuestion[]){super(`${savedCount} taslak kaydedildi; ${failedQuestions.length} taslak kaydedilemedi. Başarısız kayıtları yeniden deneyin.`);}}
export async function saveDraftChunk(questions:BaseQuestion[]):Promise<BaseQuestion[]>{for(let attempt=0;attempt<3;attempt++){
 let response:Response;
 try{response=await authenticatedFetch('/api/admin/questions/draft-batch',{method:'POST',body:JSON.stringify({questions})});}catch(error){if(attempt===2)throw error;await new Promise(r=>setTimeout(r,300*(attempt+1)));continue;}
 if(!response.ok){if(attempt<2&&(response.status===429||response.status>=500)){await new Promise(r=>setTimeout(r,300*(attempt+1)));continue;}throw Error(`Taslak kaydedilemedi (${response.status}).`);}
 return validateDraftAcknowledgement(await response.json(),questions);
}throw Error('Taslak paketi kaydedilemedi.');}
