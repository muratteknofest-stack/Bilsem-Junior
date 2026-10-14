import React,{useEffect,useRef,useState} from 'react';
import {authenticatedFetch} from '../../lib/api-client';
import {deletionResultSchema,deletionScopeSchema,type DeletionScope} from '../../lib/admin-response-schemas';
type Props={requestId:string;onCompleted:()=>Promise<void>};
// A different ticket must always start with a new preview and explicit approvals.
export function AccountDeletionAction(props:Props){return <DeletionAction key={props.requestId} {...props}/>;}
function DeletionAction({requestId,onCompleted}:Props){
 const [scope,setScope]=useState<DeletionScope|null>(null),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[retentionReviewed,setRetentionReviewed]=useState(false),[error,setError]=useState('');
 const active=useRef(true),inFlight=useRef(false),controller=useRef<AbortController|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;controller.current?.abort();};},[]);
 async function preview(){if(inFlight.current)return;inFlight.current=true;controller.current=new AbortController();setBusy(true);setScope(null);setError('');setConfirmed(false);setRetentionReviewed(false);try{
  const response=await authenticatedFetch(`/api/admin/support-requests/${requestId}/deletion`,{signal:controller.current.signal}),value=await response.json().catch(()=>null);
  if(!response.ok)throw Error(typeof value?.error==='string'?value.error:'Silme kapsamı yüklenemedi.');
  const parsed=deletionScopeSchema.safeParse(value);
  if(!parsed.success||parsed.data.requestId!==requestId)throw Error('Silme kapsamı doğrulanamadı. Yeniden kontrol edin.');
  if(active.current)setScope(parsed.data);
 }catch(e){if(active.current)setError(e instanceof Error?e.message:'Silme kapsamı yüklenemedi.');}finally{inFlight.current=false;if(active.current)setBusy(false);}}
 async function complete(){if(!scope||scope.status==='completed'||!confirmed||!retentionReviewed||inFlight.current)return;inFlight.current=true;controller.current=new AbortController();setBusy(true);setError('');try{
  const response=await authenticatedFetch(`/api/admin/support-requests/${requestId}/complete-deletion`,{method:'POST',signal:controller.current.signal,body:JSON.stringify({confirmed:true,retentionReviewed:true,members:scope.members})});
  // Even a successful HTTP response may have an invalid receipt. Recheck the server before retrying.
  if(response.ok&&active.current){setScope(null);setConfirmed(false);setRetentionReviewed(false);}
  const value=await response.json().catch(()=>null);
  if(!response.ok)throw Error(typeof value?.error==='string'?value.error:'Silme tamamlanamadı.');
  const result=deletionResultSchema.safeParse(value);
  if(!result.success||result.data.deletedAccounts!==scope.count)throw Error('Silme sonucu doğrulanamadı. İşlemi tekrarlamadan önce kapsamı yeniden kontrol edin.');
  if(!active.current)return;
  setScope({...scope,status:'completed',members:[]});setConfirmed(false);setRetentionReviewed(false);
  try{await onCompleted();}catch{if(active.current)setError('Silme tamamlandı, ancak bildirim listesi yenilenemedi. Listeyi yeniden yükleyin.');}
 }catch(e){if(active.current)setError(e instanceof Error?e.message:'Silme tamamlanamadı.');}finally{inFlight.current=false;if(active.current)setBusy(false);}}
 return <div className="space-y-3 rounded-xl border border-rose-800 p-4">
  <p className="text-sm text-rose-100">Kalıcı silme; veli ve doğrulanmış bağlı öğrenci hesaplarını, çalışma geçmişini ve uygulama verilerini kapsar. İşlemi yalnızca hesap sahibinin talebi ve saklama incelemesiyle tamamlayın.</p>
  <button type="button" disabled={busy} onClick={()=>void preview()} className="min-h-11 rounded-lg border border-slate-500 px-3 py-2 text-sm disabled:opacity-40">{busy?'İşleniyor…':'Silme kapsamını kontrol et'}</button>
  {error&&<p role="alert" className="text-sm text-rose-200">{error}</p>}
  {scope&&(scope.status==='completed'?<p role="status">Bu silme işlemi tamamlanmış.</p>:<>
   <p className="text-sm">Doğrulanan kapsam: <strong>{scope.count} hesap</strong>. {scope.status==='prepared'?'Önceki işlem yarıda kalmış; aynı kapsamla devam edilecek.':''}</p>
   <p className="text-xs text-slate-300">Ödeme veya yüklenmiş dosya kaydı varsa ayrı saklama/kaldırma incelemesi gerekir; bu işlem silmeyi başlatmaz. Yedeklerdeki veri için belgelenmiş saklama süresi uygulanmalıdır.</p>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={busy} checked={retentionReviewed} onChange={e=>setRetentionReviewed(e.target.checked)}/>Satıcı/veri sorumlusu olarak saklama ve silme kapsamını inceledim.</label>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{scope.count} hesabın ve bağlı uygulama verilerinin geri alınamayacak şekilde silinmesini onaylıyorum.</label>
   <button type="button" disabled={busy||!confirmed||!retentionReviewed} onClick={()=>void complete()} className="min-h-11 rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy?'Silme tamamlanıyor…':'Onaylanan hesapları kalıcı sil'}</button>
  </>)}
 </div>;
}
