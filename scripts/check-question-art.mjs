import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
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
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({distinctUncroppedSilhouettes:count,premiumQuestionViewports:4,pageErrors:errors.length}));
}finally{await browser.close();await server.close();}
