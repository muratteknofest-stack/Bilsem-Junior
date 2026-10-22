import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {verifiedPlayCatalog,verifyPlayCatalog} from '../server/google-play-client';
import {PLAY_PLANS} from '../src/lib/google-play-contract';
import {PGlite} from '@electric-sql/pglite';
const config={packageName:'com.zekapark.app',productId:'zekapark_uyelik',enabled:false,enforced:false,allowTest:false};
const catalog=()=>({packageName:config.packageName,productId:config.productId,basePlans:PLAY_PLANS.map(p=>({basePlanId:p.id,state:'ACTIVE',autoRenewingBasePlanType:{billingPeriodDuration:p.period}}))});
test('catalog requires the actual app, product and three active calendar periods',async()=>{
 assert.equal(verifiedPlayCatalog(catalog(),config),true);
 for(const patch of [{packageName:'other.app.id'},{productId:'wrong'},{basePlans:catalog().basePlans.slice(1)}])assert.throws(()=>verifiedPlayCatalog({...catalog(),...patch},config));
 const disabled=catalog();disabled.basePlans[1].state='INACTIVE';assert.throws(()=>verifiedPlayCatalog(disabled,config));
 const wrongPeriod=catalog();wrongPeriod.basePlans[0].autoRenewingBasePlanType.billingPeriodDuration='P3M';assert.throws(()=>verifiedPlayCatalog(wrongPeriod,config));
 await verifyPlayCatalog(async(input,init)=>{assert.equal(String(input),'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.zekapark.app/subscriptions/zekapark_uyelik');assert.equal(init?.redirect,'error');return Response.json(catalog());},'fixture');
 await assert.rejects(verifyPlayCatalog(async()=>new Response('private provider detail',{status:403}),'fixture'),e=>e instanceof Error&&!e.message.includes('private'));
});
test('web Shopier membership coexists with native Google Play billing',()=>{
 for(const path of ['server/routes/shopier-routes.ts','server/shopier-client.ts','src/components/ShopierBilling.tsx'])assert.equal(existsSync(path),true);
 assert.ok(readFileSync('server/api-app.ts','utf8').includes("app.use('/api', shopierRoutes)"));
 assert.match(readFileSync('src/components/NativeAccessStatus.tsx','utf8'), /if \(!isAndroidApp\) return <WebBillingSession/);
 assert.ok(!readFileSync('src/components/ParentPortalView.tsx','utf8').includes('Shopier'));
 const routes=JSON.parse(readFileSync('vercel.json','utf8'));assert.equal(routes.rewrites.find((r:{source:string})=>r.source==='/paketler').destination,'/api/index?__path=public/membership/page');
});
test('retirement revokes legacy writes and claims while preserving business settings and deletion review reads',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create table public.platform_settings(id boolean primary key,settings jsonb,revision integer,updated_at timestamptz);
   insert into public.platform_settings values(true,'{"shopier":{"enabled":false},"business":{"brandName":"Fixture"}}',8,now());
   create table public.shopier_access_orders(id integer);grant select,insert,update,delete on public.shopier_access_orders to service_role;
   create function public.claim_shopier_access(text,uuid,uuid,text,text,text) returns text language sql as $$select null::text$$;
   create function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) returns text language sql as $$select null::text$$;
   grant execute on all functions in schema public to service_role;`);
  const migration=readFileSync('supabase/migrations/20261017232044_retire_legacy_payment_integration.sql','utf8');
  await db.exec(migration);await db.exec(migration);
  const result=await db.query<{settings:{business:{brandName:string}};revision:number}>('select settings,revision from public.platform_settings');
  assert.deepEqual(result.rows[0],{settings:{business:{brandName:'Fixture'}},revision:9});
  const grants=await db.query<{claim:boolean;write:boolean;read:boolean}>(`select has_function_privilege('service_role','public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer)','EXECUTE') as claim,has_table_privilege('service_role','public.shopier_access_orders','INSERT') as write,has_table_privilege('service_role','public.shopier_access_orders','SELECT') as read`);
  assert.deepEqual(grants.rows[0],{claim:false,write:false,read:true});
 }finally{await db.close();}
});

