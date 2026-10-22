import React,{useEffect,useRef,useState} from 'react';
import { authenticatedFetch } from '../lib/api-client';
import { auth } from '../lib/supabase';
import { withRequestDeadline } from '../lib/request-deadline';
import { ShopierPackageCards } from './ShopierPackageCards';
import { ShopierActivationForm } from './ShopierActivationForm';
import './shopier-billing.css';
type View={ready:boolean;enforced:boolean;plans:Array<{id:string;title:string;days:number;amountKurus:number;url:string|null}>;access:{active:boolean;expiresAt:string|null}};
async function request(path:string,body?:unknown) {
  return withRequestDeadline(async signal=>{const r=await authenticatedFetch(path,{signal,...(body?{method:'POST',body:JSON.stringify(body)}:{})});
    const data=await r.json();if(!r.ok)throw new Error(typeof data.error==='string'?data.error:'Paket bilgileri yüklenemedi.');return data;});
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
  return <details className="zp-billing"><summary><span className="zp-billing-summary-icon" aria-hidden="true">✦</span><span>Shopier paketleri ve erişim<small>Yeni keşiflere yer açın</small></span><span className="zp-billing-chevron" aria-hidden="true">⌄</span></summary>
    <div className="zp-billing-content"><a href="/bilgi/kullanim-kosullari" className="zp-sales-text-link">Kullanım koşulları</a>
    {error&&<><p role="alert" className="text-rose-700">{error}</p>{!view&&<button type="button" onClick={()=>setReload(v=>v+1)} className="min-h-11 underline">Tekrar dene</button>}</>}
    {!view&&!error&&<p role="status">Paketler yükleniyor…</p>}
    {view&&<><p role="status" className="zp-billing-status">{view.access.active?`Bu öğrencinin paket erişimi ${new Date(view.access.expiresAt!).toLocaleDateString('tr-TR')} tarihine kadar aktif.`:view.enforced?'Aktif paket bulunamadı.':'Ücretli erişim zorunluluğu kapalı; mevcut ücretsiz kullanım devam ediyor.'}</p>
      <ShopierPackageCards plans={view.plans} ready={view.ready}/>
      {view.ready?<><p className="zp-billing-instructions">Shopier’de veli hesabındaki e-postayla tek paket satın al. Sipariş numaranı aşağıda doğrulayınca erişim bu öğrenciye tanımlanır. Aynı sipariş başka öğrenciye aktarılamaz. Yeni paket süresi kalan erişimin sonuna eklenir; iade edilen siparişler sayılmaz.</p>
        <ShopierActivationForm orderId={orderId} busy={busy} onChange={setOrderId} onSubmit={claim}/>
      </>:<p className="zp-sales-notice">Ücretli satış henüz açılmadı. Buradaki fiyatlar planlanan lansman fiyatlarıdır.</p>}
    </>}
    </div></details>;
}

