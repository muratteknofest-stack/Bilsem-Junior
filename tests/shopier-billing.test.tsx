import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { verifiedShopierOrder,accessExpiry,moneyKurus,emailHash,ShopierError } from '../server/shopier-model';
import { shopierGet,verifyShopierProducts } from '../server/shopier-client';
import { shopierSettingsSchema,safeShopierUrl,SHOPIER_PLANS } from '../src/lib/shopier-config';
import { shopierView,shopierPageHtml } from '../server/routes/shopier-routes';
import { ShopierPackageCards } from '../src/components/ShopierPackageCards';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
import { publicPolicy,policyHtml } from '../server/platform-policy';

const settings=shopierSettingsSchema.parse({enabled:true,monthlyProductId:'30',quarterlyProductId:'90',monthlyUrl:'https://www.shopier.com/30',quarterlyUrl:'https://www.shopier.com/90'});
const order=()=>({id:'order-1',status:'unfulfilled',paymentStatus:'paid',dateCreated:'2026-10-12T10:00:00+0300',currency:'TRY',
  shippingInfo:{email:'parent@example.com'},totals:{subtotal:'299.00',shipping:'0.00',discount:'0.00',total:'299.00'},
  lineItems:[{productId:'30',type:'digital',quantity:1,price:'299.00',total:'299.00'}],refunds:[] as Array<{status:string}>});

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
});
test('checkout configuration accepts only exact HTTPS Shopier hosts and distinct real products',()=>{
  for(const url of ['https://shopier.com.attacker.example/30','https://shopier.com@attacker.example/30','javascript:alert(1)','http://shopier.com/30','https://shopier.com:8443/30'])assert.equal(safeShopierUrl(url),false);
  assert.equal(safeShopierUrl('https://www.shopier.com/30'),true);
  assert.equal(shopierSettingsSchema.safeParse({...settings,monthlyUrl:'https://attacker.example/30'}).success,false);
  const empty=defaultPlatformSettings();assert.equal(empty.shopier.enabled,false);assert.equal(empty.shopier.enforcePaidAccess,false);
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
  assert.equal((html.match(/disabled=""/g)||[]).length,2);assert.ok(!html.includes('href='));
  const open=renderToStaticMarkup(<ShopierPackageCards plans={[{...plans[0],url:'https://www.shopier.com/30'}]} ready/>);
  assert.match(open,/rel="noopener noreferrer"/);assert.match(open,/Otomatik yenileme yok/);
});
test('a brand does not assert a nonexistent company or hide missing legal seller identity',()=>{
  const s=defaultPlatformSettings();s.business.brandName='Quantum tech';s.business.contactEmail='zeka.kupu.test@gmail.com';s.business.address='Quantum tech lab';
  const html=policyHtml(publicPolicy('iletisim-ve-destek',s)!);
  assert.match(html,/Marka ve iletişim/);assert.match(html,/Marka: Quantum tech/);assert.ok(!html.includes('Yasal satıcı ve veri sorumlusu'));
});
test('real Postgres isolates the ledger, preserves activation on retry, rejects family misuse and keeps deletion tombstones', {timeout:30000},async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.jwt() to service_role;
      create table public.profiles(id uuid primary key,role text,linked_student_ids text[] default '{}',linked_parent_id text);
      grant select,update on public.profiles to service_role;`);
    await db.exec(await readFile('supabase/migrations/20261013143317_shopier_verified_access.sql','utf8'));
    const p='00000000-0000-4000-8000-000000000001',q='00000000-0000-4000-8000-000000000002',a='00000000-0000-4000-8000-000000000003',b='00000000-0000-4000-8000-000000000004';
    await db.query("insert into public.profiles values($1::uuid,'parent',array[$3::text,$4::text],null),($2::uuid,'parent','{}',null),($3::uuid,'student','{}',$1::text),($4::uuid,'student','{}',$1::text)",[p,q,a,b]);
    await db.exec("set role authenticated;select set_config('request.jwt.claims','{\"role\":\"authenticated\"}',false)");
    await assert.rejects(db.query('select * from public.shopier_access_orders'),/permission denied/);
    await assert.rejects(db.query("select public.claim_shopier_access('one',$1,$2,'30','monthly',$3)",[p,a,'a'.repeat(64)]),/permission denied/);
    await db.exec("reset role;set role service_role;select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)");
    const claim=(parent:string,student:string,id='one')=>db.query<{receipt:any}>("select public.claim_shopier_access($1,$2,$3,'30','monthly',$4) as receipt",[id,parent,student,'a'.repeat(64)]);
    const first=(await claim(p,a)).rows[0].receipt;
    assert.equal((await claim(p,a)).rows[0].receipt.activated_at,first.activated_at);
    assert.equal((await db.query<{n:number}>('select count(*) as n from public.shopier_access_orders')).rows[0].n,1);
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

test('public package page escapes the brand and cannot expose checkout while sales are disabled',()=>{
  const s=defaultPlatformSettings();s.business.brandName='<script>alert(1)</script>';
  const html=shopierPageHtml(shopierView(s));
  assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/Satış henüz açılmadı/);
  assert.ok(!html.includes('https://www.shopier.com/'));assert.match(html,/width=device-width/);
});
test('sales activation verifies digital product, inventory, exact URL and price against Shopier',async()=>{
  const oldFetch=globalThis.fetch,oldToken=process.env.SHOPIER_ACCESS_TOKEN;
  try {
    process.env.SHOPIER_ACCESS_TOKEN='unit-test-only';
    let changed:Record<string,unknown>={};
    globalThis.fetch=async input=>{const id=String(input).split('/').pop();return Response.json({id,type:'digital',stockStatus:'inStock',variants:[],options:[],url:`https://www.shopier.com/${id}`,priceData:{currency:'TRY',price:id==='30'?'299.00':'799.00',discount:false,shippingPrice:'0.00'},...changed});};
    await verifyShopierProducts(settings);
    for(const patch of [{type:'physical'},{stockStatus:'outOfStock'},{url:'https://attacker.example/30'},{variants:[{id:'x'}]},{priceData:{currency:'TRY',price:'0.00',discount:false,shippingPrice:'0.00'}}]){
      changed=patch;await assert.rejects(verifyShopierProducts(settings),ShopierError);
    }
  } finally {globalThis.fetch=oldFetch;if(oldToken===undefined)delete process.env.SHOPIER_ACCESS_TOKEN;else process.env.SHOPIER_ACCESS_TOKEN=oldToken;}
});
