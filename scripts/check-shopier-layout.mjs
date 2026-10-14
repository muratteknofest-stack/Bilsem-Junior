// Component and server-rendered page fixtures; no real Shopier purchase claim.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {SHOPIER_PLANS} from '../src/lib/shopier-config.ts';
const server=await createServer({server:{host:'127.0.0.1',port:5183,strictPort:true}});
await server.listen();
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let count=0;
  for(const ready of [false,true])for(const width of [320,360,390,768,1024]){
    await page.setViewportSize({width,height:800});
    await page.goto('http://127.0.0.1:5183/tests/browser/shopier-screen.html'+(ready?'?ready':''));
    await page.waitForSelector('section');
    assert.equal(await page.locator('section').count(),SHOPIER_PLANS.length);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
    if(ready){assert.equal(await page.getByRole('link',{name:'Shopier’den satın al'}).count(),SHOPIER_PLANS.length);}
    else {assert.equal(await page.getByRole('link').count(),0);assert.equal(await page.locator('button:disabled').count(),SHOPIER_PLANS.length);}
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('a,button')].every(e=>e.getBoundingClientRect().height>=44)),true);
    for(const plan of SHOPIER_PLANS)assert.ok((await page.locator('body').innerText()).includes((plan.amountKurus/100).toLocaleString('tr-TR')+' TL'));
    count++;
  }
  assert.deepEqual(errors,[]);console.log(`Shopier package layouts: ${count} viewport/state checks passed.`);
} finally {await browser?.close();await server.close();}
