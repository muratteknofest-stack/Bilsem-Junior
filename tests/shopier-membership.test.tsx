import test from 'node:test';
import { shopierMembershipPageHtml } from '../server/shopier-membership-page';
import express from 'express';
import shopierRoutes from '../server/routes/shopier-routes';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
import { resolvedMembershipAccess } from '../server/membership-policy';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { verifiedShopierOrder,accessExpiry,moneyKurus,emailHash,ShopierError } from '../server/shopier-model';
import { shopierGet,verifyShopierProducts } from '../server/shopier-client';
import { shopierSettingsSchema,safeShopierUrl,shopierConfigured,SHOPIER_PLANS } from '../src/lib/shopier-config';
import { ShopierPackageCards } from '../src/components/ShopierPackageCards';

const settings=shopierSettingsSchema.parse({enabled:true,monthlyProductId:'30',quarterlyProductId:'90',annualProductId:'365',annualUrl:'https://www.shopier.com/365',monthlyUrl:'https://www.shopier.com/30',quarterlyUrl:'https://www.shopier.com/90'});
const order=()=>({id:'order-1',status:'unfulfilled',paymentStatus:'paid',dateCreated:'2026-10-12T10:00:00+0300',currency:'TRY',
  shippingInfo:{email:'parent@example.com'},totals:{subtotal:'299.00',shipping:'0.00',discount:'0.00',total:'299.00'},
  lineItems:[{productId:'30',type:'digital',quantity:1,price:'299.00',total:'299.00'}],refunds:[] as Array<{status:string}>});

test('three launch plans have exact durations and prices; legacy settings cannot enable an incomplete checkout',()=>{
  assert.deepEqual(SHOPIER_PLANS.map(p=>[p.id,p.days,p.amountKurus]),[['monthly',30,29900],['quarterly',90,69900],['annual',365,149900]]);
  assert.equal(shopierConfigured(settings),true);
  const {annualProductId:_id,annualUrl:_url,...legacy}=settings;
  const upgraded=shopierSettingsSchema.parse(legacy);
  assert.equal(upgraded.annualProductId,'');assert.equal(upgraded.annualUrl,'');assert.equal(shopierConfigured(upgraded),false);
  assert.equal(shopierConfigured({...settings,annualProductId:settings.monthlyProductId}),false);
});

test('annual and quarterly payments use the exact current amount; saved historical quarterly receipts retain their price',()=>{
  const priced=(productId:string,price:string)=>({...order(),totals:{...order().totals,subtotal:price,total:price},lineItems:[{...order().lineItems[0],productId,price,total:price}]});
  assert.equal(verifiedShopierOrder(priced('365','1499.00'),'order-1',{email:'parent@example.com'},settings).days,365);
  assert.equal(verifiedShopierOrder(priced('90','699.00'),'order-1',{email:'parent@example.com'},settings).amountKurus,69900);
  for(const price of ['299.00','699.00','1498.99'])assert.throws(()=>verifiedShopierOrder(priced('365',price),'order-1',{email:'parent@example.com'},settings));
  const historical=priced('90','799.00');
  assert.throws(()=>verifiedShopierOrder(historical,'order-1',{email:'parent@example.com'},settings));
  assert.equal(verifiedShopierOrder(historical,'order-1',{email:'parent@example.com'},settings,Date.now(),{planId:'quarterly',amountKurus:79900}).days,90);
  assert.throws(()=>verifiedShopierOrder(historical,'order-1',{email:'parent@example.com'},settings,Date.now(),{planId:'annual',amountKurus:79900}));
  assert.throws(()=>verifiedShopierOrder(priced('90','1.00'),'order-1',{email:'parent@example.com'},settings,Date.now(),{planId:'quarterly',amountKurus:100}));
});

