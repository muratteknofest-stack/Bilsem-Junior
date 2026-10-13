import {authenticatedFetch} from '../../lib/api-client';
import {historySchema} from './english-account-model';
export {englishAccountError} from './english-account-model';
export type {HistoryItem} from './english-account-model';
export async function accountHistory(studentId?:string,signal?:AbortSignal){
 const response=await authenticatedFetch(studentId?`/api/parent/learning-history/${encodeURIComponent(studentId)}`:'/api/learning/history',{signal,cache:'no-store'});
 if(!response.ok)throw Error('Progress could not load. Please try again.');
 return historySchema.parse(await response.json()).sessions;
}
