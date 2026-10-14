import {z} from 'zod';
import {getServiceClient} from './supabase-admin';

const ids=z.array(z.uuid()).min(1).max(21).refine(v=>new Set(v).size===v.length);
export const deletionConfirmation=z.object({confirmed:z.literal(true),retentionReviewed:z.literal(true),members:ids}).strict();
export class DeletionError extends Error {constructor(message:string,public status=409){super(message);}}
export interface DeletionJob {request_id:string;member_ids:string[];member_count:number;status:'prepared'|'completed';}
interface FamilyProfile {id:string;role:string;linked_parent_id:string|null;linked_student_ids:string[];}
export function deletionMembers(owner:FamilyProfile,children:FamilyProfile[]){
 if(!['parent','student'].includes(owner.role)||owner.linked_parent_id)throw new DeletionError('Silme talebini aile hesabının velisi oluşturmalıdır.');
 const childIds=children.map(c=>c.id).sort();
 if(owner.role==='student'&&(children.length||owner.linked_student_ids.length))throw new DeletionError('Hesap bağlantıları doğrulanamadı.');
 if(owner.role==='parent'&&(JSON.stringify([...owner.linked_student_ids].sort())!==JSON.stringify(childIds)||children.some(c=>c.role!=='student'||c.linked_parent_id!==owner.id||c.linked_student_ids.length)))throw new DeletionError('Aile bağlantıları değişmiş; silme kapsamını yeniden kontrol edin.');
 return ids.parse([owner.id,...childIds].sort());
}
function rpcFailure(error:{code?:string;message?:string}){
 if(error.code==='P0001')return new DeletionError('Ödeme kaydı veya yüklenmiş dosya bulunuyor. Bu verilerin saklama ve kaldırma incelemesi ayrı tamamlanmalı.');
 if(error.code==='40001')return new DeletionError('Silme kapsamı değişti veya işlem henüz tamamlanmadı. Kapsamı yeniden yükleyip tekrar deneyin.');
 if(error.code==='42501')return new DeletionError('Hesap silme yetkisi doğrulanamadı.',403);
 return new DeletionError('Silme işlemi doğrulanamadı. İşlem tamamlandı olarak işaretlenmedi.',503);
}
export async function deletionPreview(requestId:string){
 const client=getServiceClient();
 const {data:ticket,error}=await client.from('support_requests').select('id,actor_id,kind,status').eq('id',requestId).maybeSingle();
 if(error)throw new DeletionError('Talep yüklenemedi.',503);
 if(!ticket||ticket.kind!=='deletion')throw new DeletionError('Silme talebi bulunamadı.',404);
 const job=await client.from('account_deletion_jobs').select('request_id,member_ids,member_count,status').eq('request_id',requestId).maybeSingle();
 if(job.error)throw new DeletionError('Silme durumu yüklenemedi.',503);
 if(job.data)return {requestId,status:job.data.status,members:job.data.member_ids,count:job.data.member_count};
 if(!ticket.actor_id||!['open','reviewing'].includes(ticket.status))throw new DeletionError('Talep silme işlemine uygun değil.');
 const owner=await client.from('profiles').select('id,role,linked_parent_id,linked_student_ids').eq('id',ticket.actor_id).maybeSingle();
 if(owner.error||!owner.data)throw new DeletionError('Hesap sahibi doğrulanamadı.');
 const children=await client.from('profiles').select('id,role,linked_parent_id,linked_student_ids').eq('linked_parent_id',owner.data.id);
 if(children.error)throw new DeletionError('Aile kapsamı doğrulanamadı.',503);
 const members=deletionMembers(owner.data,children.data||[]);
 return {requestId,status:'pending',members,count:members.length};
}
export interface DeletionOperations {
 prepare():Promise<DeletionJob>;removeUser(id:string):Promise<void>;finish():Promise<DeletionJob>;
}
export async function completeDeletion(operations:DeletionOperations){
 const job=await operations.prepare();
 if(job.status==='completed')return {completed:true,deletedAccounts:job.member_count};
 const members=ids.parse(job.member_ids);
 if(members.length!==job.member_count)throw new DeletionError('Silme kapsamı doğrulanamadı.',503);
 for(const id of members)await operations.removeUser(id);
 const result=await operations.finish();
 if(result.status!=='completed'||result.member_ids.length)throw new DeletionError('Silme işlemi tamamlanamadı.',503);
 return {completed:true,deletedAccounts:result.member_count};
}
export async function executeDeletion(requestId:string,adminId:string,expectedMembers:string[]){
 const client=getServiceClient();
 return completeDeletion({
  async prepare(){const r=await client.rpc('prepare_account_deletion',{p_request:requestId,p_admin:adminId,p_expected_members:expectedMembers});if(r.error)throw rpcFailure(r.error);return r.data;},
  async removeUser(id){
   const found=await client.auth.admin.getUserById(id);
   if(found.error){if(found.error.status===404&&found.error.code==='user_not_found')return;throw new DeletionError('Hesap silme servisine ulaşılamadı. Aynı talep güvenle tekrar denenebilir.',503);}
   if(!found.data.user||found.data.user.id!==id)throw new DeletionError('Hesap kimliği doğrulanamadı.',503);
   const removed=await client.auth.admin.deleteUser(id);
   if(removed.error&&!(removed.error.status===404&&removed.error.code==='user_not_found'))throw new DeletionError('Hesap silinemedi. Aynı talep güvenle tekrar denenebilir.',503);
  },
  async finish(){const r=await client.rpc('finish_account_deletion',{p_request:requestId,p_admin:adminId});if(r.error)throw rpcFailure(r.error);return r.data;}
 });
}
