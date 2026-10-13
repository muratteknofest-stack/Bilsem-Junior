import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
process.env.VITE_SUPABASE_URL ||= 'https://thinkharbor-test.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= 'test-publishable-placeholder';
const server=await createServer({server:{host:'127.0.0.1',port:5184,strictPort:true}});await server.listen();let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5184/en/');await page.getByRole('heading',{name:'Big discoveries start with curious minds.'}).waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 let checks=0;
 for(const [width,height] of [[320,480],[360,640],[390,844],[667,375],[768,1024],[820,1180]]){
  await page.setViewportSize({width,height});
  for(const area of ['mirror_reflection','figure_completion','visual_memory','shadow_matching','spatial_relationship']){
   await page.goto('http://127.0.0.1:5184/en/#practice?area='+area);
   await page.getByRole('button',{name:'Level 4 · Pathfinder'}).click();
   await page.getByRole('button',{name:'Start quick practice',exact:true}).click();
   await page.getByRole('heading',{name:'Puzzle 1 of 5'}).waitFor();
   if(area==='visual_memory'){
    assert.equal(await page.getByRole('button',{name:'Choice A',exact:true}).count(),0);
    await page.getByRole('button',{name:'Hide pattern & answer',exact:true}).click();
    assert.equal(await page.locator('[data-colorful-kind="visual_memory"]').count(),0);
   }
   assert.equal(await page.getByRole('button',{name:'Choice A',exact:true}).count(),1);
   const layout=await page.evaluate(()=>({horizontal:document.documentElement.scrollWidth>innerWidth+1,vertical:document.documentElement.scrollHeight>innerHeight+1,choices:[...document.querySelectorAll('.en-option')].every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.width>=44&&r.top>=0&&r.bottom<=innerHeight+1;})}));
   assert.equal(layout.horizontal,false,JSON.stringify({width,height,area,layout}));assert.equal(layout.vertical,false,JSON.stringify({width,height,area,layout}));assert.equal(layout.choices,true,JSON.stringify({width,height,area,layout}));
   await page.getByRole('button',{name:'Choice A',exact:true}).click();await page.getByRole('button',{name:'Next puzzle →'}).waitFor();
   assert.equal(await page.locator('.en-option').evaluateAll(items=>items.every(e=>e.disabled)),true);
   checks++;
  }
 }
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5184/en/#practice');await page.getByRole('button',{name:'Start quick practice',exact:true}).click();
 for(let i=0;i<5;i++){
  const hide=page.getByRole('button',{name:'Hide pattern & answer',exact:true});if(await hide.count())await hide.click();
  await page.getByRole('button',{name:'Choice A',exact:true}).click();
  await page.getByRole('button',{name:i===4?'Finish & review':'Next puzzle →',exact:true}).click();
 }
 await page.getByRole('heading',{name:'Every discovery counts.'}).waitFor();
 await page.getByRole('link',{name:'View device progress',exact:true}).click();await page.getByRole('heading',{name:'Celebrate practice, not labels.'}).waitFor();
 assert.equal(await page.locator('.en-history li').count(),1);await page.reload();await page.getByRole('heading',{name:'Celebrate practice, not labels.'}).waitFor();assert.equal(await page.locator('.en-history li').count(),1);
 await page.getByRole('button',{name:'Clear device progress',exact:true}).click();await page.getByRole('button',{name:'Clear progress',exact:true}).click();assert.equal(await page.locator('.en-history li').count(),0);
 for(const hash of ['privacy','terms','help']){await page.goto('http://127.0.0.1:5184/en/#'+hash);assert.equal(await page.locator('h1').count(),1);}
 assert.deepEqual(errors,[]);console.log(`English version: ${checks} question/viewport checks and practice→review→device progress→reload→clear flow passed.`);
}finally{await browser?.close();await server.close();}
