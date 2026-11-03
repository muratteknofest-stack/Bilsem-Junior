import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createQuestionFixtureServer} from './question-fixture-server.mjs';
const output=process.env.PRECISION_OUTPUT||'test-artifacts/precision-'+(process.env.QUESTION_FIXTURE_TARGET||'web');await fs.mkdir(output,{recursive:true});
const server=await createQuestionFixtureServer(5197,'tests/browser/precision-questions.html');await server.listen();
let browser;const failures=[],pageErrors=[];let count=0;
try{
 browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto('http://127.0.0.1:5197/tests/browser/precision-questions.html',{waitUntil:'commit'});await page.locator('[data-precision-kind]').waitFor({timeout:90000});
 if(process.env.QUESTION_FIXTURE_TARGET==='android')assert.equal(await page.locator('.zp-focus').getAttribute('data-app-target'),'android');
 for(const [width,height] of [[320,480],[360,640],[390,844],[667,375],[768,1024],[820,1180]])for(const grade of [1,4]){
  await page.setViewportSize({width,height});
  for(const type of await page.evaluate(()=>window.__precisionTypes)){
   const id=await page.evaluate(({type,grade})=>window.__precision(type,grade,grade===1?2:6,81719),{type,grade});await page.locator(`[data-preview-question="${id}"]`).waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const result=await page.evaluate(()=>{
    const bad=[],root=document.querySelector('.zp-focus'),frame=document.querySelector('.zp-focus-visual').getBoundingClientRect(),cards=[...document.querySelectorAll('.zp-answer-option')];
    if(cards.length!==4)bad.push('missing-options');if(root.scrollHeight>root.clientHeight+1||root.scrollWidth>root.clientWidth+1)bad.push('scroll');
    for(const card of cards){const r=card.getBoundingClientRect();if(r.height<44||r.width<44||r.bottom>innerHeight+1||r.left<0||r.right>innerWidth+1)bad.push('touch-target');for(const svg of card.querySelectorAll('svg')){const v=svg.getBoundingClientRect();if(v.top<r.top-1||v.bottom>r.bottom+1||v.left<r.left-1||v.right>r.right+1)bad.push('clipped-choice');}}
    for(const svg of document.querySelectorAll('.zp-focus-visual .zp-question-visual svg')){const v=svg.getBoundingClientRect();if(v.width&&v.height&&(v.left<frame.left-1||v.right>frame.right+1||v.top<frame.top-1||v.bottom>frame.bottom+1))bad.push('clipped-question');}
    const labels=[...document.querySelectorAll('.zp-focus-visual [role=img]')].map(e=>e.getAttribute('aria-label'));if(labels.some(t=>/NaN|undefined|\[object Object\]/.test(t||'')))bad.push('invalid-art');return [...new Set(bad)];
   });
   if(result.length)failures.push({width,height,grade,type,result});
   await page.locator('.zp-answer-option').first().click();assert.equal(await page.evaluate(()=>window.__precisionAnswer?.optionId),'A');
   if(width===390&&grade===4)await page.screenshot({path:`${output}/${type}.png`,animations:'disabled'});count++;
  }
 }
 // Shared choice and touch/keyboard placement must display the new values as art.
 await page.setViewportSize({width:390,height:844});
 for(const type of await page.evaluate(()=>window.__precisionTypes)){
  await page.evaluate(type=>window.__precision(type,3,3,104729),type);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.evaluate(()=>window.__precisionPlace());
  await page.locator('.zp-answer-tokens button').first().click();await page.locator('[data-answer-target]').first().click();assert.equal(await page.locator('[data-answer-target]').first().getAttribute('data-filled'),'true');assert.equal(await page.getByText('[object Object]',{exact:false}).count(),0);count++;
 }
 if(pageErrors.length)failures.push({pageErrors});
}finally{await fs.writeFile(output+'/results.json',JSON.stringify({count,failures},null,2));await browser?.close();await server.close();}
console.log(JSON.stringify({count,failures}));assert.deepEqual(failures,[]);
