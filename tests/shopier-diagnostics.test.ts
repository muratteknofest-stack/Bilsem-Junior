import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectShopierProducts, inspectShopierPackageCandidates } from '../server/shopier-diagnostics';
import { SHOPIER_PLANS, shopierProduct, shopierSettingsSchema } from '../src/lib/shopier-config';

const settings = shopierSettingsSchema.parse({ monthlyProductId:'30', quarterlyProductId:'90', annualProductId:'365',
  monthlyUrl:'https://www.shopier.com/30',quarterlyUrl:'https://www.shopier.com/90',annualUrl:'https://www.shopier.com/365' });
test('staged products are readable without enabling sales; diagnostics never return provider or token data', async () => {
  const secret = 'private-test-token'; let calls = 0;
  const fetcher: typeof fetch = async (input, init) => {
    const plan = SHOPIER_PLANS[calls++], product = shopierProduct(settings, plan.id);
    assert.equal(String(input), 'https://api.shopier.com/v1/products/' + product.id);
    assert.equal(init?.redirect, 'error');
    assert.equal((init?.headers as Record<string,string>).Authorization, 'Bearer ' + secret);
    return Response.json({id:product.id,url:product.url,type:'digital',stockStatus:'outOfStock',
      priceData:{currency:'TRY',price:(plan.amountKurus/100).toFixed(2)},privateData:secret});
  };
  const report = await inspectShopierProducts(settings, fetcher, secret);
  assert.equal(calls,3); assert.equal(settings.enabled,false);
  for (const p of report.products) assert.deepEqual(p,{plan:p.plan,readable:true,idMatches:true,priceMatches:true,digital:true,urlMatches:true,inStock:false});
  assert.equal(JSON.stringify(report).includes(secret),false);
});
test('provider failures and malformed prices cannot create successful results or disclose their bodies', async () => {
  let calls=0;
  const fetcher: typeof fetch=async()=> ++calls===1 ? new Response('private provider details',{status:403})
    : Response.json({id:'wrong',type:'physical',url:'https://invalid.example',priceData:{currency:'TRY',price:'0.001'}});
  const report=await inspectShopierProducts(settings,fetcher,'private-test-token');
  assert.deepEqual(report.products[0],{plan:'monthly',readable:false,httpStatus:403});
  assert.equal(report.products[1].priceMatches,false);
  assert.equal(JSON.stringify(report).includes('private'),false);
  assert.deepEqual(await inspectShopierProducts(settings,fetcher,''),{configured:false,products:[]});
  assert.equal(calls,3);
});
test('only fixed network codes are reported; request details and arbitrary exception strings remain private', async () => {
  let calls=0;
  const fetcher: typeof fetch=async()=>{ const error=new Error('private credentials or URL');
    Object.assign(error,{cause:{code:++calls===1?'ENOTFOUND':'private-unknown-code'}}); throw error; };
  const report=await inspectShopierProducts(settings,fetcher,'private-test-token');
  assert.deepEqual(report.products[0],{plan:'monthly',readable:false,networkCode:'ENOTFOUND'});
  assert.deepEqual(report.products[1],{plan:'quarterly',readable:false});
  assert.equal(JSON.stringify(report).includes('private'),false);
});

test('account package discovery uses a bounded read-only page and emits no arbitrary provider strings', async () => {
  const secret = 'private-test-token';
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, 'https://api.shopier.com/v1/products?limit=50&page=1&customListing=false');
    assert.equal(init?.redirect, 'error');
    assert.equal((init?.headers as Record<string,string>).Authorization, 'Bearer ' + secret);
    return Response.json([
      {id:'123',url:'https://www.shopier.com/new_store/123',title:'ZekaPark Aylık Paket',type:'digital',stockStatus:'inStock',priceData:{currency:'TRY',price:'299.00',discount:false,shippingPrice:'0.00'},variants:[],options:[],privateData:secret},
      {id:'124',url:'https://www.shopier.com/124',title:'ZekaPark 3 Aylık Paket',type:'physical',stockStatus:'outOfStock',priceData:{currency:'TRY',price:'699.00'},privateData:secret},
      {id:'125',url:'https://evil.example/125',title:secret,priceData:{currency:'TRY',price:'1499.00'}},
      {id:'126',url:'https://www.shopier.com/126?secret='+secret,priceData:{currency:'TRY',price:'1499.00'}},
      {id:secret,url:'https://www.shopier.com/'+secret,priceData:{currency:'TRY',price:'1499.00'}},
    ]);
  };
  const report = await inspectShopierPackageCandidates(fetcher,secret);
  assert.equal(report.readable,true); assert.equal(report.scanned,5); assert.equal(report.candidates?.length,2);
  assert.equal(report.candidates?.[0].titleMatchesPlan,true); assert.equal(report.candidates?.[1].titleMatchesPlan,true);
  assert.equal(report.candidates?.[1].digital,false); assert.equal(report.candidates?.[1].inStock,false);
  assert.equal(JSON.stringify(report).includes(secret),false);
});

test('package discovery classifies status without exposing errors and rejects oversized or invalid payloads', async () => {
  assert.deepEqual(await inspectShopierPackageCandidates(async()=>new Response('private error',{status:403,headers:{'content-type':'text/html','cf-mitigated':'challenge'}}),'test'),
    {configured:true,readable:false,httpStatus:403,responseType:'html',challenge:true});
  const oversized=await inspectShopierPackageCandidates(async()=>Response.json(['x'.repeat(256001)]),'test');
  assert.equal(oversized.oversized,true);
  const invalid=await inspectShopierPackageCandidates(async()=>Response.json({privateData:'private error'}),'test');
  assert.equal(invalid.invalidResponse,true); assert.equal(JSON.stringify(invalid).includes('private'),false);
  assert.deepEqual(await inspectShopierPackageCandidates(async()=>{throw new Error('private error');},'test'),{configured:true,readable:false});
  assert.deepEqual(await inspectShopierPackageCandidates(undefined,''),{configured:false});
});

import { inspectShopierTokenMetadata } from '../server/shopier-diagnostics';

test('inspectShopierTokenMetadata extracts non-secret merchant and scope readiness without leaking credentials', () => {
  assert.deepEqual(inspectShopierTokenMetadata(''), { configured: false });
  assert.deepEqual(inspectShopierTokenMetadata('not-a-jwt'), { configured: true, validJwtFormat: false });

  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'RS256' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 3073249,
      jti: 'sensitive-token-id-must-not-appear',
      exp: 1950052244,
      scopes: ['orders:read', 'products:read', 'shop:read']
    })
  ).toString('base64url');
  const syntheticJwt = `${header}.${payload}.signature`;
  const meta = inspectShopierTokenMetadata(syntheticJwt, 1792267484 * 1000);

  assert.equal(meta.configured, true);
  assert.equal(meta.validJwtFormat, true);
  assert.equal(meta.merchantId, '3073249');
  assert.equal(meta.hasOrdersRead, true);
  assert.equal(meta.hasProductsRead, true);
  assert.equal(meta.scopesCount, 3);
  assert.equal(meta.expired, false);
  assert.ok(!JSON.stringify(meta).includes('sensitive-token-id-must-not-appear'));
});
