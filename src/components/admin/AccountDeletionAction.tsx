import React,{useState} from 'react';
import {authenticatedFetch} from '../../lib/api-client';
interface Scope {requestId:string;status:string;members:string[];count:number;}
export function AccountDeletionAction({requestId,onCompleted}:{requestId:string;onCompleted:()=>Promise<void>}){
 const [scope,setScope]=useState<Scope|null>(null),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[retentionReviewed,setRetentionReviewed]=useState(false),[error,setError]=useState('');
 async function preview(){setBusy(true);setError('');setConfirmed(false);setRetentionReviewed(false);try{
  const response=await authenticatedFetch(`/api/admin/support-requests/${requestId}/deletion`),value=await response.json();
  if(!response.ok)throw Error(value.error||'Silme kapsamı yüklenemedi.');setScope(value);
 }catch(e){setError(e instanceof Error?e.message:'Silme kapsamı yüklenemedi.');}finally{setBusy(false);}}
 async function complete(){if(!scope||!confirmed||!retentionReviewed||busy)return;setBusy(true);setError('');try{
  const response=await authenticatedFetch(`/api/admin/support-requests/${requestId}/complete-deletion`,{method:'POST',body:JSON.stringify({confirmed:true,retentionReviewed:true,members:scope.members})}),value=await response.json();
  if(!response.ok)throw Error(value.error||'Silme tamamlanamadı.');await onCompleted();setScope(null);
 }catch(e){setError(e instanceof Error?e.message:'Silme tamamlanamadı.');}finally{setBusy(false);}}
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
