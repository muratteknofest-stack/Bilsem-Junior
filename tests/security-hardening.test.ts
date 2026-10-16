import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import express from 'express';
import { request as httpRequest } from 'node:http';
import { contentSecurityPolicy, browserDirectives, securityHeaders } from '../server/browser-security';
import { requestSecurity } from '../server/request-security';
import { publicBuildSettings } from '../scripts/public-build-settings';
import { createApiApp } from '../server/api-app';
import { secretKinds } from '../scripts/check-public-assets.mjs';
import { policyHtml } from '../server/platform-policy';

const publicEnv = { VITE_SUPABASE_URL: 'https://vehhvsdkifwstbjhnhao.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-only', VITE_API_BASE_URL: '' };
const jwt = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;

test('public bundle checks catch recognized private keys and privileged JWTs without flagging publishable keys', () => {
  assert.deepEqual(secretKinds('sb_publishable_fixture-safe-1234567890'), []);
  for (const key of ['sb_secret_'+ 'x'.repeat(30), 'sbp_'+ 'x'.repeat(40), 'sk-proj-'+ 'x'.repeat(30), 'AIza'+ 'x'.repeat(35), '-----BEGIN PRIVATE KEY-----']) assert.ok(secretKinds(key).length);
  const token = (role: string) => `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({role})).toString('base64url')}.fixtureSignature`;
  assert.deepEqual(secretKinds(token('anon')), []);
  assert.deepEqual(secretKinds(token('service_role')), ['private JWT']);
  assert.deepEqual(secretKinds(token('authenticated')), ['private JWT']);
});

