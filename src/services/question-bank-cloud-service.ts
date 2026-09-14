import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import type { BaseQuestion } from '../types';
import { auth, db } from '../lib/firebase';
import { questionBankService } from './question-bank-service';
import { questionContentKey } from '../features/questions/quality';
import { validateQuestion } from '../features/questions/validator';

const questionsRef = collection(db, 'questions');
const stateRef = doc(questionsRef, '__question_bank_state__');
const clean = <T,>(value:T):T => JSON.parse(JSON.stringify(value));
const markInitialized = () => setDoc(stateRef, {status:'system',initialized:true,updatedAt:Date.now()});
function publishedRecord(question:BaseQuestion) {
  const user=auth.currentUser;
  if(!user) throw new Error('Soru havuzunu değiştirmek için giriş yapmalısınız.');
  const result=validateQuestion(question);
  if(!result.isValid) throw new Error(result.errors.map(e=>e.message).join(' '));
  return clean({...question,status:'published',contentKey:questionContentKey(question),updatedAt:Date.now(),updatedBy:user.uid});
}
export async function publishQuestions(questions:BaseQuestion[]):Promise<number> {
  if(!questions.length)return 0;
  let count=0;
  for(let offset=0;offset<questions.length;offset+=400) {
    const batch=writeBatch(db);
    for(const q of questions.slice(offset,offset+400)){batch.set(doc(questionsRef,q.id),publishedRecord(q));count++;}
    await batch.commit();
  }
  await markInitialized();
  return count;
}
export async function publishQuestion(question:BaseQuestion):Promise<void> {
  await setDoc(doc(questionsRef,question.id),publishedRecord(question));
  await markInitialized();
}
export async function removePublishedQuestion(id:string):Promise<void> { await deleteDoc(doc(questionsRef,id)); }
export async function replacePublishedPool(questions:BaseQuestion[]):Promise<number> {
  const existing=await getDocs(query(questionsRef,where('status','==','published')));
  const desired=new Set(questions.map(q=>q.id));
  let batch=writeBatch(db),operations=0;
  const flush=async()=>{if(operations){await batch.commit();batch=writeBatch(db);operations=0;}};
  for(const snapshot of existing.docs){if(!desired.has(snapshot.id)){batch.delete(snapshot.ref);operations++;if(operations===400)await flush();}}
  for(const q of questions){batch.set(doc(questionsRef,q.id),publishedRecord(q));operations++;if(operations===400)await flush();}
  await flush(); await markInitialized(); return questions.length;
}
function validSnapshot(documents:{id:string;data:()=>any}[]):BaseQuestion[] {
  const seen=new Set<string>(),result:BaseQuestion[]=[];
  for(const snapshot of documents){const raw=snapshot.data(),q={...raw,id:snapshot.id} as BaseQuestion;const key=questionContentKey(q);if(validateQuestion(q).isValid&&!seen.has(key)){seen.add(key);result.push(q);}}
  return result;
}
let unsubscribe:Unsubscribe|null=null;
export function stopQuestionBankSync(){unsubscribe?.();unsubscribe=null;}
export async function startQuestionBankSync(isAdmin:boolean):Promise<Unsubscribe> {
  stopQuestionBankSync();
  const source=query(questionsRef,where('status','==','published'));
  const initial=await getDocs(source);
  let questions=validSnapshot(initial.docs);
  if(isAdmin){
    const state=await getDoc(stateRef);
    if(!state.exists()){
      if(questions.length===0&&questionBankService.getAll().length===0) questionBankService.resetToDefaults();
      const additions=questions.length===0?questionBankService.getAll().filter(q=>validateQuestion(q).isValid):[];
      if(additions.length){await publishQuestions(additions);questions=validSnapshot([...initial.docs,...additions.map(q=>({id:q.id,data:()=>q}))]);}
      else await markInitialized();
    }
  }
  questionBankService.replaceFromCloud(questions);
  unsubscribe=onSnapshot(source,snapshot=>questionBankService.replaceFromCloud(validSnapshot(snapshot.docs)),error=>questionBankService.reportCloudError(error));
  return stopQuestionBankSync;
}
