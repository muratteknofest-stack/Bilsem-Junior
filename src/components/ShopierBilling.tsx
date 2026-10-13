import React,{useEffect,useRef,useState} from 'react';
import { authenticatedFetch } from '../lib/api-client';
import { auth } from '../lib/supabase';
import { withRequestDeadline } from '../lib/request-deadline';
import { ShopierPackageCards } from './ShopierPackageCards';
type View={ready:boolean;enforced:boolean;plans:Array<{id:string;title:string;days:number;amountKurus:number;url:string|null}>;access:{active:boolean;expiresAt:string|null}};
async function request(path:string,body?:unknown) {
  return withRequestDeadline(async signal=>{const r=await authenticatedFetch(path,{signal,...(body?{method:'POST',body:JSON.stringify(body)}:{})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||'Paket bilgileri yüklenemedi.');return data;});
}
export function ShopierBilling({studentId}:{studentId:string}) {
  const [view,setView]=useState<View|null>(null),[error,setError]=useState(''),[orderId,setOrderId]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
  const epoch=useRef(0);
  useEffect(()=>{const version=++epoch.current,owner=auth.currentUser?.uid;setView(null);setError('');setOrderId('');setBusy(false);
    request('/api/parent/shopier/access?studentId='+encodeURIComponent(studentId)).then(value=>{if(epoch.current===version&&auth.currentUser?.uid===owner)setView(value);})
      .catch(cause=>{if(epoch.current===version&&auth.currentUser?.uid===owner)setError(cause instanceof Error?cause.message:'Paket yüklenemedi.');});
    return()=>{epoch.current++;};
  },[studentId,reload]);
  async function claim(e:React.FormEvent){e.preventDefault();if(busy||!view?.ready)return;const version=epoch.current,owner=auth.currentUser?.uid;setBusy(true);setError('');
    try {const result=await request('/api/parent/shopier/claim',{orderId:orderId.trim(),studentId});if(epoch.current===version&&auth.currentUser?.uid===owner)setView(v=>v&&({...v,access:result.access}));}
    catch(cause){if(epoch.current===version&&auth.currentUser?.uid===owner)setError(cause instanceof Error?cause.message:'Sipariş doğrulanamadı.');}
    finally{if(epoch.current===version)setBusy(false);}
  }
  return <details className="rounded-2xl border bg-white p-4 my-4"><summary className="min-h-11 cursor-pointer font-bold">Shopier paketleri ve erişim</summary>
    <div className="space-y-3 mt-3"><a href="/paketler" className="underline">Paketler ve kullanım koşulları</a>
    {error&&<><p role="alert" className="text-rose-700">{error}</p>{!view&&<button type="button" onClick={()=>setReload(v=>v+1)} className="min-h-11 underline">Tekrar dene</button>}</>}
    {!view&&!error&&<p role="status">Paketler yükleniyor…</p>}
    {view&&<><p role="status">{view.access.active?`Bu öğrencinin paket erişimi ${new Date(view.access.expiresAt!).toLocaleDateString('tr-TR')} tarihine kadar aktif.`:view.enforced?'Aktif paket bulunamadı.':'Ücretli erişim zorunluluğu kapalı; mevcut ücretsiz kullanım devam ediyor.'}</p>
      <ShopierPackageCards plans={view.plans} ready={view.ready}/>
      {view.ready?<><p>Shopier’de veli hesabındaki e-postayla tek paket satın al. Sipariş numaranı aşağıda doğrulayınca erişim bu öğrenciye tanımlanır. Aynı sipariş başka öğrenciye aktarılamaz. Yeni paket süresi kalan erişimin sonuna eklenir; iade edilen siparişler sayılmaz.</p>
        <form onSubmit={claim} className="flex flex-wrap gap-3 items-end"><label>Shopier sipariş numarası<input required maxLength={80} autoComplete="off" value={orderId} onChange={e=>setOrderId(e.target.value)} disabled={busy} className="block min-h-11 rounded-lg border p-3"/></label><button type="submit" disabled={busy||!orderId.trim()} className="min-h-11 rounded-lg bg-indigo-700 px-4 text-white">{busy?'Doğrulanıyor…':'Siparişi doğrula ve erişimi aç'}</button></form>
      </>:<p>Ücretli satış henüz açılmadı. Buradaki fiyatlar planlanan lansman fiyatlarıdır.</p>}
    </>}
    </div></details>;
}
