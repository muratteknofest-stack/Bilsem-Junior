import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayBillingFlow, initialPlayBillingState, canBuyPlay, type PlayBillingState, type PlayConfig, type PlayStore } from '../src/lib/google-play-flow';
import { PlayBillingPanel } from '../src/components/PlayBillingPanel';
const productId='zekapark_uyelik', accountId='a'.repeat(64), profileId='b'.repeat(64), expiry='2027-01-16T12:00:00.000Z';
const access={active:true,expiresAt:expiry,autoRenewing:true};
const config=():PlayConfig=>({ready:true,enforced:true,productId,binding:{accountId,profileId},access:{active:false,expiresAt:null}});
const offers=[{basePlanId:'monthly',price:'₺299,00',period:'P1M'},{basePlanId:'quarterly',price:'₺699,00',period:'P3M'},{basePlanId:'annual',price:'₺1.499,00',period:'P1Y'}];
const purchase=(patch:Record<string,unknown>={})=>({token:'fixture-purchase-token',state:'purchased',accountId,profileId,productIds:[productId],...patch});
const deferred=<T,>()=>{let resolve!:(v:T)=>void,reject!:(e:Error)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(options:{deadlineMs?:number;native?:boolean}={}) {
  let current=true, live=config();let states:PlayBillingState[]=[],calls:string[]=[],buyCalls=0,restores=0,catalogs=0;
  let onRequest:((path:string,body:unknown,signal:AbortSignal)=>Promise<unknown>)|undefined;
  const store:PlayStore={async catalog(){catalogs++;return {offers};},async restore(){restores++;return {purchases:[]};},async purchase(){buyCalls++;return {purchases:[purchase()]};}};
  const flow=new PlayBillingFlow({studentId:'student-fixture',native:options.native??true,deadlineMs:options.deadlineMs??1000,store,isCurrent:()=>current,changed:s=>states.push(s),
    async request(path,body,signal){calls.push(path);if(onRequest)return onRequest(path,body,signal);if(path.startsWith('access?'))return structuredClone(live);if(path==='prepare')return {productId,accountId,profileId};if(path==='verify'){live={...live,access};return {access};}throw Error('Unexpected request');}});
  return {flow,store,states,calls,get buys(){return buyCalls;},get restores(){return restores;},get catalogs(){return catalogs;},get config(){return live;},set config(v){live=v;},set request(v:typeof onRequest){onRequest=v;},changeOwner(){current=false;}};
}
const render=(state:PlayBillingState)=>renderToStaticMarkup(<PlayBillingPanel state={state} onPurchase={()=>{}} onRestore={()=>{}} onRefresh={()=>{}}/>);

test('ready store shows exact Google prices and selecting a plan never initiates payment',async()=>{
 const f=fixture();await f.flow.refresh();const s=f.flow.snapshot();assert.equal(s.phase,'idle');assert.equal(canBuyPlay(s,'monthly'),true);assert.equal(f.buys,0);
 const html=render(s);assert.equal((html.match(/type="radio"/g)||[]).length,3);assert.match(html,/Google Play ile devam et/);assert.match(html,/₺299,00/);assert.match(html,/₺699,00/);assert.match(html,/₺1.499,00/);assert.match(html,/iptal edilmedikçe/);assert.match(html,/Aboneliği yönet \/ iptal et/);assert.ok(!html.includes('shopier.com'));
});
test('catalog outage does not prevent restore or manufacture prices',async()=>{
 const f=fixture();f.store.catalog=async()=>{throw Error('catalog down');};f.store.restore=async()=>({purchases:[purchase()]});
 await f.flow.refresh();assert.ok(f.calls.includes('verify'));assert.equal(f.flow.snapshot().config?.access.active,true);assert.equal(f.flow.snapshot().notice.kind,'success');assert.equal(f.flow.snapshot().offers.length,0);
 const g=fixture();g.store.catalog=async()=>{throw Error('catalog down');};await g.flow.refresh();assert.equal(g.flow.snapshot().notice.kind,'warning');assert.equal(canBuyPlay(g.flow.snapshot(),'monthly'),false);assert.ok(!render(g.flow.snapshot()).includes('₺299'));
});
test('pending payment blocks every new purchase and can complete on refresh',async()=>{
 const f=fixture();f.store.restore=async()=>({purchases:[purchase({state:'pending'})]});await f.flow.refresh();
 assert.equal(f.flow.snapshot().pending,true);assert.equal(canBuyPlay(f.flow.snapshot(),'monthly'),false);await f.flow.purchase('monthly');assert.equal(f.buys,0);assert.equal(f.calls.filter(c=>c==='prepare').length,0);assert.match(render(f.flow.snapshot()),/Bekleyen ödeme/);
 f.store.restore=async()=>({purchases:[purchase()]});await f.flow.refresh();assert.equal(f.flow.snapshot().pending,false);assert.equal(f.flow.snapshot().config?.access.active,true);
});
test('a purchase for another student blocks buying; unrelated products are ignored',async()=>{
 const f=fixture();f.store.restore=async()=>({purchases:[purchase({profileId:'c'.repeat(64)})]});await f.flow.refresh();assert.equal(f.flow.snapshot().otherStudent,true);assert.ok(!f.calls.includes('verify'));await f.flow.purchase('annual');assert.equal(f.buys,0);
 f.store.restore=async()=>({purchases:[purchase({productIds:['unrelated_product'],profileId:'c'.repeat(64)})]});await f.flow.refresh();assert.equal(f.flow.snapshot().otherStudent,false);assert.equal(canBuyPlay(f.flow.snapshot(),'monthly'),true);
});
test('owned purchase lookup failure requires a successful retry before a new charge',async()=>{
 const f=fixture();f.store.restore=async()=>{throw Error('store down');};await f.flow.refresh();assert.equal(f.flow.snapshot().offers.length,3);assert.equal(f.flow.snapshot().storeChecked,false);assert.equal(canBuyPlay(f.flow.snapshot(),'monthly'),false);await f.flow.purchase('monthly');assert.equal(f.buys,0);
 f.store.restore=async()=>({purchases:[]});await f.flow.restore();assert.equal(f.flow.snapshot().storeChecked,true);assert.equal(canBuyPlay(f.flow.snapshot(),'monthly'),true);
});
test('rapid foreground events coalesce and cannot overwrite a purchase in progress',async()=>{
 const f=fixture();await f.flow.refresh();const gate=deferred<unknown>();let buys=0;f.store.purchase=async()=>{buys++;return gate.promise;};
 const buying=f.flow.purchase('monthly');await new Promise(resolve=>setImmediate(resolve));
 const duplicate=f.flow.purchase('annual');for(let i=0;i<12;i++)void f.flow.refresh();assert.equal(buys,1);assert.equal(f.flow.snapshot().phase,'opening');
 gate.resolve({purchases:[purchase()]});await Promise.all([buying,duplicate]);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(buys,1);assert.equal(f.calls.filter(c=>c==='prepare').length,1);assert.equal(f.restores,2);assert.equal(f.flow.snapshot().phase,'idle');
});
test('canceling the Google sheet is recoverable; ambiguous store failure requires restoration',async()=>{
 const f=fixture();await f.flow.refresh();f.store.purchase=async()=>({cancelled:true,purchases:[]});await f.flow.purchase('monthly');assert.equal(f.flow.snapshot().notice.kind,'info');assert.equal(f.flow.snapshot().pending,false);assert.equal(canBuyPlay(f.flow.snapshot(),'monthly'),true);
 f.store.purchase=async()=>{throw Error('Satın alımı geri yükleyerek kontrol edin.');};await f.flow.purchase('monthly');assert.equal(f.flow.snapshot().phase,'idle');assert.equal(f.flow.snapshot().storeChecked,false);assert.equal(canBuyPlay(f.flow.snapshot(),'monthly'),false);assert.match(render(f.flow.snapshot()),/role="alert"/);
});
test('failed fresh access never presents old data as a currently verified active subscription',async()=>{
 const f=fixture();f.config={...config(),access};await f.flow.refresh();f.request=async()=>{throw Error('Bağlantı kesildi.');};await f.flow.refresh();
 assert.equal(f.flow.snapshot().fresh,false);const html=render(f.flow.snapshot());assert.match(html,/Son doğrulanan erişim/);assert.ok(!html.includes('Aboneliğiniz aktif'));assert.match(html,/Yenile/);assert.equal(canBuyPlay(f.flow.snapshot(),'monthly'),false);
});
test('an expired restored token cannot preserve access that the server just revoked',async()=>{
 const f=fixture();f.config={...config(),access};let reads=0;f.store.restore=async()=>({purchases:[purchase()]});
 f.request=async path=>{if(path.startsWith('access?'))return {...config(),access:++reads===1?access:{active:false,expiresAt:expiry}};if(path==='verify')return {access:{active:false,expiresAt:expiry}};throw Error('unexpected');};
 await f.flow.refresh();assert.equal(f.flow.snapshot().config?.access.active,false);assert.ok(!render(f.flow.snapshot()).includes('Aboneliğiniz aktif'));assert.equal(f.flow.snapshot().offers.length,3);
});
test('disposed or changed owner cannot verify late native results or update the new panel',async()=>{
 for(const changeOwner of [false,true]){
  const f=fixture();const gate=deferred<unknown>();f.store.restore=async()=>gate.promise;const refreshing=f.flow.refresh();await new Promise(resolve=>setImmediate(resolve));const before=f.states.length;
  if(changeOwner)f.changeOwner();else f.flow.dispose();gate.resolve({purchases:[purchase()]});await refreshing;
  assert.equal(f.states.length,before);assert.ok(!f.calls.includes('verify'));
 }
});
test('disposal aborts the in-flight HTTP request and a timeout exposes retry without stale success',async()=>{
 const f=fixture({deadlineMs:15});const gate=deferred<unknown>();let signal:AbortSignal|undefined;f.request=async(_p,_b,s)=>{signal=s;return gate.promise;};const refreshing=f.flow.refresh();await new Promise(resolve=>setImmediate(resolve));f.flow.dispose();assert.equal(signal?.aborted,true);gate.resolve(config());await refreshing;assert.equal(f.flow.snapshot().config,null);
 const g=fixture({deadlineMs:10});g.request=async()=>await new Promise(()=>{});await g.flow.refresh();assert.equal(g.flow.snapshot().phase,'idle');assert.equal(g.flow.snapshot().notice.kind,'error');assert.equal(g.flow.snapshot().fresh,false);g.request=undefined;await g.flow.refresh();assert.equal(canBuyPlay(g.flow.snapshot(),'monthly'),true);
});
test('malformed responses, mismatched prepared identity and disabled sales cannot launch payment',async()=>{
 const f=fixture();f.config={...config(),ready:false};await f.flow.refresh();await f.flow.purchase('monthly');assert.equal(f.buys,0);
 const g=fixture();await g.flow.refresh();g.request=async path=>path==='prepare'?{productId,accountId,profileId:'c'.repeat(64)}:config();await g.flow.purchase('monthly');assert.equal(g.buys,0);assert.equal(g.flow.snapshot().notice.kind,'error');
 const h=fixture();h.request=async()=>({ready:true,paid:true});await h.flow.refresh();assert.equal(h.flow.snapshot().notice.kind,'error');assert.equal(h.flow.snapshot().config,null);assert.ok(!h.flow.snapshot().notice.text.includes('expected'));
});
test('duplicate callbacks re-read owned purchases instead of trusting callback access claims',async()=>{
 const f=fixture();let verified=0;f.store.restore=async()=>({purchases:[purchase(),purchase()]});f.request=async path=>{if(path.startsWith('access?'))return {...config(),access};if(path==='verify'){verified++;return {access};}throw Error('unexpected');};await f.flow.refresh();assert.equal(verified,1);
 f.store.restore=async()=>({purchases:[]});f.flow.purchasesUpdated({paid:true,access:{active:true}});await new Promise(resolve=>setImmediate(resolve));assert.equal(verified,1);
});
test('initial loading, unavailable plans and non-native previews never enable checkout',async()=>{
 const html=render(initialPlayBillingState());assert.match(html,/aria-busy="true"/);assert.match(html,/<fieldset\b[^>]*\bdisabled=""/);assert.ok(!html.includes('₺299'));
 const f=fixture({native:false});await f.flow.refresh();assert.equal(f.catalogs,0);assert.equal(f.restores,0);assert.equal(canBuyPlay(f.flow.snapshot(),'monthly'),false);assert.match(f.flow.snapshot().notice.text,/Android/);
});

test('a pending purchase after checkout blocks a second payment and malformed product identity requires recovery',async()=>{
 const f=fixture();await f.flow.refresh();f.store.purchase=async()=>({purchases:[purchase({state:'pending'})]});await f.flow.purchase('monthly');assert.equal(f.flow.snapshot().pending,true);assert.equal(canBuyPlay(f.flow.snapshot(),'annual'),false);assert.ok(!f.calls.includes('verify'));
 const g=fixture();await g.flow.refresh();g.store.purchase=async()=>({purchases:[purchase({productIds:[]})]});await g.flow.purchase('monthly');assert.equal(g.flow.snapshot().notice.kind,'error');assert.equal(g.flow.snapshot().storeChecked,false);assert.equal(canBuyPlay(g.flow.snapshot(),'monthly'),false);
});
