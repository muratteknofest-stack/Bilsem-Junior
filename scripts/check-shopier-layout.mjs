// Actual server-rendered sales page plus parent card/form fixtures; no real purchase.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import express from 'express';
import {requestSecurity} from '../server/request-security.ts';
import {SHOPIER_PLANS} from '../src/lib/shopier-config.ts';
import {shopierPageHtml} from '../server/routes/shopier-routes.ts';
const publicPage=express();let lastNavigation;
publicPage.use('/api',(req,_res,next)=>{lastNavigation={site:req.get('Sec-Fetch-Site'),mode:req.get('Sec-Fetch-Mode'),dest:req.get('Sec-Fetch-Dest')};next();},requestSecurity(''));
publicPage.get('/api/public/shopier/page',(req,res)=>{
 const ready=Object.hasOwn(req.query,'ready');
 res.type('html').send(shopierPageHtml({ready,enforced:false,brand:'ZekaPark',plans:SHOPIER_PLANS.map((plan,index)=>({...plan,url:ready?`https://www.shopier.com/${index+1}`:null}))}));
});
publicPage.get('/sales-entry',(_req,res)=>res.type('html').send('<html lang="tr"><body><a href="http://127.0.0.1:5183/paketler">/paketler</a><a href="http://127.0.0.1:5183/paketler/">/paketler/</a></body></html>'));
const server=await createServer({server:{host:'127.0.0.1',port:5183,strictPort:true},plugins:[{name:'sales-page-fixture',configureServer(server){
 server.middlewares.use((req,res,next)=>{
  const url=new URL(req.url,'http://localhost');
  // Reproduce the Vercel public-page rewrite before the actual API guard.
  if(['/sales-preview','/paketler','/paketler/'].includes(url.pathname))req.url='/api/public/shopier/page'+url.search;
  publicPage(req,res,next);
 });
}}]});
await server.listen();
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let count=0;
  for(const surface of ['page','cards','billing'])for(const ready of [false,true])for(const width of [320,390,768,1024,1440]){
    console.log(`Checking ${surface} ${ready?'open':'closed'} at ${width}px`);
    await page.setViewportSize({width,height:900});
    const params=new URLSearchParams(ready?{ready:''}:{});if(surface==='billing')params.set('billing','');
    await page.goto(`http://127.0.0.1:5183/${surface==='page'?'sales-preview':'tests/browser/shopier-screen.html'}?${params}`);
    await page.waitForSelector('.zp-plan-card');
    assert.equal(await page.locator('.zp-plan-card').count(),SHOPIER_PLANS.length);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${surface}: overflow at ${width}`);
    const cards=page.locator('.zp-plan-grid');
    if(ready){assert.equal(await cards.getByRole('link',{name:surface==='page'?'Veli panelinden satın al':'Shopier’den satın al',exact:true}).count(),SHOPIER_PLANS.length);}
    else {assert.equal(await cards.getByRole('link').count(),0);assert.equal(await cards.locator('button:disabled').count(),SHOPIER_PLANS.length);}
    assert.equal(await cards.evaluate(el=>[...el.querySelectorAll('a,button')].every(e=>e.getBoundingClientRect().height>=44)),true);
    for(const plan of SHOPIER_PLANS)assert.ok((await cards.innerText()).includes((plan.amountKurus/100).toLocaleString('tr-TR')+' TL'));
    if(surface==='page'){
      await page.getByRole('link',{name:'Bize uygun paketi bul'}).click();assert.ok(page.url().endsWith('#paketler'));
      const faq=page.getByText('Her ay otomatik ücret alınır mı?',{exact:true});await faq.focus();await page.keyboard.press('Enter');assert.equal(await faq.locator('..').getAttribute('open'),'');
      if(ready)assert.equal(await cards.locator('a').first().getAttribute('href'),'/login?role=parent');
    }
    if(surface==='billing'&&ready){
      const submit=page.getByRole('button',{name:'Siparişi doğrula ve erişimi aç',exact:true});assert.equal(await submit.isDisabled(),true);
      await page.getByLabel('Shopier sipariş numarası').fill('TEST-123');assert.equal(await submit.isEnabled(),true);
      await submit.click();await page.getByText('Örnek form gönderildi.',{exact:true}).waitFor();
    }
    count++;
  }
  for(const path of ['/paketler','/paketler/'])for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});
    // localhost and 127.0.0.1 are separate sites: exercise a real link click,
    // not page.goto(), which supplies Sec-Fetch-Site: none.
    await page.goto('http://localhost:5183/sales-entry');
    const responsePromise=page.waitForResponse(response=>response.request().isNavigationRequest()&&new URL(response.url()).pathname===path);
    await page.getByRole('link',{name:path,exact:true}).click();
    assert.equal((await responsePromise).status(),200,`external link ${path}`);
    await page.locator('#sales-heading').waitFor();assert.equal(await page.locator('.zp-plan-card').count(),3);
    assert.deepEqual(lastNavigation,{site:'cross-site',mode:'navigate',dest:'document'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:5183/sales-preview');
  assert.equal(await page.locator('.zp-art-star').evaluate(el=>getComputedStyle(el).animationName),'none');
  if(process.env.SALES_SCREENSHOTS){
    await mkdir(process.env.SALES_SCREENSHOTS,{recursive:true});
    for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5183/sales-preview');await page.screenshot({path:`${process.env.SALES_SCREENSHOTS}/sales-${width}.png`,fullPage:true});}
    await page.setViewportSize({width:390,height:1000});await page.goto('http://127.0.0.1:5183/tests/browser/shopier-screen.html?billing&ready');await page.screenshot({path:`${process.env.SALES_SCREENSHOTS}/billing-390.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log(`Shopier sales layouts: ${count} viewport/state checks, 4 real cross-site link clicks, FAQ keyboard, activation form and reduced motion passed.`);
} finally {await browser?.close();await server.close();}
