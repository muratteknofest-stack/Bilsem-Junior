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
 for(const [width,height] of [[320,640],[360,740],[390,844],[430,932],[768,1024],[844,390]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5198/');await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-inset-top','30px');document.documentElement.style.setProperty('--safe-area-inset-bottom','24px');});await page.locator('#native-home-title').waitFor();
  assert.equal(await page.locator('html').getAttribute('data-native-app'),'android');
  const layout=await page.evaluate(()=>({height:document.documentElement.scrollHeight,viewport:innerHeight,width:document.documentElement.scrollWidth,actionsBottom:document.querySelector('.zp-native-home-shortcuts').getBoundingClientRect().bottom,navTop:document.querySelector('.zp-native-home-nav').getBoundingClientRect().top}));
  assert.ok(layout.width<=width+1,'Horizontal overflow '+JSON.stringify(layout));
  if(height>=640){assert.ok(layout.height<=height+2,'Home must fit one screen '+JSON.stringify(layout));assert.ok(layout.actionsBottom<=layout.navTop,'Main actions must be above bottom navigation');}
  assert.equal(await page.locator('.zp-world-grid,.zp-rewards-section,footer').count(),0,'Marketing sections must not stack under home');
  await page.locator('.zp-native-home-nav').getByRole('button',{name:'Yardım',exact:true}).click();
  await page.getByRole('region',{name:'Sık sorulan sorular'}).waitFor();await back();await page.locator('#native-home-title').waitFor();
  await page.getByRole('button',{name:/Önce bir soru dene/}).click();await page.locator('.zp-demo-card').waitFor();
  assert.equal(await page.locator('#native-home-title').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
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
 await page.context().setOffline(true);await page.locator('.zp-native-connection').waitFor();
 assert.match(await page.locator('.zp-native-connection').innerText(),/Bağlantı yok/);
 await page.context().setOffline(false);await page.locator('.zp-native-connection').waitFor({state:'hidden'});
 // Larger text may scroll naturally; it must remain readable and reachable.
 await page.setViewportSize({width:320,height:640});await page.evaluate(()=>document.documentElement.style.fontSize='125%');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
