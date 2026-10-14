import assert from 'node:assert/strict';
import {setTimeout as pause} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';
import {verifyHealthResponse} from './verify-live-release.mjs';

export async function verifyPublicRelease(origin,fetcher=fetch){
 const checks=[['/',200],['/blog',200],['/reset-password',200],['/bilgi/gizlilik-ve-veriler',200],['/paketler',200],['/robots.txt',200],['/sitemap.xml',200],['/api/public/platform',200],['/api/public/shopier',200],['/api/account/export',401],['/api/learning/history',401],['/api/admin/platform-settings',401],['/api/admin/question-review-summary',401],['/api/admin/support-requests/55555555-5555-4555-8555-555555555555/deletion',401],['/api/release-unknown',404]];
 let registrationOpen=false,paidSalesReady=false;
 for(const [path,status] of checks){
  const response=await fetcher(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(10_000)});
  assert.equal(response.status,status,path);assert.equal(response.redirected,false,path);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff',path);
  assert.equal(response.headers.get('x-frame-options'),'DENY',path);
  if(path.startsWith('/api/'))assert.equal(response.headers.get('cache-control'),'no-store',path);
  if(path==='/api/public/platform'){
   const data=await response.json();assert.equal(typeof data.registrationOpen,'boolean');assert.equal(typeof data.policyVersion,'string');assert.ok(data.policyVersion.length);registrationOpen=data.registrationOpen;
  }else if(path==='/api/public/shopier'){
   const data=await response.json();assert.equal(typeof data.ready,'boolean');assert.equal(typeof data.enforced,'boolean');assert.ok(Array.isArray(data.plans)&&data.plans.length===2);paidSalesReady=data.ready;
  }else{
   const body=await response.text();if(path==='/')assert.match(body,/<html[^>]*lang="tr"/i);
   if(path==='/robots.txt')assert.ok(!/^Disallow:\s*\/\s*$/mi.test(body));
   if(path==='/sitemap.xml')assert.ok(body.includes(new URL('/',origin).href));
  }
 }
 const protectedPost=await fetcher(new URL('/api/parent/student-session',origin),{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',redirect:'manual',signal:AbortSignal.timeout(10_000)});
 assert.equal(protectedPost.status,401);assert.equal(protectedPost.headers.get('cache-control'),'no-store');await protectedPost.arrayBuffer();
 const hostile=await fetcher(new URL('/api/parent/student-session',origin),{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.example'},body:'{}',redirect:'manual',signal:AbortSignal.timeout(10_000)});
 assert.equal(hostile.status,403);await hostile.arrayBuffer();
 return {checks:checks.length+2,registrationOpen,paidSalesReady};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [site,commit,projectRef]=process.argv.slice(2),origin=new URL(site);
  if(origin.origin!=='https://zekapark.vercel.app'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||!/^[a-f0-9]{40}$/.test(commit||'')||!/^[a-z0-9]{20}$/.test(projectRef||''))throw Error('Invalid release target.');
  let ready=false;
  for(let attempt=0;attempt<40;attempt++){
   try{await verifyHealthResponse(await fetch(new URL('/api/health',origin),{redirect:'manual',headers:{Accept:'application/json'},signal:AbortSignal.timeout(8_000)}),{commit,projectRef});ready=true;break;}catch{}
   if(attempt<39)await pause(10_000);
  }
  if(!ready)throw Error('Production did not reach the expected commit and database.');
  const report=await verifyPublicRelease(origin);
  console.log(`Production release verified: expected commit/database; ${report.checks} public and security checks passed. Registration ${report.registrationOpen?'open':'closed'}; paid sales ${report.paidSalesReady?'ready':'disabled'}.`);
 }catch{console.error('Production release verification failed. Inspect deployment status, API health and public routes. No customer data or credentials were printed.');process.exitCode=1;}
}
