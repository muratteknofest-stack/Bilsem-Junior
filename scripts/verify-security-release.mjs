import assert from 'node:assert/strict';
import { verifyHealthResponse } from './verify-live-release.mjs';
import { createVercelConfig } from './vercel-config.mjs';

const [site, commit, projectRef] = process.argv.slice(2);
const origin = new URL(site);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw Error('Use a canonical HTTPS origin.');
const headers = createVercelConfig(process.env).headers[0].headers;
const parseCsp = text => Object.fromEntries(text.split(';').map(item => item.trim().split(/\s+/)).filter(item => item[0]).map(([key,...values]) => [key,values.sort()]));
const fetchOptions = {redirect:'manual',signal:AbortSignal.timeout(15000)};
let count = 0;
async function checkHeaders(response, privateRoute = false) {
  for (const header of headers) {
    if (header.key === 'Content-Security-Policy') assert.deepEqual(parseCsp(response.headers.get(header.key)||''),parseCsp(header.value));
    else assert.equal(response.headers.get(header.key),header.value,header.key);
  }
  assert.equal(response.headers.get('x-powered-by'),null);
  if(privateRoute) assert.equal(response.headers.get('cache-control'),'no-store');
  count++;
}
for (const route of ['/','/blog','/bilgi/hesap-guvenligi','/bilgi/gizlilik-ve-veriler','/bilgi/kullanim-kosullari','/bilgi/iletisim-ve-destek','/api/health']) {
  const response = await fetch(new URL(route, origin), {...fetchOptions,signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,route);await checkHeaders(response,route.startsWith('/api/') || ['/bilgi/gizlilik-ve-veriler','/bilgi/kullanim-kosullari','/bilgi/iletisim-ve-destek'].includes(route));
  if(route==='/api/health') await verifyHealthResponse(response,{commit,projectRef});else await response.arrayBuffer();
}
for (const [route, extraHeaders, status] of [
  ['/api/parent/return-session',{},401],
  ['/api/parent/student-session',{},401],
  ['/api/parent/reset-student-password',{},401],
  ['/api/account/deletion-request',{},401],
  ['/api/admin/questions/save',{},401],
  ['/api/parent/return-session',{Origin:'https://attacker.example'},403],
  ['/api/parent/return-session',{Origin:origin.origin.replace('https:','http:')},403],
  ['/api/parent/return-session',{'Content-Type':'text/plain'},415],
]) {
  const response=await fetch(new URL(route,origin),{...fetchOptions,signal:AbortSignal.timeout(15000),method:'POST',headers:{'Content-Type':'application/json',...extraHeaders},body:'{}'});
  assert.equal(response.status,status,route);await checkHeaders(response,true);
  const payload=await response.json();assert.equal(typeof payload.error,'string');assert.equal(payload.access_token,undefined);assert.equal(payload.refresh_token,undefined);
}
console.log(`Live security: ${count} route/header checks passed; expected commit and Supabase project are ready.`);
