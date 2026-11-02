import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {checkExamArt} from './check-exam-art.mjs';
const output=process.env.ART_OUTPUT||'/tmp/bilsem-question-art';await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:5189,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1240,height:1100},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5189/tests/browser/question-art.html');await page.locator('.art-sample svg').waitFor();
 const hashes=new Set();let count=0;
 for(let shape=0;shape<3;shape++)for(let variant=0;variant<4;variant++)for(let tilt=0;tilt<4;tilt++){
  await page.evaluate(value=>window.__renderArt(value,true),{art:'object',shape,variant,tilt});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  const result=await page.locator('.art-sample svg').evaluate(async svg=>{
   const clone=svg.cloneNode(true);clone.setAttribute('width','256');clone.setAttribute('height','256');clone.style.width='256px';clone.style.height='256px';
   const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));await img.decode();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,256,256);const pixels=ctx.getImageData(0,0,256,256).data;
   let minX=256,minY=256,maxX=0,maxY=0,ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100){const n=i/4,x=n%256,y=Math.floor(n/256);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);ink++;}
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(n=>n.toString(16).padStart(2,'0')).join('');return {hash,minX,minY,maxX,maxY,ink};
  });
  assert.ok(result.ink>2000);assert.ok(result.minX>0&&result.minY>0&&result.maxX<255&&result.maxY<255,'Silhouette must not be cropped');
  assert.ok(!hashes.has(result.hash),`Indistinguishable silhouette: ${shape}/${variant}/${tilt}`);hashes.add(result.hash);count++;
 }
 await page.evaluate(()=>window.__renderArt({art:'object',shape:0,variant:0,tilt:0},false));
 await page.screenshot({path:output+'/question-workshop.png',fullPage:true,animations:'disabled'});assert.deepEqual(errors,[]);
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:width<700?844:1024});await page.goto('http://127.0.0.1:5189/tests/browser/premium-questions.html');await page.locator('[data-premium-question]').first().waitFor();
  assert.equal(await page.locator('[data-premium-question]').count(),7);
  await page.locator('[data-real-object] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'New question artwork must fit '+width);
  assert.ok(await page.locator('[data-real-object] img').evaluateAll(images=>images.length>0&&images.every(image=>image.naturalWidth===800&&image.getBoundingClientRect().width>=36)),'Photographic objects must load at a readable size');
  await page.screenshot({path:output+'/premium-'+width+'.png',fullPage:true,animations:'disabled'});
 }
 await page.goto('http://127.0.0.1:5189/tests/browser/perceptual-questions.html');await page.locator('[data-perceptual-sample]').first().waitFor();
 const perceptualHashes=new Set();
 for(const shape of ['arrow','flag','key','leaf'])for(const filled of [false,true])for(let rotation=0;rotation<4;rotation++){
  await page.evaluate(value=>window.__renderPerceptualCard(value),{perceptual:'card',shape,count:1,rotation,filled});
  const raster=await page.locator('[data-card-proof] svg').evaluate(async svg=>{
   const clone=svg.cloneNode(true);clone.setAttribute('width','256');clone.setAttribute('height','256');clone.style.width='256px';clone.style.maxWidth='none';
   const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));await img.decode();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,256,256);const pixels=ctx.getImageData(0,0,256,256).data;
   let ink=0,cropped=false;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100){ink++;const n=i/4,x=n%256,y=Math.floor(n/256);if(x===0||x===255||y===0||y===255)cropped=true;}
   return {ink,cropped,hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(n=>n.toString(16).padStart(2,'0')).join('')};
  });
  assert.ok(raster.ink>300);assert.equal(raster.cropped,false);assert.ok(!perceptualHashes.has(raster.hash),'Shape/fill/direction must be visibly distinct');perceptualHashes.add(raster.hash);
 }
 await page.evaluate(()=>window.__renderPerceptualSamples());
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:width<700?844:1024});
  assert.equal(await page.locator('[data-perceptual-sample]').count(),6);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Perceptual questions must fit '+width);
  assert.ok(await page.locator('.bj-perceptual-cell').evaluateAll(cells=>cells.every(c=>c.getBoundingClientRect().width>=66)),'Given cards must remain readable');
  for(const sample of await page.locator('[data-perceptual-sample]').all()){
   const option=sample.locator('.zp-answer-option').first();await option.click();assert.equal(await option.getAttribute('aria-pressed'),'true');
   for(const code of await sample.locator('.zp-answer-option [role=img][aria-label]').all()){
    if(!/^\d{5,6}$/.test(await code.getAttribute('aria-label')||''))continue;
    const type=await code.evaluate(node=>({font:Number(node.querySelector('text:last-child')?.getAttribute('font-size')),width:node.getBoundingClientRect().width,ink:node.querySelector('text:last-child')?.getBBox().width,view:node.viewBox.baseVal.width}));
    assert.ok(type.font>=36&&type.width>=60&&type.ink<type.view-8,'Long codes must use large, uncropped answer artwork');
   }
   await sample.getByRole('button',{name:'Sürükle bırak',exact:true}).click();
   assert.ok(await sample.locator('[data-perceptual-card]').count()>4);assert.equal(await sample.getByText('[object Object]',{exact:false}).count(),0);
   await sample.getByRole('button',{name:'Şık seç',exact:true}).click();
  }
  await page.screenshot({path:output+'/perceptual-'+width+'.png',fullPage:true,animations:'disabled'});
 }
 await page.goto('http://127.0.0.1:5189/tests/browser/cube-questions.html');await page.locator('[data-cube-sample]').first().waitFor();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:width<700?844:1024});
  assert.equal(await page.locator('[data-cube-sample]').count(),28);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Cube cards fit '+width);
  for(const sample of await page.locator('[data-cube-sample]').all()){
   assert.equal(await sample.getByText('[object Object]',{exact:false}).count(),0);
   const option=sample.locator('.zp-answer-option').first();await option.click();assert.equal(await option.getAttribute('aria-pressed'),'true');
   await sample.getByRole('button',{name:'Sürükle bırak',exact:true}).click();
   const token=sample.locator('.zp-answer-tokens button').first();await token.click();await sample.locator('[data-answer-target]').first().click();
   assert.equal(await sample.locator('[data-answer-target]').first().getAttribute('data-filled'),'true');
   await sample.getByRole('button',{name:'Şık seç',exact:true}).click();
  }
  await page.screenshot({path:output+'/cubes-'+width+'.png',fullPage:true,animations:'disabled'});
 }
 await page.goto('http://127.0.0.1:5189/tests/browser/reference-questions.html');await page.locator('[data-reference-sample]').first().waitFor();
 for(const svg of await page.locator('.bj-ref-layers-three').all()){
  const bounded=await svg.evaluate(async node=>{const clone=node.cloneNode(true);clone.setAttribute('width','256');clone.setAttribute('height','256');const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,256,256);const pixels=ctx.getImageData(0,0,256,256).data;let ink=0,cropped=false;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100){ink++;const n=i/4,x=n%256,y=Math.floor(n/256);if(x===0||x===255||y===0||y===255)cropped=true;}return{ink,cropped};});
  assert.ok(bounded.ink>1000,'Layer stack must be visible');assert.equal(bounded.cropped,false,'The full 3D layer stack, including its underside, must fit');
 }
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:width<700?844:1024});
  assert.equal(await page.locator('[data-reference-sample]').count(),35);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Reference cards fit '+width);
  for(const sample of await page.locator('[data-reference-sample]').all()){
   assert.equal(await sample.getByText('[object Object]',{exact:false}).count(),0);
   if(await sample.locator('[data-locked=true]').count()){
    assert.equal(await sample.locator('.zp-answer-option').count(),0,'Memory answers stay hidden during study');
    await sample.getByRole('button',{name:'Deseni gizle ve cevapla',exact:true}).click();
    assert.equal(await sample.locator('.bj-ref-memory,.bj-ref-digit').count(),0,'Study givens leave the rendered DOM before recall');
   }
   const option=sample.locator('.zp-answer-option').first();await option.click();assert.equal(await option.getAttribute('aria-pressed'),'true');
   await sample.getByRole('button',{name:'Sürükle bırak',exact:true}).click();
   await sample.locator('.zp-answer-tokens button').first().click();await sample.locator('[data-answer-target]').first().click();
   assert.equal(await sample.locator('[data-answer-target]').first().getAttribute('data-filled'),'true');
   await sample.getByRole('button',{name:'Şık seç',exact:true}).click();
  }
  await page.screenshot({path:output+'/reference-'+width+'.png',fullPage:true,animations:'disabled'});
 }
 await checkExamArt(page,output);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({distinctUncroppedSilhouettes:count,premiumQuestionViewports:4,perceptualGlyphStates:perceptualHashes.size,perceptualQuestionViewports:4,cubeQuestionViewports:4,cubeCards:28,referenceQuestionViewports:4,referenceCards:35,examCards:23,pageErrors:errors.length}));
}finally{await browser.close();await server.close();}
