// Read-only operations check. Do not print keys, customer data or raw provider errors.
import {readPlatformSettings} from '../server/platform-settings.ts';
import {commercialReadiness} from '../server/commercial-readiness.ts';
import {shopierConfigured} from '../src/lib/shopier-config.ts';
import {verifyShopierProducts} from '../server/shopier-client.ts';
try{
 const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
 const missing=required.filter(name=>!process.env[name]);
 if(missing.length){for(const name of missing)console.error('Eksik sunucu yapılandırması: '+name);process.exitCode=1;}
 else{
  const {settings}=await readPlatformSettings();let originReady=false,databaseReady=false,productsVerified=false,origin;
  try{origin=new URL(process.env.APP_BASE_URL||process.env.PUBLIC_SITE_URL||'');originReady=origin.protocol==='https:'&&!origin.username&&!origin.password&&origin.pathname==='/'&&!origin.search&&!origin.hash;}catch{}
  if(originReady){try{
   const response=await fetch(new URL('/api/health',origin),{redirect:'manual',signal:AbortSignal.timeout(10_000)});
   if(response.status===200&&!response.redirected&&/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||'')){
    const health=await response.json();databaseReady=health.status==='ok'&&health.database==='ready'&&health.projectRef===new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
   }
  }catch{}}
  const shopierTokenReady=!!process.env.SHOPIER_ACCESS_TOKEN;
  if(shopierTokenReady&&shopierConfigured(settings.shopier)){try{await verifyShopierProducts(settings.shopier);productsVerified=true;}catch{}}
  const report=commercialReadiness(settings,{databaseReady,originReady,shopierTokenReady,productsVerified});
  console.log('Kayıt: '+(report.registrationOpen?'açık':'kapalı')+' · Ücretli satış: '+(report.paidSalesEnabled?'açık':'kapalı'));
  if(report.readyForPaidLaunch)console.log('Ücretli yayın ön koşulları ve Shopier ürünleri doğrulandı.');
  else{for(const blocker of report.blockers)console.error('Tamamlanmalı: '+blocker);process.exitCode=1;}
 }
}catch{console.error('Yayın hazırlığı doğrulanamadı. Sunucu bağlantısını ve platform ayarlarını kontrol edin.');process.exitCode=1;}

