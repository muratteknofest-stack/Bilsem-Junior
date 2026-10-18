import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import express from 'express';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { GooglePlayError, encryptPlayToken, decryptPlayToken, tokenHash, playBindings, verifiedPlaySubscription } from '../server/google-play-model';
import { playRequest, verifyPlayPush } from '../server/google-play-client';
import playRoutes from '../server/routes/google-play-routes';
import { requireLearningAccess } from '../server/membership-access';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
const parent='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const secret='unit-test-binding-secret-not-a-real-secret', key='12'.repeat(32), purchaseToken='test-purchase-token', binding=playBindings(parent,student,secret);
const expiry='2027-01-16T12:00:00.000Z';
const subscription=(patch: Record<string,unknown>={})=>({kind:'androidpublisher#subscriptionPurchaseV2',subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING',externalAccountIdentifiers:{obfuscatedExternalAccountId:binding.accountId,obfuscatedExternalProfileId:binding.profileId},lineItems:[{productId:'zekapark_uyelik',expiryTime:expiry,offerDetails:{basePlanId:'quarterly'},autoRenewingPlan:{autoRenewEnabled:true}}],...patch});
const expected={...binding,productId:'zekapark_uyelik',allowTest:false};
test('only Google-authoritative active, grace and canceled-unexpired subscriptions grant access',()=>{
  const now=Date.parse('2026-10-16T12:00:00Z');
  for(const suffix of ['ACTIVE','IN_GRACE_PERIOD','CANCELED'])assert.equal(verifiedPlaySubscription(subscription({subscriptionState:'SUBSCRIPTION_STATE_'+suffix}),expected,now).active,true);
  for(const suffix of ['PENDING','PAUSED','ON_HOLD','EXPIRED','PENDING_PURCHASE_CANCELED'])assert.equal(verifiedPlaySubscription(subscription({subscriptionState:'SUBSCRIPTION_STATE_'+suffix}),expected,now).active,false);
  assert.equal(verifiedPlaySubscription(subscription(),expected,Date.parse(expiry)).active,false);
  assert.equal(verifiedPlaySubscription(subscription(),expected,now).expiresAt,expiry);
  const monthly=subscription();monthly.lineItems[0].offerDetails.basePlanId='monthly';assert.equal(verifiedPlaySubscription(monthly,expected,now).expiresAt,expiry);
});
test('wrong product, parent, student, unknown state, missing expiry and test purchase cannot manufacture access',()=>{
  for(const patch of [{subscriptionState:'paid'}, {externalAccountIdentifiers:{obfuscatedExternalAccountId:'a'.repeat(64),obfuscatedExternalProfileId:binding.profileId}}, {externalAccountIdentifiers:{obfuscatedExternalAccountId:binding.accountId,obfuscatedExternalProfileId:'b'.repeat(64)}}, {testPurchase:{}}])assert.throws(()=>verifiedPlaySubscription(subscription(patch),expected));
  const wrong=subscription();wrong.lineItems[0].productId='other';assert.throws(()=>verifiedPlaySubscription(wrong,expected));
  const missing=subscription();delete (missing.lineItems[0] as any).expiryTime;assert.equal(verifiedPlaySubscription(missing,expected).active,false);
  const invalid=subscription();invalid.lineItems[0].expiryTime='tomorrow';assert.throws(()=>verifiedPlaySubscription(invalid,expected));
  assert.equal(verifiedPlaySubscription(subscription({testPurchase:{}}),{...expected,allowTest:true}).testPurchase,true);
  assert.throws(()=>verifiedPlaySubscription({...subscription(),lineItems:[...subscription().lineItems,...subscription().lineItems]},expected));
});
test('purchase binding is deterministic and scoped; encrypted tokens reject tampering and swapped rows',()=>{
  assert.deepEqual(playBindings(parent,student,secret),binding);assert.notEqual(playBindings(parent,other,secret).profileId,binding.profileId);
  assert.notEqual(playBindings(other,student,secret).accountId,binding.accountId);assert.equal(binding.accountId.length,64);assert.ok(!binding.accountId.includes(parent));
  assert.throws(()=>playBindings(parent,student,''));assert.throws(()=>encryptPlayToken(purchaseToken,'bad'));
  const encrypted=encryptPlayToken(purchaseToken,key);assert.ok(!encrypted.includes(purchaseToken));assert.equal(decryptPlayToken(encrypted,tokenHash(purchaseToken),key),purchaseToken);
  assert.notEqual(encryptPlayToken(purchaseToken,key),encrypted);
  assert.throws(()=>decryptPlayToken(encrypted,tokenHash('other-purchase-token'),key));
  assert.throws(()=>decryptPlayToken(encrypted.replace(/.$/,encrypted.endsWith('0')?'1':'0'),tokenHash(purchaseToken),key));
});
test('provider requests use fixed Google origin, bounded responses, no redirects and no leaked errors',async()=>{
  const original=process.env.GOOGLE_PLAY_PACKAGE_NAME;delete process.env.GOOGLE_PLAY_PACKAGE_NAME;
  try {
    const result=await playRequest(purchaseToken,'get',async(input,init)=>{
      assert.equal(String(input),'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.zekapark.app/purchases/subscriptionsv2/tokens/test-purchase-token');assert.equal(init?.redirect,'error');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer unit-test');return Response.json(subscription());
    },'unit-test');assert.deepEqual(result,subscription());
    await playRequest(purchaseToken,'acknowledge',async(input,init)=>{assert.match(String(input),/purchases\/subscriptions\/zekapark_uyelik\/tokens\/test-purchase-token:acknowledge$/);assert.equal(init?.method,'POST');return new Response(null,{status:204});},'unit-test');
    await assert.rejects(playRequest(purchaseToken,'get',async()=>new Response('x'.repeat(256001)),'unit-test'),GooglePlayError);
    await assert.rejects(playRequest(purchaseToken,'get',async()=>new Response('private-error-payload',{status:403}),'unit-test'),e=>e instanceof GooglePlayError&&!e.message.includes('private-error'));
    await assert.rejects(playRequest('../outside','get',async()=>{throw Error('must not fetch');},'unit-test'));
  }finally{if(original===undefined)delete process.env.GOOGLE_PLAY_PACKAGE_NAME;else process.env.GOOGLE_PLAY_PACKAGE_NAME=original;}
});
test('real Postgres preserves one binding and exact expiry, rejects stale grants and isolates the ledger',{timeout:30000},async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    create table public.profiles(id uuid primary key,role text,linked_student_ids text[] default '{}',linked_parent_id text,deletion_pending boolean not null default false);
    grant select,update on public.profiles to service_role;`);
    await db.exec(await readFile('supabase/migrations/20261017061944_google_play_subscriptions.sql','utf8'));
    await db.query("insert into public.profiles(id,role,linked_student_ids,linked_parent_id) values($1::uuid,'parent',array[$2::text,$3::text],null),($2::uuid,'student','{}',$1::text),($3::uuid,'student','{}',$1::text)",[parent,student,other]);
    const hash=tokenHash(purchaseToken), encrypted=encryptPlayToken(purchaseToken,key);
    const save=(options:{hash?:string;child?:string;state?:string;date?:string;linked?:string}={})=>db.query("select public.record_google_play_subscription($1,$2,$3,$4,'com.zekapark.app','zekapark_uyelik','quarterly',$5,$6,true,'ACKNOWLEDGEMENT_STATE_PENDING',$7,$8,false)",[options.hash||hash,parent,options.child||student,encrypted,options.state||'SUBSCRIPTION_STATE_ACTIVE',expiry,options.linked||null,options.date||new Date().toISOString()]);
    await db.exec("set role authenticated;select set_config('request.jwt.claims','{\"role\":\"authenticated\"}',false)");
    await assert.rejects(db.query('select * from public.google_play_subscriptions'),/permission denied/);await assert.rejects(db.query('select * from public.google_play_purchase_bindings'),/permission denied/);await assert.rejects(save(),/permission denied/);
    await db.exec("reset role;set role service_role;select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)");
    const prepare=()=>db.query('select public.prepare_google_play_binding($1,$2,$3,$4)',[parent,student,binding.accountId,binding.profileId]);
    await prepare();await prepare();assert.equal((await db.query('select * from public.google_play_purchase_bindings')).rows.length,1);
    const old=new Date(Date.now()-20000).toISOString(),latest=new Date(Date.now()-10000).toISOString();
    await save({date:old});await save({date:latest});
    const row=(await db.query<any>('select * from public.google_play_subscriptions')).rows[0];assert.equal(new Date(row.expires_at).toISOString(),expiry);
    assert.equal((await db.query('select * from public.google_play_subscriptions')).rows.length,1);
    await db.query('select public.prepare_google_play_binding($1,$2,$3,$4)',[parent,other,binding.accountId,playBindings(parent,other,secret).profileId]);
    await assert.rejects(save({child:other}),/already assigned/);
    await assert.rejects(save({hash:tokenHash('linked-new-purchase'),child:other,linked:hash}),/already assigned/);
    await save({state:'SUBSCRIPTION_STATE_EXPIRED'});
    await assert.rejects(save({date:latest}),/Stale verification/);
    assert.equal((await db.query<any>('select subscription_state from public.google_play_subscriptions')).rows[0].subscription_state,'SUBSCRIPTION_STATE_EXPIRED');
    await assert.rejects(db.query('update public.profiles set deletion_pending=true where id=$1',[parent]),/retention review/);
    await db.exec('reset role');await db.query('delete from public.profiles where id=$1',[parent]);
    assert.equal((await db.query<any>('select parent_id from public.google_play_subscriptions')).rows[0].parent_id,null);
    assert.equal((await db.query('select * from public.google_play_purchase_bindings')).rows.length,0);
    await db.query("insert into public.profiles(id,role,linked_student_ids) values($1::uuid,'parent',array[$2::text,$3::text])",[parent,student,other]);
    await db.exec("set role service_role;select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)");
    await prepare();await assert.rejects(save(),/already assigned/);
  }finally{await db.close();}
});
test('authenticated flow verifies before grant, acknowledges after durable save, restores and enforces paid learning',{timeout:30000},async()=>{
  const savedEnv={...process.env},originalFetch=globalThis.fetch,originalToken=GoogleAuth.prototype.getAccessToken,originalVerify=OAuth2Client.prototype.verifyIdToken;
  Object.assign(process.env,{SUPABASE_URL:'https://play-fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'unit-test',GOOGLE_PLAY_BINDING_SECRET:secret,GOOGLE_PLAY_TOKEN_KEY:key,GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:'fixture@fixture.iam.gserviceaccount.com',private_key:'-----BEGIN PRIVATE KEY-----fixture-only'}),GOOGLE_PLAY_ENFORCE_PAID_ACCESS:'true',GOOGLE_PLAY_BILLING_ENABLED:'true',GOOGLE_PLAY_ALLOW_TEST_PURCHASES:'false',GOOGLE_PLAY_RTDN_AUDIENCE:'https://api.example.test/api/google-play/notifications',GOOGLE_PLAY_RTDN_EMAIL:'push@fixture.iam.gserviceaccount.com'});
  const platform=defaultPlatformSettings();let ledger:any[]=[],events:string[]=[],payload=subscription(),failSave=false,failAck=false,emailVerified=true,role='parent';
  GoogleAuth.prototype.getAccessToken=async()=> 'fixture-oauth';
  let oidcValid=false, preparedBinding=false;
  OAuth2Client.prototype.verifyIdToken=(async(options:any)=>{assert.equal(options.audience,process.env.GOOGLE_PLAY_RTDN_AUDIENCE);if(!oidcValid)throw Error('invalid signature');return {getPayload:()=>({email:process.env.GOOGLE_PLAY_RTDN_EMAIL,email_verified:true,iss:'https://accounts.google.com'})};}) as any;
  globalThis.fetch=(async(input,init)=>{
    const req=new Request(input as RequestInfo,init),u=new URL(req.url);let value:unknown;
    if(u.hostname==='androidpublisher.googleapis.com'){
      assert.equal(req.headers.get('authorization'),'Bearer fixture-oauth');
      if(req.method==='POST'){events.push('ack');assert.ok(events.includes('save'));if(failAck)return new Response('unavailable',{status:503});return new Response(null,{status:204});}
      events.push('google');value=payload;
    }else if(u.hostname!=='play-fixture.invalid')return originalFetch(input,init);
    else if(u.pathname==='/auth/v1/user')value={id:parent,email:'parent@example.com',email_confirmed_at:emailVerified?new Date().toISOString():null,app_metadata:{role}};
    else if(u.pathname==='/rest/v1/rpc/is_user_session_active'||u.pathname==='/rest/v1/rpc/consume_api_limit')value=true;
    else if(u.pathname==='/rest/v1/platform_settings')value={settings:platform,revision:1,updated_at:null};
    else if(u.pathname==='/rest/v1/profiles'){
      const id=u.searchParams.get('id')?.slice(3);const row=id===student?{id:student,role:'student',linked_parent_id:parent}:id===other?{id:other,role:'student',linked_parent_id:'44444444-4444-4444-8444-444444444444'}:{id:parent,role,linked_student_ids:[student]};
      value=req.headers.get('accept')?.includes('vnd.pgrst.object')?row:[row];
    }else if(u.pathname==='/rest/v1/rpc/prepare_google_play_binding'){const body=await req.json();assert.deepEqual(body,{p_parent:parent,p_student:student,p_account:binding.accountId,p_profile:binding.profileId});preparedBinding=true;value=true;}
    else if(u.pathname==='/rest/v1/rpc/record_google_play_subscription'){
      events.push('save');if(failSave)return Response.json({code:'XX000',message:'private-db-failure'},{status:503});
      const body=await req.json();assert.equal(body.p_expiry,expiry);assert.equal(body.p_student,student);assert.ok(!body.p_token.includes(purchaseToken));
      ledger=[{token_hash:body.p_hash,token_ciphertext:body.p_token,package_name:body.p_package,product_id:body.p_product,parent_id:parent,student_id:student}];value=body.p_hash;
    }else if(u.pathname==='/rest/v1/google_play_purchase_bindings')value=preparedBinding?{parent_id:parent,student_id:student}:null;
    else if(u.pathname==='/rest/v1/google_play_subscriptions')value=req.headers.get('accept')?.includes('vnd.pgrst.object')?ledger[0]||null:ledger;
    else throw Error('Unexpected fixture endpoint '+u.pathname);
    return Response.json(value);
  }) as typeof fetch;
  const app=express();app.use(express.json());app.use('/api',playRoutes);app.use((e:any,_req:any,res:any,_next:any)=>res.status(500).json({error:e.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const session=['fixture',Buffer.from(JSON.stringify({session_id:'99999999-9999-4999-8999-999999999999',aal:'aal1'})).toString('base64url'),'fixture'].join('.');
  const post=async(path:string,body:unknown,authenticated=true)=>{const r=await originalFetch(origin+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:`Bearer ${session}`}:{})},body:JSON.stringify(body)});return {status:r.status,body:r.status===204?null:await r.json() as any};};
  const verify=(body:unknown={studentId:student,purchaseToken})=>post('parent/google-play/verify',body);
  try{
    assert.equal((await post('parent/google-play/verify',{studentId:student,purchaseToken},false)).status,401);
    emailVerified=false;assert.equal((await verify()).status,403);emailVerified=true;
    role='student';assert.equal((await verify()).status,403);role='parent';
    assert.equal((await verify({studentId:student,purchaseToken,paid:true,price:1})).status,400);assert.equal(events.length,0);
    assert.equal((await verify({studentId:other,purchaseToken})).status,403);assert.equal(events.length,0);
    assert.equal((await post('parent/google-play/prepare',{studentId:student})).status,503);assert.equal(events.length,0); // release blockers cannot be bypassed
    assert.equal((await verify()).status,409);assert.equal(events.length,0);
    platform.business={legalName:'Fixture operator',address:'Fixture address',contactEmail:'fixture@example.com',legalBases:'Fixture purposes',retention:'Fixture retention',transfers:'Fixture transfers'};
    platform.release={registrationEnabled:true,emailTested:true,restoreTested:true,familyPilotTested:true,monitoringTested:true};
    const prepared=await post('parent/google-play/prepare',{studentId:student});assert.equal(prepared.status,200);assert.equal(prepared.body.accountId,binding.accountId);assert.equal(prepared.body.profileId,binding.profileId);assert.equal(events.length,0);
    payload=subscription({externalAccountIdentifiers:{obfuscatedExternalAccountId:binding.accountId,obfuscatedExternalProfileId:'b'.repeat(64)}});assert.equal((await verify()).status,409);assert.deepEqual(events,['google']);
    events=[];payload=subscription();failSave=true;assert.equal((await verify()).status,503);assert.deepEqual(events,['google','save']);failSave=false;
    events=[];failAck=true;assert.equal((await verify()).status,503);assert.deepEqual(events,['google','save','ack']);assert.equal(ledger.length,1);failAck=false;
    events=[];const restored=await verify();assert.equal(restored.status,200);assert.equal(restored.body.access.active,true);assert.equal(restored.body.access.expiresAt,expiry);assert.equal(ledger.length,1);assert.deepEqual(events,['google','save','ack']);
    // Each new study request checks the Google-authoritative entitlement.
    await requireLearningAccess(student);
    process.env.GOOGLE_PLAY_BILLING_ENABLED='false';
    await requireLearningAccess(student); // disabling new sales never grants free premium access or revokes a verified purchase
    payload=subscription({subscriptionState:'SUBSCRIPTION_STATE_ON_HOLD'});await assert.rejects(requireLearningAccess(student),e=>(e as any).status===403);
    payload=subscription({subscriptionState:'SUBSCRIPTION_STATE_CANCELED'});await requireLearningAccess(student);
    payload=subscription({subscriptionState:'SUBSCRIPTION_STATE_EXPIRED'});await assert.rejects(requireLearningAccess(student),e=>(e as any).status===403);
    events=[];const notification={message:{data:Buffer.from(JSON.stringify({packageName:'com.zekapark.app',subscriptionNotification:{purchaseToken}})).toString('base64'),messageId:'test'}};
    assert.equal((await post('google-play/notifications',notification)).status,401);assert.equal(events.length,0);
    oidcValid=true;assert.equal((await post('google-play/notifications',notification)).status,204);assert.deepEqual(events,['google','save']);
    events=[];notification.message.data=Buffer.from(JSON.stringify({packageName:'other.package.app',subscriptionNotification:{purchaseToken}})).toString('base64');assert.equal((await post('google-play/notifications',notification)).status,400);assert.equal(events.length,0);
    // Empty ledger can never become active through notifications alone.
    ledger=[];preparedBinding=false;events=[];notification.message.data=Buffer.from(JSON.stringify({packageName:'com.zekapark.app',subscriptionNotification:{purchaseToken}})).toString('base64');assert.equal((await post('google-play/notifications',notification)).status,204);assert.deepEqual(events,['google']);
    // A prepared binding recovers a completed purchase even when the client died before verify.
    preparedBinding=true;payload=subscription();events=[];assert.equal((await post('google-play/notifications',notification)).status,204);assert.deepEqual(events,['google','google','save','ack']);assert.equal(ledger.length,1);
  }finally{
    await new Promise<void>(resolve=>server.close(()=>resolve()));globalThis.fetch=originalFetch;GoogleAuth.prototype.getAccessToken=originalToken;OAuth2Client.prototype.verifyIdToken=originalVerify;
    for(const k of Object.keys(process.env))if(!(k in savedEnv))delete process.env[k];Object.assign(process.env,savedEnv);
  }
});
