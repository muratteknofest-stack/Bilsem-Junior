import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {ShopierPackageCards} from '../../src/components/ShopierPackageCards';
import {ShopierActivationForm} from '../../src/components/ShopierActivationForm';
import {SHOPIER_PLANS} from '../../src/lib/shopier-config';
const query=new URLSearchParams(location.search),ready=query.has('ready');
const plans=SHOPIER_PLANS.map((p,i)=>({...p,url:ready?`https://www.shopier.com/${i+1}`:null}));
function BillingPreview(){
  const [orderId,setOrderId]=useState(''),[submitted,setSubmitted]=useState(false);
  return <details open className="zp-billing"><summary><span className="zp-billing-summary-icon" aria-hidden="true">✦</span><span>Shopier paketleri ve erişim<small>Yeni keşiflere yer açın</small></span></summary><div className="zp-billing-content"><p className="zp-billing-status">Örnek öğrenci için paket seçimi</p><ShopierPackageCards plans={plans} ready={ready}/>{ready&&<ShopierActivationForm orderId={orderId} busy={false} onChange={setOrderId} onSubmit={event=>{event.preventDefault();setSubmitted(true);}}/>}{submitted&&<p role="status">Örnek form gönderildi.</p>}</div></details>;
}
createRoot(document.getElementById('root')!).render(<main className="p-4 max-w-6xl mx-auto">{query.has('billing')?<BillingPreview/>:<><h1 className="text-2xl font-bold mb-4">Shopier paketleri</h1><ShopierPackageCards plans={plans} ready={ready}/></>}</main>);
