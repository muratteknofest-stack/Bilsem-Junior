// Local component fixture: real Chromium layout, no authenticated API/database claim.
import {createQuestionFixtureServer} from './question-fixture-server.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const output=process.env.LAYOUT_OUTPUT||'/tmp/zekapark-layout';
await fs.mkdir(output,{recursive:true});
const server=await createQuestionFixtureServer(5182);
await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}: {})});
const page=await browser.newPage({viewport:{width:360,height:640},deviceScaleFactor:1});const pageErrors=[];page.on('pageerror',e=>{pageErrors.push(e.message);console.log('ERROR',e.message);});
await page.goto('http://127.0.0.1:5182/tests/browser/question-screen.html',{waitUntil:'commit',timeout:30000});await page.waitForSelector('.zp-answer-option',{timeout:90000});await page.screenshot({path:output+'/zekapark-mobile.png'});

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
   const frame=document.querySelector('.zp-focus-visual').getBoundingClientRect();for(const svg of document.querySelectorAll('.zp-focus-visual .zp-question-visual svg')){const v=svg.getBoundingClientRect();if(v.width&&v.height&&(v.left<frame.left-1||v.right>frame.right+1||v.top<frame.top-1||v.bottom>frame.bottom+1))bad.push('clipped-question');}return bad;
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
// Every curriculum topic, both beginner and advanced, uses the real focused screen.
for(const [width,height] of [[320,480],[390,844],[768,1024]])for(const grade of [1,4]){
 await page.setViewportSize({width,height});
 for(const type of await page.evaluate(()=>window.__types)){
  await page.evaluate(({type,grade})=>window.__showComplete(type,grade,grade===1?2:6),{type,grade});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(type==='visual_memory')await page.getByRole('button',{name:'Deseni gizle ve cevapla'}).click();
  const bad=await page.evaluate(()=>{
   const root=document.querySelector('.zp-focus'),cards=[...document.querySelectorAll('.zp-answer-option')];
   const errors=cards.length===4?[]:['missing-options'];
   if(root.scrollHeight>root.clientHeight+1||root.scrollWidth>root.clientWidth+1)errors.push('overflow');
   for(const card of cards){const r=card.getBoundingClientRect();if(r.height<44||r.width<44||r.bottom>innerHeight+1||r.right>innerWidth+1)errors.push('card');for(const svg of card.querySelectorAll('svg')){const v=svg.getBoundingClientRect();if(v.top<r.top-1||v.bottom>r.bottom+1||v.left<r.left-1||v.right>r.right+1)errors.push('clipped-svg');}}
   const frame=document.querySelector('.zp-focus-visual').getBoundingClientRect();for(const svg of document.querySelectorAll('.zp-focus-visual .zp-question-visual svg')){const v=svg.getBoundingClientRect();if(v.width&&v.height&&(v.left<frame.left-1||v.right>frame.right+1||v.top<frame.top-1||v.bottom>frame.bottom+1))errors.push('clipped-question');}return errors;
  });
  if(bad.length)failures.push({width,height,grade,type,curriculum:true,result:bad});count++;
 }
}
// New reasoning families need multiple seeds: long sequences, inverse machines,
// scoped counts and 6-person deductions exercise different layouts of one type.
for(const [width,height] of [[320,480],[390,844],[667,375],[768,1024]])for(const type of ['number_pattern','operation_machine','shape_counting','logic_grid','matrix_3x3','figure_rotation'])for(let sample=1;sample<=6;sample++){
 await page.setViewportSize({width,height});
 await page.evaluate(({type,seed})=>window.__showReasoning(type,seed),{type,seed:sample*7919});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const bad=await page.evaluate(()=>{
  const root=document.querySelector('.zp-focus'),cards=[...document.querySelectorAll('.zp-answer-option')],frame=document.querySelector('.zp-focus-visual').getBoundingClientRect(),errors=[];
  if(cards.length!==4)errors.push('missing-options');
  if(root.scrollHeight>root.clientHeight+1||root.scrollWidth>root.clientWidth+1)errors.push('overflow');
  for(const card of cards){const r=card.getBoundingClientRect();if(r.height<44||r.width<44||r.top<0||r.bottom>innerHeight+1||r.right>innerWidth+1)errors.push('card');}
  for(const svg of document.querySelectorAll('.zp-focus-visual .zp-question-visual svg')){const v=svg.getBoundingClientRect();if(v.width&&v.height&&(v.left<frame.left-1||v.right>frame.right+1||v.top<frame.top-1||v.bottom>frame.bottom+1))errors.push('clipped-question');}
  return errors;
 });
 if(bad.length)failures.push({width,height,type,sample,reasoning:true,result:bad});count++;
 if(width===390&&sample===1)await page.screenshot({path:output+'/reasoning-'+type+'.png'});
}
await page.evaluate(()=>window.__show('mirror_reflection',3));
await page.getByRole('button',{name:'Sorular ve çalışma araçları'}).click();
if(!await page.locator('dialog[open]').isVisible())throw Error('Tools dialog did not open');
await page.keyboard.press('Escape');
// Expanding/collapsing mobile browser controls changes usable portrait height.
for(const height of [700,510,740]){await page.setViewportSize({width:360,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const overflow=await page.evaluate(()=>{const root=document.querySelector('.zp-focus');return root.scrollHeight>root.clientHeight+1;});if(overflow)failures.push({height,result:['viewport-resize-overflow']});count++;}
await page.setViewportSize({width:768,height:1024});await page.evaluate(()=>window.__show('mirror_reflection',3));await page.screenshot({path:output+'/zekapark-tablet.png'});
if(pageErrors.length)failures.push({pageErrors});console.log(JSON.stringify({count,failures}));
await fs.writeFile(output+'/results.json',JSON.stringify({count,failures},null,2));
await browser.close();await server.close();

if(failures.length)process.exitCode=1;