test('public settings export exact names and reject service-role, secret keys and credential-bearing URLs without printing them', () => {
  const marker = 'fixture-secret-never-export';
  const settings = publicBuildSettings({ ...publicEnv, VITE_SUPABASE_URL_SECRET: marker, VITE_API_BASE_URL_TOKEN: marker, VITE_GEMINI_API_KEY: marker, SUPABASE_SERVICE_ROLE_KEY: marker }, true, true, 'https://zekapark.vercel.app');
  assert.equal(Object.keys(settings).length, 4);
  assert.ok(!JSON.stringify(settings).includes(marker));
  assert.equal(settings.VITE_API_BASE_URL, '');
  for (const key of ['sb_secret_'+marker, jwt('service_role'), marker, jwt('admin')]) {
    assert.throws(() => publicBuildSettings({ ...publicEnv, VITE_SUPABASE_PUBLISHABLE_KEY: key }, true, true, ''), error => error instanceof Error && !error.message.includes(key));
  }
  assert.equal(publicBuildSettings({ ...publicEnv, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }, true, true, '').VITE_SUPABASE_PUBLISHABLE_KEY, jwt('anon'));
  for (const value of ['https://'+marker+'@example.org', 'https://example.org?token='+marker, 'http://example.org', 'javascript:alert(1)']) {
    assert.throws(() => publicBuildSettings({ ...publicEnv, VITE_SUPABASE_URL: value }, true, true, ''), error => error instanceof Error && !error.message.includes(marker));
  }
  assert.equal(publicBuildSettings({ ...publicEnv, VITE_API_BASE_URL: 'http://localhost:3000' }, false, false, '').VITE_API_BASE_URL, 'http://localhost:3000');
  assert.throws(() => publicBuildSettings({ ...publicEnv, VITE_API_BASE_URL: 'http://localhost:3000' }, true, false, ''));
  const vite = fs.readFileSync('vite.config.ts', 'utf8');
  assert.match(vite, /envPrefix: \[\]/);
  assert.match(vite, /const env = loadEnv\(mode, process.cwd\(\), 'VITE_'\)/);
  assert.match(vite, /publicBuildSettings\(env,/);
});

test('static and API policies agree; only style attributes permit inline content and network access is project-specific', () => {
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const headers = Object.fromEntries(vercel.headers[0].headers.map((header: any) => [header.key, header.value]));
  assert.equal(headers['Content-Security-Policy'], contentSecurityPolicy);
  for (const [name, expected] of Object.entries(securityHeaders)) assert.equal(headers[name], expected, name);
  assert.deepEqual(browserDirectives.scriptSrc, ["'self'"]);
  assert.deepEqual(browserDirectives.scriptSrcAttr, ["'none'"]);
  assert.ok(!browserDirectives.styleSrc.includes("'unsafe-inline'"));
  assert.ok(!browserDirectives.styleSrcElem.includes("'unsafe-inline'"));
  assert.deepEqual(browserDirectives.styleSrcAttr, ["'unsafe-inline'"]);
  assert.ok(!contentSecurityPolicy.includes('unsafe-eval') && !contentSecurityPolicy.includes('*.'));
  assert.ok(browserDirectives.frameSrc.includes('https://wordwall.net'));
  assert.ok(browserDirectives.connectSrc.includes('wss://vehhvsdkifwstbjhnhao.supabase.co'));
  assert.ok(!JSON.stringify(vercel).includes('service_role'));
});

test('request origins match scheme, host and port; only explicitly allowed cross-origin JSON clients receive CORS access', async () => {
  const app = express(); app.use(requestSecurity('https://trusted.example,https://bad.example/path,*'));
  app.use(express.json({ limit: '256kb' })); app.all('/test', (_req,res) => res.json({ accepted: true }));
  const server = app.listen(0,'127.0.0.1'); await new Promise<void>(resolve => server.on('listening',resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const origin of [base.replace('http:', 'https:'),base.replace(String(address.port),String(address.port+1)),'https://attacker.example','null','https://trusted.example/path','https://user@trusted.example']) {
      const r = await fetch(base+'/test',{headers:{Origin:origin}}); assert.equal(r.status,403,origin); assert.equal(r.headers.get('access-control-allow-origin'),null); assert.equal(r.headers.get('cache-control'),'no-store'); await r.arrayBuffer();
    }
    for (const origin of [base,'https://trusted.example']) {
      const r = await fetch(base+'/test',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}); assert.equal(r.status,200,origin); assert.equal(r.headers.get('access-control-allow-origin'),origin); assert.equal(r.headers.get('access-control-allow-credentials'),null); await r.arrayBuffer();
    }
    const preflight = await fetch(base+'/test',{method:'OPTIONS',headers:{Origin:'https://trusted.example','Access-Control-Request-Method':'POST'}}); assert.equal(preflight.status,204);
    const cross = await fetch(base+'/test',{headers:{'Sec-Fetch-Site':'cross-site'}}); assert.equal(cross.status,403); await cross.arrayBuffer();
    for (const contentType of ['text/plain','application/x-www-form-urlencoded','multipart/form-data']) {
      const r = await fetch(base+'/test',{method:'POST',headers:{'Content-Type':contentType},body:'{}'}); assert.equal(r.status,415); await r.arrayBuffer();
    }
    const native = await fetch(base+'/test'); assert.equal(native.status,200); await native.arrayBuffer();
  } finally { await new Promise<void>(resolve => server.close(()=>resolve())); }
});

test('rejected API requests retain all security headers and malformed/oversize input never leaks submitted data', async () => {
  const saved = process.env.NODE_ENV; process.env.NODE_ENV='production';
  const server = createApiApp().listen(0,'127.0.0.1'); await new Promise<void>(resolve => server.on('listening',resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const [headers,body,expected] of [
      [{Origin:'https://attacker.example','Content-Type':'application/json'},'{}',403],
      [{'Content-Type':'text/plain'},'{}',415],
      [{'Content-Type':'application/json'},'{"fixture-secret":"hidden"',400],
      [{'Content-Type':'application/json'},JSON.stringify({secret:'x'.repeat(270000)}),413],
      [{'Content-Type':'application/json'},'{}',401],
    ] as const) {
      const r=await fetch(base+'/api/parent/return-session',{method:'POST',headers,body}); assert.equal(r.status,expected);
      for(const [name,value] of Object.entries(securityHeaders)) assert.equal(r.headers.get(name),value,name);
      assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-powered-by'),null);
      const payload=await r.json();assert.equal(typeof payload.error,'string');assert.ok(!JSON.stringify(payload).includes('fixture-secret'));assert.equal(payload.access_token,undefined);
    }
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); if(saved===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=saved; }
});

