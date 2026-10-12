// Local component fixture: real Chromium layout, no authenticated API/database claim.
import {createServer} from 'vite';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const output=process.env.LAYOUT_OUTPUT||'/tmp/zekapark-layout';
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:5182,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
const page=await browser.newPage({viewport:{width:360,height:640},deviceScaleFactor:1});page.on('pageerror',e=>console.log('ERROR',e.message));
await page.goto('http://127.0.0.1:5182/tests/browser/question-screen.html');await page.waitForSelector('.zp-answer-option');await page.screenshot({path:output+'/zekapark-mobile.png'});

const failures=[];let count=0;
for(const [width,height] of [[320,480],[320,568],[360,560],[360,640],[390,844],[600,960],[667,375],[768,1024],[820,1180],[1024,1366],[1024,768]]){
 await page.setViewportSize({width,height});
 const types=await page.evaluate(()=>window.__types);
 for(const type of types){
  await page.evaluate(type=>window.__show(type,4),type);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(type==='visual_memory')await page.getByRole('button',{name:'Deseni gizle ve cevapla'}).click();
  const result=await page.evaluate(()=>{
   const root=document.querySelector('.zp-focus');const cards=[...document.querySelectorAll('.zp-answer-option')];
   const bad=cards.flatMap(e=>{const r=e.getBoundingClientRect();return r.bottom>innerHeight+1||r.right>innerWidth+1||r.top<0||r.height<44||r.width<44?['card']:[];});
   for(const card of cards)for(const svg of card.querySelectorAll('svg')){const r=svg.getBoundingClientRect(),c=card.getBoundingClientRect();if(r.height>0&&(r.top<c.top-1||r.bottom>c.bottom+1||r.left<c.left-1||r.right>c.right+1))bad.push('clipped-svg');}
   if(cards.length!==4)bad.push('missing-options');
   if(root.scrollHeight>root.clientHeight+1||root.scrollWidth>root.clientWidth+1)bad.push('scroll');
   return bad;
  });
  if(result.length)failures.push({width,height,type,result});count++;
 }
 console.log('viewport',width,height,'checked',types.length);
}
for(const type of ['mirror_reflection','figure_completion','visual_memory','shadow_matching','spatial_relationship'])for(const grade of [1,2,3,4]){
 await page.setViewportSize({width:360,height:640});await page.evaluate(({type,grade})=>window.__show(type,grade),{type,grade});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 if(type==='visual_memory'){
  await page.getByRole('button',{name:'Deseni gizle ve cevapla'}).click();
  if(await page.locator('[data-colorful-kind=visual_memory]').count())failures.push({type,grade,result:['memory-leak']});
  if(await page.getByRole('button',{name:'Soru görselini büyüt',exact:true}).count())failures.push({type,grade,result:['memory-zoom-leak']});
 }
 await page.locator('.zp-answer-option').first().click();
 if((await page.evaluate(()=>window.__answer?.optionId))!=='A')failures.push({type,grade,result:['answer-not-propagated']});
 count++;
 if(grade===2)await page.screenshot({path:output+'/zekapark-'+type+'.png'});
}
await page.getByRole('button',{name:'Sorular ve çalışma araçları'}).click();
if(!await page.locator('dialog[open]').isVisible())throw Error('Tools dialog did not open');
await page.keyboard.press('Escape');
// Expanding/collapsing mobile browser controls changes usable portrait height.
for(const height of [700,510,740]){await page.setViewportSize({width:360,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const overflow=await page.evaluate(()=>{const root=document.querySelector('.zp-focus');return root.scrollHeight>root.clientHeight+1;});if(overflow)failures.push({height,result:['viewport-resize-overflow']});count++;}
await page.setViewportSize({width:768,height:1024});await page.evaluate(()=>window.__show('mirror_reflection',3));await page.screenshot({path:output+'/zekapark-tablet.png'});
console.log(JSON.stringify({count,failures}));
await fs.writeFile(output+'/results.json',JSON.stringify({count,failures},null,2));
await browser.close();await server.close();

if(failures.length)process.exitCode=1;
