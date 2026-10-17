import assert from 'node:assert/strict';
import express from 'express';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { chromium } from 'playwright';
const server=express().use(express.static(resolve('dist'))).use((_req,res)=>res.sendFile(resolve('dist/index.html'))).listen(5197,'127.0.0.1');
await once(server,'listening');await mkdir('test-artifacts/brand',{recursive:true});let browser;
try {
  browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"registrationOpen":true,"policyVersion":"2026-10-11.4"}'}));
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5197/');await page.locator('.zp-public-brand .bj-logo').waitFor();
    assert.match(await page.title(),/BİLSEM Junior/);assert.match(await page.locator('#hero-title').innerText(),/BİLSEM/);
    assert.equal(await page.locator('.bj-logo-icon').first().evaluate(n=>n.complete&&n.naturalWidth>0),true);
    const fit=await page.locator('.zp-public-brand .bj-logo').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth};});
    assert.ok(fit.left>=0&&fit.right<=fit.width,'Brand must fit '+JSON.stringify(fit));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Home must not scroll horizontally');
    const mark=await page.request.get('http://127.0.0.1:5197/logo.svg');assert.equal(mark.status(),200);assert.match(await mark.text(),/Meraklı baykuş/);
    const manifest=await page.request.get('http://127.0.0.1:5197/bilsem-junior.webmanifest');assert.equal((await manifest.json()).name,'BİLSEM Junior');
    await page.screenshot({path:`test-artifacts/brand/bilsem-junior-${width}.png`});
  }
  assert.deepEqual(errors,[]);console.log('BİLSEM Junior brand, preparation headline, owl logo, web manifest and mobile/desktop layout passed.');
} finally {await browser?.close();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
