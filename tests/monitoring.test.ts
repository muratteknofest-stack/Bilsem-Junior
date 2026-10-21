import test from 'node:test';import assert from 'node:assert/strict';
import {monitorSite,monitorSummary} from '../scripts/monitor-site.mjs';
test('monitor reports every route and turns a database failure into a failed run without response data',async()=>{
 const fake:typeof fetch=async(input)=>{const url=new URL(String(input)),body=url.pathname==='/api/health'?JSON.stringify({status:'ok',database:'ready',projectRef:'vtcsoqohkiagbwatlabk'}):url.pathname==='/api/public/platform'?JSON.stringify({registrationOpen:true,policyVersion:'2026-10-11.4'}):'<html>fixture</html>';return new Response(body,{status:200,headers:{'x-content-type-options':'nosniff','cache-control':'no-store'}});};
 const good=await monitorSite(fake);assert.equal(good.ok,true);assert.equal(good.checks.length,4);
 const broken:typeof fetch=async(input,init)=>new URL(String(input)).pathname==='/api/health'?new Response('{"status":"unavailable","customer":"must-not-log"}',{status:503}):fake(input,init);
 const bad=await monitorSite(broken);assert.equal(bad.ok,false);assert.equal(bad.checks.length,4);assert.match(monitorSummary(bad),/FAILURE/);assert.ok(!JSON.stringify(bad).includes('must-not-log'));
});
