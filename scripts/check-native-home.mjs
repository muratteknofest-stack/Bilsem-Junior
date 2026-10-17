// Real Android web bundle: compact launch screen, separate demo/help, auth and Back.
import assert from 'node:assert/strict';
import express from 'express';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { chromium } from 'playwright';
const server=express().use(express.static(resolve('dist-android'))).use((_req,res)=>res.sendFile(resolve('dist-android/index.html'))).listen(5198,'127.0.0.1');
await once(server,'listening');await mkdir('test-artifacts/native-home',{recursive:true});let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const back=()=>page.evaluate(()=>document.dispatchEvent(new Event('zekapark:native-back',{bubbles:true,cancelable:true})));
 for(const [width,height] of [[320,480],[320,568],[320,640],[360,740],[390,844],[430,932],[768,1024],[844,390]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5198/');await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-inset-top','30px');document.documentElement.style.setProperty('--safe-area-inset-bottom','24px');});await page.locator('#native-home-title').waitFor();
  assert.equal(await page.locator('.bj-logo-icon').getAttribute('src'),'/logo.svg');assert.match(await page.locator('.bj-logo').innerText(),/BİLSEM/);
  assert.equal(await page.locator('html').getAttribute('data-native-app'),'android');
  const layout=await page.evaluate(()=>({height:document.documentElement.scrollHeight,viewport:innerHeight,width:document.documentElement.scrollWidth,actionsBottom:document.querySelector('.zp-native-home-shortcuts').getBoundingClientRect().bottom,navTop:document.querySelector('.zp-native-home-nav').getBoundingClientRect().top}));
  assert.ok(layout.width<=width+1,'Horizontal overflow '+JSON.stringify(layout));
  if(height>=640){assert.ok(layout.height<=height+2,'Home must fit one screen '+JSON.stringify(layout));assert.ok(layout.actionsBottom<=layout.navTop,'Main actions must be above bottom navigation');}
  assert.equal(await page.locator('.zp-world-grid,.zp-rewards-section,footer').count(),0,'Marketing sections must not stack under home');
  await page.locator('.zp-native-home-nav').getByRole('button',{name:'Yardım',exact:true}).click();
  await page.getByRole('region',{name:'Sık sorulan sorular'}).waitFor();await back();await page.locator('#native-home-title').waitFor();
  await page.getByRole('button',{name:/Önce bir soru dene/}).click();await page.locator('.zp-free-test').waitFor();
  assert.equal(await page.locator('#native-home-title').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  for(const type of ['visual_sequence','logic_grid','shape_counting','figure_rotation','number_pattern','symbol_coding']){
   await page.getByLabel('Örnek soru alanı',{exact:true}).selectOption(type);await page.waitForTimeout(350);
   const fit=await page.evaluate(()=>{const root=document.querySelector('.zp-free-test'),board=document.querySelector('.zp-free-board');return {height:root.scrollHeight,client:root.clientHeight,board:board.clientHeight,choices:[...document.querySelectorAll('.zp-free-choices button')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};})};});
   assert.ok(fit.height<=fit.client+1,`${width}×${height} ${type}: test must fit ${JSON.stringify(fit)}`);assert.ok(fit.board>=60,'Diagram must retain space');assert.equal(fit.choices.length,4);
   for(const r of fit.choices){assert.ok(r.x>=0&&r.right<=width&&r.bottom<=height-24&&r.h>=44&&r.w>=44,JSON.stringify(r));}
   if(width===390)await page.screenshot({path:`test-artifacts/native-home/free-${type}-${width}.png`});
  }
  await page.getByRole('button',{name:'Ücretsiz soru görselini büyüt'}).click();await page.getByRole('dialog',{name:'Ücretsiz test büyük görsel'}).waitFor();await back();assert.equal(await page.locator('.zp-free-test').count(),1);assert.equal(await page.locator('dialog[open]').count(),0);
  await back();await page.locator('#native-home-title').waitFor();
  await page.getByRole('button',{name:'Abone ol',exact:true}).click();await page.locator('#zp-auth-heading').waitFor();assert.equal(new URL(page.url()).searchParams.get('role'),'parent');
  assert.equal(await page.locator('.zp-auth-showcase').isVisible(),false,'Auth decoration must not extend native forms');
  await page.getByRole('button',{name:'Ana Sayfaya Dön',exact:true}).click();await page.locator('#native-home-title').waitFor();
  await page.getByRole('button',{name:/Öğrenci girişi/}).click();await page.locator('#zp-auth-heading').waitFor();
  await page.getByRole('button',{name:'Yeni Kayıt',exact:true}).click();await page.locator('#parent-email').waitFor();
  await back();await page.waitForFunction(()=>document.querySelector('button.zp-auth-mode-button[aria-pressed="true"]')?.textContent.trim()==='Giriş Yap');
  await back();await page.locator('#native-home-title').waitFor();await page.waitForURL(url=>url.pathname==='/');
  await page.screenshot({path:`test-artifacts/native-home/home-${width}.png`,fullPage:true});
  if(width===390){await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'test-artifacts/native-home/home-dark-390.png',fullPage:true});await page.evaluate(()=>document.documentElement.classList.remove('dark'));}
  console.log(`Compact native home, demo/help Back, parent entry, registration and touch navigation: ${width}×${height} passed`);
 }
 // Sound synthesis and its persistent mute switch, feedback and the one-sample limit.
 await page.addInitScript(()=>{window.__freeTones=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(...args){window.__freeTones++;return original.apply(this,args);};});
 await page.setViewportSize({width:320,height:568});await page.reload();await page.getByRole('button',{name:/Önce bir soru dene/}).click();
 await page.getByRole('button',{name:'Test sesini kapat'}).click();
 await page.getByRole('button',{name:'Test animasyonlarını durdur'}).click();
 assert.equal(await page.locator('.zp-free-test').getAttribute('data-reduced-motion'),'true');
 await page.locator('.zp-free-choices button').first().click();await page.locator('.zp-free-result').waitFor();assert.equal(await page.evaluate(()=>window.__freeTones),0);
 await page.getByRole('button',{name:'Çözümü gör'}).click();await page.getByRole('dialog',{name:'Ücretsiz test çözümü'}).waitFor();await back();
 assert.equal(await page.locator('.zp-free-test').count(),1);await back();await page.reload();await page.getByRole('button',{name:/Önce bir soru dene/}).click();await page.getByRole('heading',{name:'İlk keşfin tamam!'}).waitFor();assert.equal(await page.locator('.zp-free-choices button').count(),0);
 await back();await page.evaluate(()=>localStorage.removeItem('zp:landing:answered:v1'));await page.reload();await page.getByRole('button',{name:/Önce bir soru dene/}).click();await page.getByRole('button',{name:'Test sesini aç'}).click();
 await page.locator('.zp-free-choices button').first().click();await page.locator('.zp-free-result').waitFor();assert.ok(await page.evaluate(()=>window.__freeTones)>=3,'Tap and feedback must synthesize audio');
 assert.ok(await page.locator('.zp-free-test').evaluate(n=>n.scrollHeight<=n.clientHeight+1),'Answered screen fits');
 await page.screenshot({path:'test-artifacts/native-home/free-result-320.png'});await back();
 await page.context().setOffline(true);await page.locator('.zp-native-connection').waitFor();
 assert.match(await page.locator('.zp-native-connection').innerText(),/Bağlantı yok/);
 await page.context().setOffline(false);await page.locator('.zp-native-connection').waitFor({state:'hidden'});
 // Larger text may scroll naturally; it must remain readable and reachable.
 await page.setViewportSize({width:320,height:640});await page.evaluate(()=>document.documentElement.style.fontSize='125%');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
