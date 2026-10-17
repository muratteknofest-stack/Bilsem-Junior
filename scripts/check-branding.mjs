import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
process.env.VITE_API_BASE_URL='https://brand-api.example.invalid';
process.env.VITE_PUBLIC_SITE_URL='https://brand.example.invalid';
process.env.VITE_SUPABASE_URL='https://brand-fixture.example.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_isolated_brand_fixture';
const server=await createServer({mode:'development',server:{host:'127.0.0.1',port:5197,strictPort:true}});
await server.listen();await mkdir('test-artifacts/brand',{recursive:true});let browser;
try {
  browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"registrationOpen":true,"policyVersion":"2026-10-11.4"}'}));
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5197/');await page.locator('.zp-public-brand .bj-logo').waitFor();
    assert.match(await page.title(),/BİLSEM Junior/);assert.match(await page.locator('#hero-title').innerText(),/BİLSEM/);
    await page.waitForFunction(()=>{const image=document.querySelector('.bj-logo-icon');return image?.complete&&image.naturalWidth>0;});
    const fit=await page.locator('.zp-public-brand .bj-logo').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth};});
    assert.ok(fit.left>=0&&fit.right<=fit.width,'Brand must fit '+JSON.stringify(fit));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Home must not scroll horizontally');
    const mark=await page.request.get('http://127.0.0.1:5197/logo.svg');assert.equal(mark.status(),200);assert.match(await mark.text(),/Meraklı baykuş/);
    const manifest=await page.request.get('http://127.0.0.1:5197/bilsem-junior.webmanifest');assert.equal((await manifest.json()).name,'BİLSEM Junior');
    await page.screenshot({path:`test-artifacts/brand/bilsem-junior-${width}.png`});
  }
  assert.deepEqual(errors,[]);console.log('BİLSEM Junior brand, preparation headline, owl logo, web manifest and mobile/desktop layout passed.');
} finally {await browser?.close();await server.close();}
