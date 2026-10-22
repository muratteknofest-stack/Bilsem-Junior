import { getServiceClient } from './supabase-admin';
import { shopierGet } from './shopier-client';
import { accessExpiry, verifiedShopierOrder, ShopierError, type AccessReceipt } from './shopier-model';
import { SHOPIER_PRODUCT_FIELDS, type ShopierSettings, type ShopierPlanId } from '../src/lib/shopier-config';
import { withRequestDeadline } from '../src/lib/request-deadline';
export async function assertShopierFamily(parentId:string,studentId:string) {
  const db=getServiceClient();
  const [parent,student]=await Promise.all([db.from('profiles').select('id,role,linked_student_ids').eq('id',parentId).single(),
    db.from('profiles').select('id,role,linked_parent_id').eq('id',studentId).single()]);
  if(parent.error||student.error)throw new ShopierError('Aile bilgileri doğrulanamadı.',503);
  if(parent.data.role!=='parent'||student.data.role!=='student'||student.data.linked_parent_id!==parentId
    ||!parent.data.linked_student_ids?.includes(studentId))throw new ShopierError('Bu öğrenci için yetkiniz bulunmuyor.',403);
}
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

