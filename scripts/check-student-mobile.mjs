// Real App, AuthProvider and components with isolated auth/API responses.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const native = process.argv.includes('--native');
process.env.VITE_API_BASE_URL = 'https://app.example.invalid';
process.env.VITE_PUBLIC_SITE_URL = 'https://app.example.invalid';
process.env.VITE_SUPABASE_URL = 'https://student-mobile-fixture.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_isolated_fixture';
const server = await createServer({mode:native?'android':'development',server:{host:'127.0.0.1',port:5189,strictPort:true}}); await server.listen();
const studentId = '22222222-2222-4222-8222-222222222222', parentId = '11111111-1111-4111-8111-111111111111';
const monday = new Date(); monday.setDate(monday.getDate() - (monday.getDay()+6)%7);
const weekStart = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
const weekly = JSON.stringify({thisWeekDays:[184,0,0,0,0,0,0],lastWeekDays:[26,0,0,0,0,0,0],pastWeeks:[0,0],weekStart});
const profile = {id:studentId,role:'student',name:'Kaşif',grade:2,linked_parent_id:parentId,student_code:'EXPLORER1234',xp:3066,level:5,total_questions_solved:184};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const session = {access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:studentId,role:'authenticated',aal:'aal1',exp:Math.floor(Date.now()/1000)+3600,session_id:'99999999-9999-4999-8999-999999999999'})}.fixture`,refresh_token:'isolated-refresh',token_type:'bearer',expires_in:3600,user:{id:studentId,aud:'authenticated',email:'student@example.invalid',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{role:'student'},user_metadata:{}}};
let browser; let premium = true, unavailable = false, delayedAccess = false; const pending = []; const calls = [];
await mkdir('test-artifacts/student-mobile',{recursive:true});
try {
 browser = await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 const page = await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://student-mobile-fixture.invalid/**',async route=>{
  const url=new URL(route.request().url());let value=[];
  if(url.pathname.includes('/auth/v1/token'))value=session;
  else if(url.pathname.includes('/auth/v1/user'))value=session.user;
  else if(url.pathname.includes('/rest/v1/profiles'))value=profile;
  else if(url.pathname.includes('/rest/v1/user_private_state'))value={user_id:studentId,values:{yapyap_weekly_questions_v1:weekly}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
 });
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname);let value={};
  if(url.pathname==='/api/learning/access'){
   if(delayedAccess)await new Promise(resolve=>pending.push(resolve));
   if(unavailable)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Doğrulama kullanılamıyor"}'});
   value={active:premium,expiresAt:premium?'2027-01-16T12:00:00Z':null,freeDailyQuestions:3};
  }else if(url.pathname==='/api/challenges/today')value={day:'2026-10-17',limit:3,completed:3,points:20};
  else if(url.pathname==='/api/learning/rewards')value={badges:[],reviewToday:0};
  else if(url.pathname==='/api/learning/history')value={sessions:[]};
  else if(url.pathname==='/api/public/platform')value={registrationOpen:true,policyVersion:'2026-10-11.4'};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
 });
 const go=async()=>{await page.goto('http://127.0.0.1:5189/tests/browser/student-membership.html');await page.locator('#student-dashboard').waitFor();};
 const noOverflow=async(label)=>{
  const measurements=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,
   clipped:[...document.querySelectorAll('.zp-arena,.zp-arena-duel,.zp-arena h2,.zp-study-navigation,.zp-study-navigation button,.zp-membership-prompt')].filter(node=>{const r=node.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1||(!node.matches('.zp-arena,.zp-arena-duel')&&node.scrollWidth>node.clientWidth+1);}).map(n=>n.className)}));
  assert.ok(measurements.document<=measurements.viewport+1,label+': document '+JSON.stringify(measurements));
  assert.deepEqual(measurements.clipped,[],label+': content must fit, not merely be hidden');
 };
 // Verify the paid task card that overflowed in the report, plus every dashboard tab.
 for(const width of [320,360,390,430,600,768,1024,1440]){
  await page.setViewportSize({width,height:900});await go();
  if(native){
   await page.getByRole('button',{name:'Konu testleri',exact:true}).click();await page.locator('[aria-label="Konuya göre test"]').waitFor();
   assert.equal(await page.locator('.zp-modes-section').count(),0);
   await page.getByRole('button',{name:'Oyunlar',exact:true}).click();await page.getByRole('button',{name:'Hızlı başla',exact:true}).click();
   await page.locator('.zp-modes-section').waitFor();assert.equal(await page.locator('[aria-label="Konuya göre test"]').count(),0);assert.equal(await page.locator('.zp-student-aside').count(),0);
   const layout=await page.evaluate(()=>({height:document.documentElement.scrollHeight,viewport:innerHeight}));assert.ok(layout.height<layout.viewport*1.6,'Quick screen should stay compact '+JSON.stringify(layout));
  }else await page.locator('[aria-label="Konuya göre test"]').waitFor();
  for(const name of ['Görevlerim','Kişisel planım','Yeteneklerim','İlerlemem','Çalışma alanım']){
   await page.locator('.zp-study-navigation').getByRole('button',{name,exact:true}).click();
   await page.waitForTimeout(240);await noOverflow(`${width}px ${name}`);
  }
  await page.locator('.zp-study-navigation').getByRole('button',{name:'Görevlerim',exact:true}).click();await page.locator('#arena-title').waitFor();
  assert.match(await page.locator('#arena-title').innerText(),/Geçen haftaki kendini geç/);assert.equal(await page.locator('.zp-arena-total strong').innerText(),'184');
  const top=await page.locator('.zp-native-topbar').boundingBox();assert.ok(top.y>=29,'status bar safe area');
  if(width===390)await page.screenshot({path:'test-artifacts/student-mobile/paid-tasks-390.png',fullPage:true});
 }
 // A larger reading size must not crop the card, counters or navigation labels.
 await page.setViewportSize({width:320,height:740});await page.evaluate(()=>document.documentElement.style.fontSize='125%');await noOverflow('320px larger text');
 premium=false;await go();await page.getByRole('heading',{name:'Üç soru, yeni bir adım.'}).waitFor();await noOverflow('free dashboard');
 await page.getByRole('button',{name:'Abone ol',exact:true}).waitFor();
 await page.screenshot({path:'test-artifacts/student-mobile/colorful-membership-320.png',fullPage:true});
 assert.equal(await page.getByRole('button',{name:'Bugünün görevleri tamamlandı',exact:true}).isDisabled(),true);
 for(const name of ['Görevlerim','Kişisel planım','Yeteneklerim']){
  await page.locator('.zp-study-navigation').getByRole('button',{name:new RegExp(name)}).click();await page.getByRole('region',{name:'Üyelikle devam et'}).waitFor();
  assert.equal(await page.locator('#arena-title').count(),0);assert.equal(await page.locator('iframe').count(),0);await noOverflow('free '+name);
 }
 const before=calls.filter(path=>path==='/api/learning/start').length;
 await page.locator('[aria-label="Öğrenci alt menüsü"]').getByRole('tab',{name:'Adaptif',exact:true}).click();
 await page.getByRole('button',{name:'Ücretsiz sorulara dön',exact:true}).waitFor();assert.equal(calls.filter(path=>path==='/api/learning/start').length,before);
 await page.getByRole('button',{name:'Abone ol',exact:true}).click();await page.getByRole('dialog').waitFor();
 await page.getByRole('dialog').getByLabel('Veli şifresi',{exact:false}).waitFor();
 await page.screenshot({path:'test-artifacts/student-mobile/parent-upgrade-320.png',fullPage:true});
 await go();unavailable=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('heading',{name:'Üyelik bilgisine ulaşılamadı'}).waitFor();
 await page.getByRole('heading',{name:'Üç soru, yeni bir adım.'}).waitFor();await noOverflow('billing unavailable keeps free section');
 // The public library offers distinct registration and subscription actions.
 const guest=await browser.newPage({viewport:{width:320,height:740}});
 guest.on('pageerror',e=>errors.push(e.message));
 await guest.route('https://student-mobile-fixture.invalid/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await guest.route('**/api/public/platform',route=>route.fulfill({status:200,contentType:'application/json',body:'{"registrationOpen":true,"policyVersion":"2026-10-11.4"}'}));
 await guest.goto('http://127.0.0.1:5189/wordwall');
 await guest.getByRole('button',{name:'Üye ol',exact:true}).waitFor();
 await guest.getByRole('button',{name:'Abone ol',exact:true}).waitFor();
 assert.equal(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await guest.screenshot({path:'test-artifacts/student-mobile/colorful-register-320.png',fullPage:true});
 await guest.getByRole('button',{name:'Üye ol',exact:true}).click();await guest.waitForURL(url=>url.pathname==='/register');
 await guest.locator('#parent-email').waitFor();
 await guest.close();
 assert.deepEqual(errors,[]);console.log('Student mobile: 8 widths, all 5 tabs, native safe areas, enlarged text, colorful subscribe/register buttons, registration route, free quota UI, premium locks, parent authentication and billing outage passed.');
}finally{for(const release of pending)release();await browser?.close();await server.close();}