test('a paid unfulfilled digital order is valid; fulfillment alone never establishes payment',()=>{
  const proof=verifiedShopierOrder(order(),'order-1',{email:'PARENT@example.com'},settings);
  assert.equal(proof.days,30);assert.equal(proof.buyerEmailSha256,emailHash('parent@example.com'));
  const unpaid={...order(),status:'fulfilled',paymentStatus:'unpaid'};
  assert.throws(()=>verifiedShopierOrder(unpaid,'order-1',{email:'parent@example.com'},settings),ShopierError);
});
test('an authenticated buyer cannot claim another buyer order or a substituted order ID',()=>{
  assert.throws(()=>verifiedShopierOrder(order(),'other-order',{email:'parent@example.com'},settings));
  assert.throws(()=>verifiedShopierOrder(order(),'order-1',{email:'other@example.com'},settings));
  assert.throws(()=>verifiedShopierOrder(order(),'order-1',{sha256:emailHash('other@example.com')},settings));
});
test('pending and succeeded refunds deny access; a failed refund does not erase a paid purchase',()=>{
  for(const status of ['pending','succeeded'])assert.throws(()=>verifiedShopierOrder({...order(),refunds:[{status}]},'order-1',{email:'parent@example.com'},settings));
  assert.equal(verifiedShopierOrder({...order(),refunds:[{status:'failed'}]},'order-1',{email:'parent@example.com'},settings).days,30);
});
test('wrong product, quantity, shipping, discount, currency and amount cannot grant a package',()=>{
  const variants=[{...order(),currency:'USD'},{...order(),lineItems:[{...order().lineItems[0],quantity:2}]},
    {...order(),lineItems:[{...order().lineItems[0],productId:'unknown'}]},
    {...order(),totals:{...order().totals,total:'0.01'}},{...order(),totals:{...order().totals,discount:'10.00'}},
    {...order(),totals:{...order().totals,shipping:'1.00'}},{...order(),lineItems:[{...order().lineItems[0],selection:[{id:'variant'}]}]}];
  for(const value of variants)assert.throws(()=>verifiedShopierOrder(value,'order-1',{email:'parent@example.com'},settings));
});
test('future dates and malformed money fail closed without floating point rounding',()=>{
  assert.equal(moneyKurus('299.00'),29900);assert.equal(moneyKurus('0.1'),10);
  for(const value of ['-1','1e2','0.001','299,00','NaN'])assert.throws(()=>moneyKurus(value));
  assert.throws(()=>verifiedShopierOrder({...order(),dateCreated:'2100-01-01'},'order-1',{email:'parent@example.com'},settings));
});
test('renewals extend remaining time once, and refunded grants can be removed from the calculation',()=>{
  const first={order_id:'1',activated_at:'2026-10-01T00:00:00Z',duration_days:30},second={order_id:'2',activated_at:'2026-10-10T00:00:00Z',duration_days:90};
  assert.equal(accessExpiry([second,first]),'2027-01-29T00:00:00.000Z');
  assert.equal(accessExpiry([second]),'2027-01-08T00:00:00.000Z');
  assert.throws(()=>accessExpiry([first,first]));assert.equal(accessExpiry([]),null);
  assert.equal(accessExpiry([first,{order_id:'annual',activated_at:'2026-10-02T00:00:00Z',duration_days:365}]),'2027-10-31T00:00:00.000Z');
});
test('checkout configuration accepts only exact HTTPS Shopier hosts and distinct real products',()=>{
  for(const url of ['https://shopier.com.attacker.example/30','https://shopier.com@attacker.example/30','javascript:alert(1)','http://shopier.com/30','https://shopier.com:8443/30'])assert.equal(safeShopierUrl(url),false);
  assert.equal(safeShopierUrl('https://www.shopier.com/30'),true);
  assert.equal(shopierSettingsSchema.safeParse({...settings,monthlyUrl:'https://attacker.example/30'}).success,false);
  const empty=shopierSettingsSchema.parse({});assert.equal(empty.enabled,false);assert.equal(empty.enforcePaidAccess,false);
});
test('provider reads use a fixed origin, server bearer authentication and no redirect credential forwarding',async()=>{
  const result=await shopierGet('orders','order-1',async(input,init)=>{
    assert.equal(String(input),'https://api.shopier.com/v1/orders/order-1');assert.equal(init?.redirect,'error');
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer unit-test-only');
    return new Response(JSON.stringify(order()),{status:200});
  },'unit-test-only');assert.equal((result as any).id,'order-1');
  await assert.rejects(shopierGet('orders','../secrets',async()=>{throw Error('must not fetch');},'unit-test-only'));
});
test('missing token, oversized response and provider errors cannot become fake payment confirmation',async()=>{
  await assert.rejects(shopierGet('orders','1',async()=>{throw Error('must not fetch');},''),/henüz bağlanmadı/);
  await assert.rejects(shopierGet('orders','1',async()=>new Response('x'.repeat(256001)),'unit-test-only'),/tamamlanamadı/);
  await assert.rejects(shopierGet('orders','1',async()=>new Response('private-provider-error',{status:401}),'unit-test-only'),error=>error instanceof ShopierError&&!error.message.includes('private-provider-error'));
});
test('closed sales cannot render a working or fabricated checkout link',()=>{
  const plans=SHOPIER_PLANS.map(p=>({...p,url:null}));
  const html=renderToStaticMarkup(<ShopierPackageCards plans={plans} ready={false}/>);
  assert.equal((html.match(/disabled=""/g)||[]).length,3);assert.ok(!html.includes('href='));
  const open=renderToStaticMarkup(<ShopierPackageCards plans={[{...plans[0],url:'https://www.shopier.com/30'}]} ready/>);
  assert.match(open,/rel="noopener noreferrer"/);assert.match(open,/Otomatik yenileme yok/);
});
test('real Postgres isolates the ledger, preserves activation on retry, rejects family misuse and keeps deletion tombstones', {timeout:30000},async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.jwt() to service_role;
      create table public.profiles(id uuid primary key,role text,linked_student_ids text[] default '{}',linked_parent_id text);
      grant select,update on public.profiles to service_role;
      create table public.platform_settings(id boolean primary key,settings jsonb,revision integer,updated_at timestamptz);`);
    await db.exec(await readFile('supabase/migrations/20261013150111_shopier_verified_access.sql','utf8'));
    const p='00000000-0000-4000-8000-000000000001',q='00000000-0000-4000-8000-000000000002',a='00000000-0000-4000-8000-000000000003',b='00000000-0000-4000-8000-000000000004';
    await db.query("insert into public.profiles values($1::uuid,'parent',array[$3::text,$4::text],null),($2::uuid,'parent','{}',null),($3::uuid,'student','{}',$1::text),($4::uuid,'student','{}',$1::text)",[p,q,a,b]);
    await db.query("insert into public.shopier_access_orders(order_id,parent_id,student_id,product_id,plan_id,duration_days,amount_kurus,buyer_email_sha256) values('legacy-quarter',$1,$2,'90','quarterly',90,79900,$3)",[p,a,'a'.repeat(64)]);
    await db.exec(await readFile('supabase/migrations/20261014220748_shopier_three_access_plans.sql','utf8'));
    await db.exec(await readFile('supabase/migrations/20261017232044_retire_legacy_payment_integration.sql','utf8'));
    await db.exec(await readFile('supabase/migrations/20261022181059_restore_shopier_verified_membership.sql','utf8'));
    assert.equal((await db.query<{amount_kurus:number}>("select amount_kurus from public.shopier_access_orders where order_id='legacy-quarter'")).rows[0].amount_kurus,79900);
    await db.exec("set role authenticated;select set_config('request.jwt.claims','{\"role\":\"authenticated\"}',false)");
    await assert.rejects(db.query('select * from public.shopier_access_orders'),/permission denied/);
    await assert.rejects(db.query("select public.claim_shopier_access('one',$1,$2,'30','monthly',$3)",[p,a,'a'.repeat(64)]),/permission denied/);
    await assert.rejects(db.query("select public.claim_shopier_access_v2('annual',$1,$2,'365','annual',$3,149900)",[p,a,'a'.repeat(64)]),/permission denied/);
    await db.exec("reset role;set role service_role;select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)");
    const claim=(parent:string,student:string,id='one')=>db.query<{receipt:any}>("select public.claim_shopier_access_v2($1,$2,$3,'30','monthly',$4,29900) as receipt",[id,parent,student,'a'.repeat(64)]);
    const first=(await claim(p,a)).rows[0].receipt;
    assert.equal((await claim(p,a)).rows[0].receipt.activated_at,first.activated_at);
    assert.equal((await db.query<{n:number}>('select count(*) as n from public.shopier_access_orders')).rows[0].n,2);
    const claimV2=(id:string,plan:string,amount:number,student=a)=>db.query<{receipt:any}>("select public.claim_shopier_access_v2($1,$2,$3,$4,$5,$6,$7) as receipt",[id,p,student,plan,plan,'a'.repeat(64),amount]);
    for(const plan of SHOPIER_PLANS){
      const row=(await claimV2('v2-'+plan.id,plan.id,plan.amountKurus)).rows[0].receipt;
      assert.equal(row.duration_days,plan.days);assert.equal(row.amount_kurus,plan.amountKurus);
      assert.equal((await claimV2('v2-'+plan.id,plan.id,plan.amountKurus)).rows[0].receipt.activated_at,row.activated_at);
      await assert.rejects(claimV2('v2-'+plan.id,plan.id,plan.amountKurus,b),/already assigned/);
    }
    await assert.rejects(claimV2('underpaid','annual',29900),/amount mismatch/);
    await assert.rejects(claimV2('old-price-new-claim','quarterly',79900),/amount mismatch/);
    await assert.rejects(claimV2('unknown-plan','fake',149900),/Invalid verified/);
    await db.query('update public.profiles set linked_student_ids=null where id=$1',[p]);
    await assert.rejects(claim(p,b,'null-parent-list'),/Family ownership/);
    await db.query('update public.profiles set linked_student_ids=array[$1::text,$2::text] where id=$3',[a,b,p]);
    await assert.rejects(claim(p,b),/already assigned/);await assert.rejects(claim(q,a,'two'),/Family ownership/);
    await db.exec('reset role');await db.query('delete from public.profiles where id=$1',[p]);
    assert.equal((await db.query<{parent_id:string|null}>('select parent_id from public.shopier_access_orders')).rows[0].parent_id,null);
    await db.query('update public.profiles set linked_parent_id=$1 where id=$2',[q,a]);await db.query('update public.profiles set linked_student_ids=array[$1] where id=$2',[a,q]);
    await db.exec("set role service_role;select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)");
    await assert.rejects(claim(q,a),/already assigned/);
  } finally {await db.close();}
});

test('sales activation verifies digital product, inventory, exact URL and price against Shopier',async()=>{
  const oldFetch=globalThis.fetch,oldToken=process.env.SHOPIER_ACCESS_TOKEN;
  try {
    process.env.SHOPIER_ACCESS_TOKEN='unit-test-only';
    let changed:Record<string,unknown>={};
    globalThis.fetch=async input=>{const id=String(input).split('/').pop();return Response.json({id,type:'digital',stockStatus:'inStock',variants:[],options:[],url:`https://www.shopier.com/${id}`,priceData:{currency:'TRY',price:id==='30'?'299.00':id==='90'?'699.00':'1499.00',discount:false,shippingPrice:'0.00'},...changed});};
    await verifyShopierProducts(settings);
    for(const patch of [{type:'physical'},{stockStatus:'outOfStock'},{url:'https://attacker.example/30'},{variants:[{id:'x'}]},{priceData:{currency:'TRY',price:'0.00',discount:false,shippingPrice:'0.00'}}]){
      changed=patch;await assert.rejects(verifyShopierProducts(settings),ShopierError);
    }
  } finally {globalThis.fetch=oldFetch;if(oldToken===undefined)delete process.env.SHOPIER_ACCESS_TOKEN;else process.env.SHOPIER_ACCESS_TOKEN=oldToken;}
});


