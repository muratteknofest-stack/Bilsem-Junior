import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectShopierProducts } from '../server/shopier-diagnostics';
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
