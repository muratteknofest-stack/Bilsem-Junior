import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output = 'test-artifacts/learning-launch';
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:true}});
await server.listen();
const base=`http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
try {
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 const context=await browser.newContext();
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 let checks=0;
 for(const [width,height] of [[320,480],[360,640],[390,844],[768,1024],[1440,900]]) {
  await page.setViewportSize({width,height});
  for(const grade of [1,2,3,4]) {
   await page.goto(`${base}/tests/browser/learning-launch.html?grade=${grade}`);
   const begin=page.getByRole('button',{name:'Yeni testi başlat',exact:true});
   await begin.waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.getByRole('button',{name:'20 soru seç',exact:true}).click();
   assert.equal(await page.getByRole('spinbutton',{name:'Soru sayısı',exact:true}).inputValue(),'20');
   await page.getByRole('button',{name:'1. seviye · Kolay',exact:true}).click();
   await page.getByRole('button',{name:'Konu seç',exact:true}).click();
   const dialog=page.getByRole('dialog');
   await dialog.waitFor();assert.equal(await dialog.locator('[data-topic]').count(),45);
   assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
   await dialog.getByRole('searchbox',{name:'Konu ara',exact:true}).fill('Katlama');
   assert.ok(await dialog.locator('[data-topic]').count()>0);
   await dialog.locator('[data-topic="paper_folding"]').click();
   assert.equal(await dialog.isVisible(),false);
   assert.equal(await page.getByRole('button',{name:'Konu seç',exact:true}).getAttribute('data-current-topic'),'paper_folding');
   await begin.click();
   assert.deepEqual(await page.evaluate(()=>window.launchSelection),{topic:'paper_folding',category:'mixed',difficulty:1,count:20});
   const custom=page.getByRole('spinbutton',{name:'Soru sayısı',exact:true});
   for(const value of ['','0','51','2.5']) {await custom.fill(value);assert.equal(await begin.isDisabled(),true);}
   await custom.fill('10');
   checks++;
  }
  await page.screenshot({path:`${output}/adaptive-${width}.png`,fullPage:true,animations:'disabled'});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByText('Görünüm ve ses',{exact:true}).click();
 await page.getByRole('button',{name:'Sessiz',exact:true}).click();
 assert.equal(await page.locator('main').getAttribute('data-reduced-motion'),'true');
 assert.equal(await page.getByRole('button',{name:'Sesi dene',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Dengeli',exact:true}).click();
 assert.equal(await page.getByRole('slider',{name:'Ses düzeyi',exact:true}).inputValue(),'35');
 await page.getByRole('button',{name:'Sesi dene',exact:true}).click();
 await page.getByRole('button',{name:'Canlı',exact:true}).click();
 assert.equal(await page.getByRole('slider',{name:'Ses düzeyi',exact:true}).inputValue(),'60');
 const motionButton=page.getByRole('button',{name:'Hareketli efektler',exact:false});
 assert.equal(await motionButton.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit);}),true,'Preferences must not be obscured by their trigger');
 await page.screenshot({path:`${output}/preferences-mobile.png`,animations:'disabled'});
 await page.getByRole('button',{name:'Tercihleri kapat',exact:true}).click();
 await page.reload();await page.getByText('Görünüm ve ses',{exact:true}).click();
 assert.equal(await page.getByRole('slider',{name:'Ses düzeyi',exact:true}).inputValue(),'60');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('.zp-experience-controls').getAttribute('open'),null);
 await page.getByRole('button',{name:'Konu seç',exact:true}).click();await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('button',{name:'Konu seç',exact:true}).evaluate(el=>el===document.activeElement),true);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.zp-launch-toy').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.deepEqual(errors,[]);
 console.log(`Learning launch: ${checks} grade/viewport combinations; topic search, API selection payload, invalid counts, keyboard, audio presets, persistence and reduced motion passed.`);
} finally {await browser?.close();await server.close();}