test('a verified membership survives the other provider outage; an outage never grants free access',()=>{
  const active={active:true,expiresAt:'2027-01-01T00:00:00Z'};
  const inactive={active:false,expiresAt:null};
  const ok=(value:typeof active|typeof inactive)=>({status:'fulfilled' as const,value});
  const failed={status:'rejected' as const,reason:new Error('provider unavailable')};
  assert.deepEqual(resolvedMembershipAccess([ok(active),failed]),active);
  assert.deepEqual(resolvedMembershipAccess([failed,ok(active)]),active);
  assert.deepEqual(resolvedMembershipAccess([ok(inactive),ok(inactive)]),inactive);
  assert.throws(()=>resolvedMembershipAccess([ok(inactive),failed]),/provider unavailable/);
});

test('public web membership explains one-time payments and hides unverified checkout links',()=>{
  const html=shopierMembershipPageHtml({brand:'<script>bad</script>',ready:false,plans:SHOPIER_PLANS.map(p=>({...p,url:null}))});
  assert.ok(!html.includes('<script>bad</script>'));
  assert.match(html,/&lt;script&gt;bad/);
  assert.match(html,/otomatik yenileme yok/i);
  assert.match(html,/Sipariş numaranızı/);
  assert.ok(!html.includes('https:\/\/www.shopier.com\//'));
});


