import test from 'node:test';import assert from 'node:assert/strict';
import {monitorSite,monitorSummary} from '../scripts/monitor-site.mjs';
function healthy(sales=false):typeof fetch {return async input=>{const path=new URL(String(input)).pathname;
 const body=path==='/api/health'?JSON.stringify({status:'ok',database:'ready',projectRef:'vtcsoqohkiagbwatlabk'}):path==='/api/public/platform'?JSON.stringify({registrationOpen:false,policyVersion:'2026-10-11.4'}):path==='/api/public/membership'?JSON.stringify({ready:sales,plans:[{},{},{}]}):'<html>fixture</html>';
 return new Response(body,{status:['/api/account/export','/api/admin/platform-settings'].includes(path)?401:200,headers:{'x-content-type-options':'nosniff','cache-control':'no-store'}});
};}
test('monitor checks public/legal/sales and private boundaries without exposing response bodies',async()=>{
 const good=await monitorSite(healthy(),{expectedPaidSales:false});assert.equal(good.ok,true);assert.equal(good.checks.length,9);
 const broken:typeof fetch=async(input,init)=>new URL(String(input)).pathname==='/api/health'?new Response('{"status":"unavailable","customer":"must-not-log"}',{status:503}):healthy()(input,init);
 const bad=await monitorSite(broken);assert.equal(bad.ok,false);assert.equal(bad.checks.length,9);assert.match(monitorSummary(bad),/FAILURE/);assert.ok(!JSON.stringify(bad).includes('must-not-log'));
});
test('monitor detects unexpected sales reopening and anonymous account exposure',async()=>{
 assert.equal((await monitorSite(healthy(true),{expectedPaidSales:false})).ok,false);
 const exposed:typeof fetch=async(input,init)=>new URL(String(input)).pathname==='/api/account/export'?new Response('private-user-fixture',{headers:{'x-content-type-options':'nosniff','cache-control':'no-store'}}):healthy()(input,init);
 const report=await monitorSite(exposed);assert.equal(report.ok,false);assert.ok(!JSON.stringify(report).includes('private-user-fixture'));
});
