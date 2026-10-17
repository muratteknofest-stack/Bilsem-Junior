import { getServiceClient } from './supabase-admin';
import { readPlatformSettings } from './platform-settings';
import { shopierGet } from './shopier-client';
import { accessExpiry, verifiedShopierOrder, ShopierError, type AccessReceipt } from './shopier-model';
import { SHOPIER_PRODUCT_FIELDS, type ShopierSettings, type ShopierPlanId } from '../src/lib/shopier-config';
import { withRequestDeadline } from '../src/lib/request-deadline';
import { assertBillingFamily as assertShopierFamily } from './billing-family';
export { assertShopierFamily };
import { googlePlayAccess } from './google-play-access';
import { GooglePlayError } from './google-play-model';
export async function shopierAccess(parentId:string,studentId:string,settings:ShopierSettings) {
  try { return await withRequestDeadline(async signal=>{
    await assertShopierFamily(parentId,studentId);
    const db=getServiceClient();
    const result=await db.from('shopier_access_orders').select('order_id,activated_at,duration_days,amount_kurus,buyer_email_sha256,product_id,plan_id')
      .eq('parent_id',parentId).eq('student_id',studentId).order('activated_at').limit(51);
    if(result.error||!result.data||result.data.length>50)throw new ShopierError('Erişim kayıtları doğrulanamadı.',503);
    if(!result.data.length)return {active:false,expiresAt:null};
    if(!process.env.SHOPIER_ACCESS_TOKEN)throw new ShopierError('Shopier erişimi şu anda doğrulanamıyor.',503);
    const valid:AccessReceipt[]=[];
    for(let i=0;i<result.data.length;i+=3){
      if(signal.aborted)throw new ShopierError('Doğrulama süresi aşıldı.',503);
      const group=await Promise.all(result.data.slice(i,i+3).map(async receipt=>{
        const raw=await shopierGet('orders',receipt.order_id,fetch,process.env.SHOPIER_ACCESS_TOKEN,signal);
        try {const fields=SHOPIER_PRODUCT_FIELDS[receipt.plan_id as ShopierPlanId];
          if(!fields)throw new ShopierError('Erişim planı doğrulanamadı.');
          const bound={...settings,monthlyProductId:'',quarterlyProductId:'',annualProductId:'',[fields.id]:receipt.product_id};
          const proof=verifiedShopierOrder(raw,receipt.order_id,{sha256:receipt.buyer_email_sha256},bound,Date.now(),{planId:receipt.plan_id,amountKurus:receipt.amount_kurus});
          return proof.productId===receipt.product_id&&proof.planId===receipt.plan_id&&proof.days===receipt.duration_days ? receipt : null;
        } catch(error){if(error instanceof ShopierError && error.status!==503)return null;throw error;}
      }));
      valid.push(...group.filter((r):r is NonNullable<typeof r>=>!!r));
    }
    const expiresAt=accessExpiry(valid);return {active:!!expiresAt&&Date.parse(expiresAt)>Date.now(),expiresAt};
  },15_000); } catch(error){if(error instanceof ShopierError)throw error;throw new ShopierError('Ödeme erişimi şu anda doğrulanamıyor. Yeniden dene.',503);}
}
export class MembershipRequiredError extends ShopierError {
  readonly code = 'MEMBERSHIP_REQUIRED';
  constructor() { super('Bu bölüm için aktif üyelik gerekli. Günlük üç ücretsiz soruyla çalışmaya devam edebilirsin.', 403); }
}
export async function learningAccess(studentId:string) {
  const {settings}=await readPlatformSettings();
  const student=await getServiceClient().from('profiles').select('linked_parent_id').eq('id',studentId).single();
  if(student.error)throw new ShopierError('Üyelik durumu doğrulanamadı.',503);
  if(!student.data?.linked_parent_id)return {active:false,expiresAt:null};
  const parentId=student.data.linked_parent_id;
  // Sales switches do not grant access or revoke an existing verified purchase.
  // One available provider can confirm access while the other is unavailable.
  const results=await Promise.allSettled([googlePlayAccess(parentId,studentId),shopierAccess(parentId,studentId,settings.shopier)]);
  for(const result of results){
    if(result.status==='fulfilled'&&result.value.active)return result.value;
  }
  if(results.some(result=>result.status==='rejected'&&(!(result.reason instanceof GooglePlayError||result.reason instanceof ShopierError)||result.reason.status===503)))
    throw new ShopierError('Üyelik durumu şu anda doğrulanamıyor. Yeniden dene; günlük ücretsiz soruların açık.',503);
  return {active:false,expiresAt:null};
}
export async function requireLearningAccess(studentId:string) {
  if(!(await learningAccess(studentId)).active)throw new MembershipRequiredError();
}