test('authenticated annual checkout accepts only provider proof, writes the exact v2 receipt and returns 365-day access',async()=>{
  const originalFetch=globalThis.fetch,priorUrl=process.env.SUPABASE_URL,priorKey=process.env.SUPABASE_SERVICE_ROLE_KEY,priorToken=process.env.SHOPIER_ACCESS_TOKEN;
  const envNames=['SHOPIER_ENABLED','SHOPIER_MONTHLY_PRODUCT_ID','SHOPIER_MONTHLY_URL','SHOPIER_QUARTERLY_PRODUCT_ID','SHOPIER_QUARTERLY_URL','SHOPIER_ANNUAL_PRODUCT_ID','SHOPIER_ANNUAL_URL'];
  const priorEnv=Object.fromEntries(envNames.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{SHOPIER_ENABLED:'true',SHOPIER_MONTHLY_PRODUCT_ID:'30',SHOPIER_MONTHLY_URL:'https://www.shopier.com/30',SHOPIER_QUARTERLY_PRODUCT_ID:'90',SHOPIER_QUARTERLY_URL:'https://www.shopier.com/90',SHOPIER_ANNUAL_PRODUCT_ID:'365',SHOPIER_ANNUAL_URL:'https://www.shopier.com/365'});
  process.env.SUPABASE_URL='https://shopier-api-fixture.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='isolated-fixture';process.env.SHOPIER_ACCESS_TOKEN='isolated-provider';
  const parent='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222';
  const platform=defaultPlatformSettings();
  Object.assign(platform.business,{legalName:'Fixture seller',address:'Fixture address',contactEmail:'parent@example.com',legalBases:'Fixture purpose',retention:'Fixture retention',transfers:'Fixture transfers'});
  Object.assign(platform.release,{emailTested:true,restoreTested:true,familyPilotTested:true,monitoringTested:true});
  const token=['fixture',Buffer.from(JSON.stringify({session_id:'99999999-9999-4999-8999-999999999999',aal:'aal1'})).toString('base64url'),'fixture'].join('.');
  let receipts:any[]=[],claims=0,price='1499.00',buyer='parent@example.com',refunded=false;
  globalThis.fetch=(async(input,init)=>{
    const req=new Request(input as RequestInfo,init),u=new URL(req.url);let value:unknown;
    if(u.hostname==='api.shopier.com'){
      assert.equal(req.headers.get('authorization'),'Bearer isolated-provider');
      if(u.pathname.startsWith('/v1/products/')) {
        const id=u.pathname.split('/').pop();return Response.json({id,type:'digital',stockStatus:'inStock',variants:[],options:[],url:'https://www.shopier.com/'+id,priceData:{currency:'TRY',discount:false,shippingPrice:'0.00',price:id==='30'?'299.00':id==='90'?'699.00':'1499.00'}});
      }
      assert.equal(u.pathname,'/v1/orders/order-1');
      value={...order(),refunds:refunded?[{status:'pending'}]:[],shippingInfo:{email:buyer},totals:{...order().totals,subtotal:price,total:price},lineItems:[{...order().lineItems[0],productId:'365',price,total:price}]};
    }else if(u.hostname!=='shopier-api-fixture.invalid')return originalFetch(input,init);
    else if(u.pathname==='/auth/v1/user')value={id:parent,email:'parent@example.com',email_confirmed_at:new Date().toISOString(),app_metadata:{role:'parent'}};
    else if(u.pathname==='/rest/v1/rpc/is_user_session_active'||u.pathname==='/rest/v1/rpc/consume_api_limit')value=true;
    else if(u.pathname==='/rest/v1/platform_settings')value={settings:platform,revision:1,updated_at:new Date().toISOString()};
    else if(u.pathname==='/rest/v1/profiles'){
      const row=u.searchParams.get('id')===`eq.${student}`?{id:student,role:'student',linked_parent_id:parent}:{id:parent,role:'parent',linked_student_ids:[student]};
      value=req.headers.get('accept')?.includes('vnd.pgrst.object')?row:[row];
    }else if(u.pathname==='/rest/v1/rpc/claim_shopier_access_v2'){
      const body=await req.json();assert.deepEqual(body,{p_order:'order-1',p_parent:parent,p_student:student,p_product:'365',p_plan:'annual',p_buyer_hash:emailHash('parent@example.com'),p_amount:149900});claims++;
      const row=receipts[0]||{order_id:'order-1',parent_id:parent,student_id:student,product_id:'365',plan_id:'annual',duration_days:365,amount_kurus:149900,buyer_email_sha256:body.p_buyer_hash,activated_at:new Date().toISOString()};
      receipts=[row];value=row;
    }else if(u.pathname==='/rest/v1/shopier_access_orders')value=receipts;
    else throw Error(`Unexpected checkout fixture request: ${req.method} ${u.pathname}`);
    return Response.json(value);
  }) as typeof fetch;
  const app=express();app.use(express.json());app.use('/api',shopierRoutes);app.use((err:any,_req:any,res:any,_next:any)=>res.status(500).json({error:err.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const claim=async(body:object,authenticated=true)=>{
    const res=await originalFetch(origin+'/api/parent/shopier/claim',{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
    return {status:res.status,body:await res.json() as any};
  };
  try{
    assert.equal((await claim({orderId:'order-1',studentId:student},false)).status,401);
    assert.equal((await claim({orderId:'order-1',studentId:student,amountKurus:1,days:365})).status,400);assert.equal(claims,0);
    buyer='other@example.com';assert.equal((await claim({orderId:'order-1',studentId:student})).status,403);assert.equal(claims,0);
    buyer='parent@example.com';price='1498.99';assert.equal((await claim({orderId:'order-1',studentId:student})).status,422);assert.equal(claims,0);
    price='1499.00';const first=await claim({orderId:'order-1',studentId:student});assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(first.body.access.active,true);
    assert.equal(Date.parse(first.body.access.expiresAt)-Date.parse(receipts[0].activated_at),365*86400_000);
    const retry=await claim({orderId:'order-1',studentId:student});assert.equal(retry.status,200);assert.equal(retry.body.access.expiresAt,first.body.access.expiresAt);assert.equal(receipts.length,1);
    const access=async()=>{const r=await originalFetch(origin+'/api/parent/shopier/access?studentId='+student,{headers:{Authorization:`Bearer ${token}`}});assert.equal(r.status,200);return r.json() as Promise<{ready:boolean;access:{active:boolean}}>;};
    process.env.SHOPIER_ENABLED='false';assert.equal((await access()).access.active,true);
    assert.equal((await claim({orderId:'order-1',studentId:student})).status,503);
    refunded=true;assert.equal((await access()).access.active,false);
  }finally{
    await new Promise<void>(resolve=>server.close(()=>resolve()));globalThis.fetch=originalFetch;
    for(const [key,value]of Object.entries({SUPABASE_URL:priorUrl,SUPABASE_SERVICE_ROLE_KEY:priorKey,SHOPIER_ACCESS_TOKEN:priorToken,...priorEnv})){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});
