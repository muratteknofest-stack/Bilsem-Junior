import { createHash } from 'node:crypto';
import { z } from 'zod';
import { SHOPIER_PLANS, shopierProduct, shopierReceiptPrice, type ShopierPlanId, type ShopierSettings } from '../src/lib/shopier-config';
export class ShopierError extends Error { constructor(message: string, public status=422) { super(message); } }
export function moneyKurus(value: string) {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) throw new ShopierError('Sipariş tutarı doğrulanamadı.');
  const [whole, fraction=''] = value.split('.'); return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
const orderSchema=z.object({id:z.string().min(1).max(80),paymentStatus:z.literal('paid'),status:z.enum(['fulfilled','unfulfilled']),
  dateCreated:z.string(),currency:z.literal('TRY'),shippingInfo:z.object({email:z.string().email()}),
  totals:z.object({subtotal:z.string(),shipping:z.string(),discount:z.string(),total:z.string()}),
  lineItems:z.array(z.object({productId:z.string(),type:z.literal('digital'),quantity:z.literal(1),price:z.string(),total:z.string(),selection:z.array(z.unknown()).max(0).optional(),options:z.array(z.unknown()).max(0).optional()})).length(1),
  refunds:z.array(z.object({status:z.enum(['pending','failed','succeeded'])})),
});
export function verifiedShopierOrder(raw:unknown, expectedId:string, buyer:{email:string}|{sha256:string}, settings:ShopierSettings, now=Date.now(), receipt?:{planId:ShopierPlanId;amountKurus:number}) {
  const parsed=orderSchema.safeParse(raw);
  if(!parsed.success)throw new ShopierError('Ödenmiş Shopier siparişi doğrulanamadı.');
  const order=parsed.data;
  const buyerEmailSha256=emailHash(order.shippingInfo.email);
  if(order.id!==expectedId || buyerEmailSha256!==('email' in buyer ? emailHash(buyer.email) : buyer.sha256))
    throw new ShopierError('Sipariş bu veli hesabı için doğrulanamadı.',403);
  if(order.refunds.some(r=>r.status!=='failed'))throw new ShopierError('İade sürecindeki sipariş için erişim açılamaz.');
  const created=Date.parse(order.dateCreated);
  if(!Number.isFinite(created)||created>now+60_000)throw new ShopierError('Sipariş tarihi doğrulanamadı.');
  const line=order.lineItems[0];
  const plan=SHOPIER_PLANS.find(p=>shopierProduct(settings,p.id).id===line.productId);
  const amountKurus=receipt?.amountKurus ?? plan?.amountKurus;
  if(!plan || amountKurus === undefined || (receipt && (receipt.planId!==plan.id || !shopierReceiptPrice(plan.id,amountKurus)))
    || [line.price,line.total,order.totals.subtotal,order.totals.total].some(v=>moneyKurus(v)!==amountKurus)
    || moneyKurus(order.totals.shipping)!==0 || moneyKurus(order.totals.discount)!==0)
    throw new ShopierError('Siparişin ürünü veya tutarı paketle eşleşmiyor.');
  return {orderId:order.id, productId:line.productId, planId:plan.id, days:plan.days, amountKurus:amountKurus!,
    buyerEmailSha256};
}
export type AccessReceipt={order_id:string;activated_at:string;duration_days:number};
export function accessExpiry(receipts:AccessReceipt[]) {
  let expiry=0;const seen=new Set<string>();
  for(const r of [...receipts].sort((a,b)=>Date.parse(a.activated_at)-Date.parse(b.activated_at)||a.order_id.localeCompare(b.order_id))) {
    const time=Date.parse(r.activated_at);
    if(seen.has(r.order_id)||!Number.isFinite(time)||!SHOPIER_PLANS.some(p=>p.days===r.duration_days))throw new ShopierError('Erişim kaydı doğrulanamadı.',503);
    seen.add(r.order_id);expiry=Math.max(expiry,time)+r.duration_days*86400_000;
  }
  return expiry ? new Date(expiry).toISOString() : null;
}

export const emailHash=(email:string)=>createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

