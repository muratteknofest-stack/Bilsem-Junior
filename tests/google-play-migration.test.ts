import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,mkdirSync,cpSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifiedPlayCatalog,verifyPlayCatalog,playSetupIssues,playConfig} from '../server/google-play-client';
// @ts-ignore Shared with the Node-only Android preparation command.
import {prepareAndroid} from '../scripts/prepare-android.mjs';
import {PLAY_PLANS} from '../src/lib/google-play-contract';
import {PGlite} from '@electric-sql/pglite';
const config={packageName:'com.quantumtech.bilsemjunior',productId:'zekapark_uyelik',enabled:false,enforced:false,allowTest:false};
const catalog=()=>({packageName:config.packageName,productId:config.productId,basePlans:PLAY_PLANS.map(p=>({basePlanId:p.id,state:'ACTIVE',autoRenewingBasePlanType:{billingPeriodDuration:p.period}}))});
test('existing generated Android project migrates to the actual Console package and remains repeatable',()=>{
 const root=mkdtempSync(join(tmpdir(),'bilsem-play-package-'));
 try {
  cpSync('mobile/android',join(root,'mobile/android'),{recursive:true});cpSync('capacitor.config.ts',join(root,'capacitor.config.ts'));
  mkdirSync(join(root,'android/app'),{recursive:true});
  writeFileSync(join(root,'android/app/build.gradle'),`android { namespace 'com.zekapark.app'\n defaultConfig { applicationId "com.zekapark.app" } }`);
  for(const path of ['main/java/com/zekapark/app/MainActivity.java','main/java/com/zekapark/app/PlayBillingPlugin.java','androidTest/java/com/zekapark/app/NativeAppSmokeTest.java']){
   const file=join(root,'android/app/src',path);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,'obsolete generated class');
  }
  prepareAndroid(root);const gradle=readFileSync(join(root,'android/app/build.gradle'),'utf8');prepareAndroid(root);
  assert.equal(readFileSync(join(root,'android/app/build.gradle'),'utf8'),gradle);
  assert.match(gradle,/namespace = "com.quantumtech.bilsemjunior"/);assert.match(gradle,/applicationId = "com.quantumtech.bilsemjunior"/);
  writeFileSync(join(root,'android/app/build.gradle'),`android { namespace = "com.zekapark.app"\n defaultConfig { applicationId = "com.zekapark.app" } }`);
  prepareAndroid(root);const assigned=readFileSync(join(root,'android/app/build.gradle'),'utf8');
  assert.match(assigned,/namespace = "com.quantumtech.bilsemjunior"/);assert.match(assigned,/applicationId = "com.quantumtech.bilsemjunior"/);
  for(const name of ['MainActivity','PlayBillingPlugin'])assert.match(readFileSync(join(root,`android/app/src/main/java/com/quantumtech/bilsemjunior/${name}.java`),'utf8'),/^package com\.quantumtech\.bilsemjunior;/);
  assert.equal(existsSync(join(root,'android/app/src/main/java/com/zekapark/app/MainActivity.java')),false);
  assert.equal(existsSync(join(root,'android/app/src/main/java/com/zekapark/app/PlayBillingPlugin.java')),false);
  assert.equal(existsSync(join(root,'android/app/src/androidTest/java/com/zekapark/app/NativeAppSmokeTest.java')),false);
  assert.match(readFileSync(join(root,'android/app/src/androidTest/java/com/quantumtech/bilsemjunior/NativeAppSmokeTest.java'),'utf8'),/^package com\.quantumtech\.bilsemjunior;/);
  assert.match(readFileSync(join(root,'android/app/src/main/res/values/strings.xml'),'utf8'),/<string name="package_name">com.quantumtech.bilsemjunior<\/string>/);
  assert.equal(playConfig().packageName,'com.quantumtech.bilsemjunior');
 } finally {rmSync(root,{recursive:true,force:true});}
});
test('setup diagnostic rejects malformed configuration without logging credentials or enabling sales',()=>{
 const env:NodeJS.ProcessEnv={GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:'fixture@fixture.iam.gserviceaccount.com',private_key:'-----BEGIN PRIVATE KEY-----fixture-secret'}),GOOGLE_PLAY_BINDING_SECRET:'b'.repeat(32),GOOGLE_PLAY_TOKEN_KEY:'a'.repeat(64),GOOGLE_PLAY_RTDN_AUDIENCE:'https://bilsemjunior.vercel.app/api/google-play/notifications',GOOGLE_PLAY_RTDN_EMAIL:'push@fixture.iam.gserviceaccount.com'};
 assert.deepEqual(playSetupIssues(env),[]);
 for(const key of Object.keys(env))assert.deepEqual(playSetupIssues({...env,[key]:'private-invalid-value'}),[key]);
 for(const audience of ['http://bilsemjunior.vercel.app/api/google-play/notifications','https://localhost/api/google-play/notifications','https://user:pass@example.test/api/google-play/notifications','https://example.test/api/google-play/notifications?secret=private','https://example.test/wrong'])assert.deepEqual(playSetupIssues({...env,GOOGLE_PLAY_RTDN_AUDIENCE:audience}),['GOOGLE_PLAY_RTDN_AUDIENCE']);
 const result=spawnSync(process.execPath,['--import','tsx','scripts/check-google-play-setup.ts'],{env:{...process.env,...Object.fromEntries(Object.keys(env).map(key=>[key,'private-invalid-value'])),GOOGLE_PLAY_PACKAGE_NAME:'com.quantumtech.bilsemjunior',GOOGLE_PLAY_BILLING_ENABLED:'false',GOOGLE_PLAY_ENFORCE_PAID_ACCESS:'false'},encoding:'utf8'});
 assert.equal(result.status,1);assert.ok(!result.stdout.includes('private-invalid-value'));assert.equal(result.stderr,'');
 const report=JSON.parse(result.stdout);assert.equal(report.catalogVerified,false);assert.equal(report.salesEnabled,false);assert.equal(report.configurationReady,false);assert.equal(report.issues.length,5);
});
test('catalog requires the actual app, product and three active calendar periods',async()=>{
 assert.equal(verifiedPlayCatalog(catalog(),config),true);
 for(const patch of [{packageName:'other.app.id'},{productId:'wrong'},{basePlans:catalog().basePlans.slice(1)}])assert.throws(()=>verifiedPlayCatalog({...catalog(),...patch},config));
 const disabled=catalog();disabled.basePlans[1].state='INACTIVE';assert.throws(()=>verifiedPlayCatalog(disabled,config));
 const wrongPeriod=catalog();wrongPeriod.basePlans[0].autoRenewingBasePlanType.billingPeriodDuration='P3M';assert.throws(()=>verifiedPlayCatalog(wrongPeriod,config));
 await verifyPlayCatalog(async(input,init)=>{assert.equal(String(input),'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.quantumtech.bilsemjunior/subscriptions/zekapark_uyelik');assert.equal(init?.redirect,'error');return Response.json(catalog());},'fixture');
 await assert.rejects(verifyPlayCatalog(async()=>new Response('private provider detail',{status:403}),'fixture'),e=>e instanceof Error&&!e.message.includes('private'));
});
test('retired checkout endpoints and components are absent from runtime routing',()=>{
 for(const path of ['server/routes/shopier-routes.ts','server/shopier-client.ts','src/components/ShopierBilling.tsx','scripts/check-shopier-connection.mjs'])assert.equal(existsSync(path),false);
 assert.ok(!readFileSync('server/api-app.ts','utf8').toLowerCase().includes('shopier'));
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
