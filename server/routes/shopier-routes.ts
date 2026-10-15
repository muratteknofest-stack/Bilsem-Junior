import { Router } from 'express';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShopierSalesPage } from '../../src/components/ShopierSalesPage';
import { z } from 'zod';
import { SHOPIER_PLANS, shopierProduct } from '../../src/lib/shopier-config';
import { readPlatformSettings } from '../platform-settings';
import { shopierReady, shopierGet } from '../shopier-client';
import { verifiedShopierOrder, ShopierError } from '../shopier-model';
import { shopierAccess, assertShopierFamily } from '../shopier-access';
import { getServiceClient } from '../supabase-admin';
import { requireSupabaseAuth,requireVerifiedEmail,requireProfileRole,type AuthenticatedRequest } from '../security';
import { sharedRateLimit } from '../shared-rate-limit';
import { accountSecurityLimiter } from '../rate-limiters';
const routes=Router();
export async function publicShopierView() {
  return shopierView((await readPlatformSettings()).settings);
}
export function shopierView(settings:import('../../src/lib/platform-settings').PlatformSettings) {
  const ready=shopierReady(settings.shopier);
  return {ready,enforced:settings.shopier.enforcePaidAccess,brand:settings.business.brandName||settings.business.legalName||'ZekaPark',
    plans:SHOPIER_PLANS.map(p=>({...p,url:ready?shopierProduct(settings.shopier,p.id).url:null}))};
}
routes.get('/public/shopier',async(_req,res)=>res.json(await publicShopierView()));
export function shopierPageHtml(config:ReturnType<typeof shopierView>) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f7f2"><meta name="description" content="ZekaPark ile 1–4. sınıflar için 44 konuda renkli testler, adaptif çalışma ve veli takibi. Aylık, 3 aylık ve yıllık paketleri keşfedin."><title>ZekaPark · Renkli keşif paketleri</title><link rel="icon" href="/logo.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/sales/sales.css"></head><body>${renderToStaticMarkup(React.createElement(ShopierSalesPage,config))}</body></html>`;
}
routes.get('/public/shopier/page',async(_req,res)=>{res.type('html').send(shopierPageHtml(await publicShopierView()));});
routes.use('/parent/shopier',requireSupabaseAuth,requireVerifiedEmail,requireProfileRole('parent'),accountSecurityLimiter);
const studentSchema=z.uuid();
routes.get('/parent/shopier/access',sharedRateLimit('shopier-access',60,600),async(req:AuthenticatedRequest,res)=>{
  try {
    const id=studentSchema.parse(req.query.studentId),{settings}=await readPlatformSettings();const config=shopierView(settings);
    const access=await shopierAccess(req.authUser!.uid,id,settings.shopier);
    res.json({...config,access});
  } catch(error){if(error instanceof z.ZodError)return res.status(400).json({error:'Öğrenci seçimi geçersiz.'});if(error instanceof ShopierError)return res.status(error.status).json({error:error.message});throw error;}
});
routes.post('/parent/shopier/claim',sharedRateLimit('shopier-claim',12,3600),async(req:AuthenticatedRequest,res)=>{
  try {
    const {orderId,studentId}=z.object({orderId:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),studentId:studentSchema}).strict().parse(req.body);
    const {settings}=await readPlatformSettings();
    if(!shopierReady(settings.shopier))throw new ShopierError('Shopier satış hesabı henüz bağlanmadı.',503);
    await assertShopierFamily(req.authUser!.uid,studentId);
    if(!req.authUser!.email)throw new ShopierError('Veli e-postası doğrulanamadı.',403);
    const raw=await shopierGet('orders',orderId);
    const proof=verifiedShopierOrder(raw,orderId,{email:req.authUser!.email},settings.shopier);
    const saved=await getServiceClient().rpc('claim_shopier_access_v2',{p_order:proof.orderId,p_parent:req.authUser!.uid,p_student:studentId,
      p_product:proof.productId,p_plan:proof.planId,p_buyer_hash:proof.buyerEmailSha256,p_amount:proof.amountKurus});
    if(saved.error?.code==='40001')throw new ShopierError('Bu sipariş daha önce başka bir öğrenciye tanımlanmış.',409);
    if(saved.error?.code==='42501')throw new ShopierError('Öğrenci bağlantısı değişmiş. Yeniden yükle.',403);
    if(saved.error||saved.data?.order_id!==orderId)throw new ShopierError('Erişim kaydı doğrulanamadı.',503);
    res.json({access:await shopierAccess(req.authUser!.uid,studentId,settings.shopier)});
  } catch(error){if(error instanceof z.ZodError)return res.status(400).json({error:'Sipariş veya öğrenci bilgileri geçersiz.'});if(error instanceof ShopierError)return res.status(error.status).json({error:error.message});throw error;}
});
export default routes;
