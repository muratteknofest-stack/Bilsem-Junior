import test from 'node:test';import assert from 'node:assert/strict';
import {monitorSite,monitorSummary} from '../scripts/monitor-site.mjs';
import {publicPolicy,policyHtml} from '../server/platform-policy';
import {defaultPlatformSettings} from '../src/lib/platform-settings';
function healthy(sales=false,registration=false):typeof fetch {return async input=>{const path=new URL(String(input)).pathname;
 const info=path.startsWith('/bilgi/')?publicPolicy(path.split('/').at(-1)!,defaultPlatformSettings()):undefined;
 const body=path==='/api/health'?JSON.stringify({status:'ok',database:'ready',projectRef:'vtcsoqohkiagbwatlabk'}):path==='/api/public/platform'?JSON.stringify({registrationOpen:registration,policyVersion:'2026-10-28.4'}):path==='/api/public/membership'?JSON.stringify({ready:sales,plans:[{},{},{}]}):info?policyHtml(info):'<html>fixture</html>';
 return new Response(body,{status:['/api/account/export','/api/admin/platform-settings'].includes(path)?401:200,headers:{'x-content-type-options':'nosniff','cache-control':'no-store'}});
};}
test('monitor checks public/legal/sales and private boundaries without exposing response bodies',async()=>{
 const good=await monitorSite(healthy(),{expectedPaidSales:false,expectedRegistrationOpen:false});assert.equal(good.ok,true);assert.equal(good.checks.length,15);
 const broken:typeof fetch=async(input,init)=>new URL(String(input)).pathname==='/api/health'?new Response('{"status":"unavailable","customer":"must-not-log"}',{status:503}):healthy()(input,init);
 const bad=await monitorSite(broken);assert.equal(bad.ok,false);assert.equal(bad.checks.length,15);assert.match(monitorSummary(bad),/FAILURE/);assert.ok(!JSON.stringify(bad).includes('must-not-log'));
 const missingLesson:typeof fetch=async(input,init)=>new URL(String(input)).pathname==='/konu-anlatimlari'?new Response('Not found',{status:404}):healthy()(input,init);
 assert.equal((await monitorSite(missingLesson)).ok,false);
});
test('a broken password-recovery entry point fails the monitor even when the rest of the site is up',async()=>{
 const missingReset:typeof fetch=async(input,init)=>new URL(String(input)).pathname==='/reset-password'?new Response('Not found',{status:404}):healthy()(input,init);
 const report=await monitorSite(missingReset);
 assert.equal(report.ok,false);
 assert.equal(report.checks.find(row=>row.path==='/reset-password')?.ok,false);
});

test('monitor detects unexpected sales reopening and anonymous account exposure',async()=>{
 assert.equal((await monitorSite(healthy(true),{expectedPaidSales:false})).ok,false);
 assert.equal((await monitorSite(healthy(false,true),{expectedRegistrationOpen:false})).ok,false);
 const exposed:typeof fetch=async(input,init)=>new URL(String(input)).pathname==='/api/account/export'?new Response('private-user-fixture',{headers:{'x-content-type-options':'nosniff','cache-control':'no-store'}}):healthy()(input,init);
 const report=await monitorSite(exposed);assert.equal(report.ok,false);assert.ok(!JSON.stringify(report).includes('private-user-fixture'));
});

test('a deletion page replaced by a successful SPA response or stale public cache triggers a failure',async()=>{
 for(const stale of [false,true]){
  const wrong:typeof fetch=async(input,init)=>{
   if(new URL(String(input)).pathname!=='/bilgi/hesap-ve-veri-silme')return healthy()(input,init);
   if(!stale)return new Response('<html>customer-do-not-log<div id="root"></div></html>',{headers:{'x-content-type-options':'nosniff','cache-control':'no-store'}});
   const response=await healthy()(input,init);response.headers.set('cache-control','public, max-age=3600');return response;
  };
  const report=await monitorSite(wrong);assert.equal(report.ok,false);
  assert.equal(report.checks.find(row=>row.path==='/bilgi/hesap-ve-veri-silme')?.ok,false);
  assert.ok(!JSON.stringify(report).includes('customer-do-not-log'));
 }
});
