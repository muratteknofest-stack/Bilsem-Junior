import { withRequestDeadline } from '../src/lib/request-deadline';
import { ShopierError, moneyKurus } from './shopier-model';
import { SHOPIER_PLANS, shopierProduct, shopierConfigured, safeShopierUrl, type ShopierSettings } from '../src/lib/shopier-config';
export function shopierReady(s:ShopierSettings) { return s.enabled && shopierConfigured(s) && !!process.env.SHOPIER_ACCESS_TOKEN; }
export async function shopierGet(resource:'orders'|'products',id:string,fetcher:typeof fetch=fetch,token=process.env.SHOPIER_ACCESS_TOKEN,parentSignal?:AbortSignal) {
  if(!token)throw new ShopierError('Shopier satış hesabı henüz bağlanmadı.',503);
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw new ShopierError('Sipariş veya ürün numarası geçersiz.');
  try { return await withRequestDeadline(async signal=>{
    const r=await fetcher(`https://api.shopier.com/v1/${resource}/${encodeURIComponent(id)}`,{
      headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},redirect:'error',signal:parentSignal ? AbortSignal.any([signal,parentSignal]) : signal});
    if(!r.ok) {await r.body?.cancel();throw new ShopierError('Shopier kaydı şu anda doğrulanamıyor. Yeniden dene.',503);}
    const reader=r.body?.getReader();if(!reader)throw new Error();
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>256_000){await reader.cancel();throw new Error();}chunks.push(value);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  },10_000); } catch(error) {if(error instanceof ShopierError)throw error;throw new ShopierError('Shopier bağlantısı tamamlanamadı. Yeniden dene.',503);}
}
export async function verifyShopierProducts(s:ShopierSettings) {
  if(!shopierConfigured(s))throw new ShopierError('Üç gerçek Shopier ürününü yapılandırın.');
  for(const plan of SHOPIER_PLANS) {
    const configured=shopierProduct(s,plan.id),p=await shopierGet('products',configured.id) as any;
    if(p?.id!==configured.id||(p.variants!==undefined&&(!Array.isArray(p.variants)||p.variants.length))||(p.options!==undefined&&(!Array.isArray(p.options)||p.options.length))||p.type!=='digital'||p.stockStatus!=='inStock'||p.priceData?.currency!=='TRY'||p.priceData?.discount!==false
      ||moneyKurus(p.priceData?.price||'')!==plan.amountKurus||moneyKurus(p.priceData?.shippingPrice||'')!==0
      ||typeof p.url!=='string'||!safeShopierUrl(p.url)||p.url!==configured.url)
      throw new ShopierError('Shopier ürünü, bağlantısı, dijital teslimatı veya fiyatı paketle eşleşmiyor.');
  }
}
