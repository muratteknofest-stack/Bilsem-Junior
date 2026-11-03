import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createQuestionFixtureServer} from './question-fixture-server.mjs';
const output='test-artifacts/visual-reasoning';await fs.mkdir(output,{recursive:true});
const server=await createQuestionFixtureServer(5182);await server.listen();
let browser;
try {
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:360,height:640}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:5182'?route.continue():route.abort());
 await page.goto('http://127.0.0.1:5182/tests/browser/question-screen.html');await page.locator('.zp-focus').waitFor();
 const mechanics=['object-shadow','scene-difference','object-mirror','fold-punch','seven-piece','missing-symbol','raven-relation','cube-evidence'];let checked=0;
 const rasterSignatures=new Map();
 for(const [width,height] of [[320,480],[360,640],[390,844],[768,1024],[667,375]])for(const grade of [1,2,3,4])for(const mechanic of mechanics)for(let sample=1;sample<=3;sample++){
  await page.setViewportSize({width,height});
  await page.evaluate(({mechanic,grade,sample})=>window.__showVisual(mechanic,grade,mechanic==='cube-evidence'?Math.min(grade+1,4):Math.min(grade+1,grade===4?6:grade===3?4:grade===2?3:2),sample*7919),{mechanic,grade,sample});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await page.locator('.zp-focus').getAttribute('data-app-target'),'android');
  const bad=await page.evaluate(()=>{
   const root=document.querySelector('.zp-focus'),frame=document.querySelector('.zp-focus-visual').getBoundingClientRect(),bad=[];
   if(root.scrollHeight>root.clientHeight+1||root.scrollWidth>root.clientWidth+1)bad.push('screen-overflow');
   const options=[...document.querySelectorAll('.zp-answer-option')];if(options.length!==4)bad.push('missing-options');
   for(const option of options){const r=option.getBoundingClientRect();if(r.width<44||r.height<44||r.bottom>innerHeight+1||r.right>innerWidth+1)bad.push('option-touch-bounds');for(const svg of option.querySelectorAll('svg')){const v=svg.getBoundingClientRect();if(v.left<r.left-1||v.right>r.right+1||v.top<r.top-1||v.bottom>r.bottom+1)bad.push('option-clipped');}}
   for(const svg of document.querySelectorAll('.zp-focus-visual svg')){const v=svg.getBoundingClientRect();if(v.width>0&&v.height>0&&(v.left<frame.left-1||v.right>frame.right+1||v.top<frame.top-1||v.bottom>frame.bottom+1))bad.push('question-clipped');}
   return bad;
  });
  assert.deepEqual(bad,[],JSON.stringify({width,height,grade,mechanic,sample,bad}));
  await page.locator('.zp-answer-option').first().click();assert.equal(await page.evaluate(()=>window.__answer?.optionId),'A');
  if(sample===1&&grade===2&&(width===360||width===768))await page.screenshot({path:`${output}/${mechanic}-${width}.png`,animations:'disabled'});
  checked++;
 }
 // Raster proofs reject accidentally identical options after real SVG rendering.
 await page.setViewportSize({width:390,height:844});
 for(const mechanic of ['object-shadow','object-mirror','seven-piece','fold-punch','raven-relation','missing-symbol']){
  await page.evaluate(m=>window.__showVisual(m,3,3,7919),mechanic);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const signatures=await page.locator('.zp-answer-option svg').evaluateAll(async svgs=>Promise.all(svgs.map(async svg=>{
   const clone=svg.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','256');clone.setAttribute('height','256');clone.removeAttribute('class');
   const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));await img.decode();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const context=canvas.getContext('2d');context.drawImage(img,0,0,256,256);const pixels=context.getImageData(0,0,256,256).data;
   return [...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(n=>n.toString(16).padStart(2,'0')).join('');
  })));
  assert.equal(signatures.length,4);assert.equal(new Set(signatures).size,4,mechanic+' choices must differ as actual pixels');rasterSignatures.set(mechanic,signatures);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${output}/results.json`,JSON.stringify({checked,errors,rasterSignatures:Object.fromEntries(rasterSignatures)},null,2));
 console.log(JSON.stringify({checked,errors:[],rasterFamilies:rasterSignatures.size}));
} finally {await browser?.close();await server.close();}