test('policyHtml uses PUBLIC_SITE_URL when configured and defaults cleanly to zekapark.vercel.app', () => {
  const info = { slug: 'test-policy', title: 'Test Başlık', description: 'Test Açıklama', sections: [] };
  const prev = process.env.PUBLIC_SITE_URL;
  try {
    delete process.env.PUBLIC_SITE_URL;
    assert.match(policyHtml(info as any), /rel="canonical" href="https:\/\/zekapark\.vercel\.app\/bilgi\/test-policy"/);
    process.env.PUBLIC_SITE_URL = 'https://custom.zekapark.com/';
    assert.match(policyHtml(info as any), /rel="canonical" href="https:\/\/custom\.zekapark\.com\/bilgi\/test-policy"/);
  } finally {
    if (prev !== undefined) process.env.PUBLIC_SITE_URL = prev;
    else delete process.env.PUBLIC_SITE_URL;
  }
});

test('external links may navigate only to allowlisted public HTML without granting cross-origin API access',async()=>{
  const app=express();app.use('/api',requestSecurity(''));
  app.use('/api',(_req,res)=>res.type('html').send('<html><h1>Public document</h1></html>'));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
  // Node fetch overwrites Sec-Fetch-Mode with "cors"; preserve actual browser
  // metadata with the HTTP transport so the navigation regression is exercised.
  const send=async(path:string,init:{method?:string;headers:Record<string,string>;body?:string})=>{
    const incoming=await new Promise<import('node:http').IncomingMessage>((resolve,reject)=>{
      const req=httpRequest(base+'/api'+path,{method:init.method||'GET',agent:false,headers:{...init.headers,...(init.body?{'Content-Length':String(Buffer.byteLength(init.body))}:{})}},resolve);req.on('error',reject);req.end(init.body);
    });
    const chunks:Buffer[]=[];for await(const chunk of incoming)chunks.push(Buffer.from(chunk));
    const headers=new Headers();for(const [name,value]of Object.entries(incoming.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);
    return new Response(Buffer.concat(chunks),{status:incoming.statusCode,headers});
  };
  const navigation={'Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document','Sec-Fetch-User':'?1',Referer:'https://chatgpt.com/'};
  const publicPaths=['/public/shopier/page','/public/shopier/page/','/public/policy/gizlilik-ve-veriler?format=html','/public/policy/kullanim-kosullari?format=html','/public/policy/iletisim-ve-destek?format=html'];
  try{
    for(const path of publicPaths)for(const method of ['GET','HEAD']){
      const r=await send(path,{method,headers:navigation});assert.equal(r.status,200,`${method} ${path}`);
      assert.equal(r.headers.get('access-control-allow-origin'),null);assert.equal(r.headers.get('cache-control'),'no-store');await r.arrayBuffer();
    }
    const blocked=[
      ...['cors','no-cors','same-origin'].map(mode=>({path:'/public/shopier/page',headers:{...navigation,'Sec-Fetch-Mode':mode,'Sec-Fetch-Dest':'empty'}})),
      ...['iframe','frame','object','embed','script','image'].map(dest=>({path:'/public/shopier/page',headers:{...navigation,'Sec-Fetch-Dest':dest}})),
      ...['/public/shopier','/public/platform','/public/policy/gizlilik-ve-veriler','/public/policy/unknown?format=html','/public/shopier/page/extra','/account/export','/admin/platform-settings','/parent/shopier/access'].map(path=>({path,headers:navigation})),
      {path:'/public/shopier/page',headers:{...navigation,Origin:'https://attacker.example'}},
      {path:'/public/shopier/page',headers:{...navigation,Origin:'null'}},
    ];
    for(const {path,headers} of blocked){const r=await send(path,{headers});assert.equal(r.status,403,path);assert.equal(r.headers.get('access-control-allow-origin'),null);await r.arrayBuffer();}
    for(const path of [...publicPaths,'/parent/shopier/claim'])for(const method of ['POST','PUT','DELETE','OPTIONS']){
      const r=await send(path,{method,headers:{...navigation,'Content-Type':'application/json'},...(method==='OPTIONS'?{}:{body:'{}'})});assert.equal(r.status,403,`${method} ${path}`);await r.arrayBuffer();
    }
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
