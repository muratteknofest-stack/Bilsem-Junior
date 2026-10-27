import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {LESSON_CATALOG} from '../src/features/lessons/catalog';
import {lessonDocument} from '../server/lesson-content';
process.env.VITE_SUPABASE_URL='https://lessons-fixture.invalid';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_lessons_fixture';
const server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:true}});await server.listen();const origin=`http://127.0.0.1:${(server.httpServer!.address() as any).port}`;
const output='test-artifacts/topic-lessons';await fs.mkdir(output,{recursive:true});let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 const context=await browser.newContext();const page=await context.newPage(),errors:string[]=[];let paidBlocked=false,humanRecording=false,audioDownloads=0;
 const wav=Buffer.alloc(48044);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();
  if(u.pathname==='/api/student/lessons/access')return route.fulfill({json:{fullAccess:!paidBlocked}});
  if(u.pathname.endsWith('/audio/0')){assert.equal(route.request().headers().authorization,'Bearer fixture-access');audioDownloads++;return route.fulfill({contentType:'audio/wav',body:wav});}
  if(u.pathname.startsWith('/api/student/lessons/')){const id=u.pathname.split('/').pop()!;const doc=lessonDocument(id);if(doc&&humanRecording)doc.audio[0]={source:'human-recording',narrator:'Fixture recording only',url:`/api/student/lessons/${id}/audio/0`};return route.fulfill({status:paidBlocked&&id!=='visual_sequence'?403:doc?200:404,json:doc});}
  if(u.pathname==='/api/admin/lesson-audio')return route.fulfill({json:{recordings:[]}});
  if(u.pathname.endsWith('/script'))return route.fulfill({json:lessonDocument(u.pathname.split('/').at(-2)!)});
  return route.continue();
 });
 // Keep the isolated browser stub free of tsx/esbuild's module-only __name helper.
 await page.addInitScript(`Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel:function(){window.voiceCancelled=(window.voiceCancelled||0)+1;},getVoices:function(){return[{lang:'tr-TR',localService:true}];},speak:function(){window.voiceStarted=true;}}});window.SpeechSynthesisUtterance=function(text){this.text=text;};const pause=HTMLMediaElement.prototype.pause;HTMLMediaElement.prototype.pause=function(){window.mediaPauses=(window.mediaPauses||0)+1;return pause.apply(this,arguments);};`);
 page.on('pageerror',e=>errors.push(e.message));let scenes=0;
 for(const [width,height]of [[320,650],[390,844],[768,1024],[1440,1000]]){
  await page.setViewportSize({width,height});await page.goto(origin+'/tests/browser/lessons.html');await page.locator('[data-lesson]').first().waitFor();assert.equal(await page.locator('[data-lesson]').count(),18);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.getByRole('searchbox',{name:'Konu anlatımı ara'}).fill('hafıza');assert.equal(await page.locator('[data-lesson]').count(),1);await page.getByRole('searchbox',{name:'Konu anlatımı ara'}).fill('');
  await page.screenshot({path:`${output}/library-${width}.png`,fullPage:true,animations:'disabled'});
  for(const card of LESSON_CATALOG){await page.locator(`[data-lesson="${card.id}"]`).click();await page.getByRole('heading',{name:lessonDocument(card.id)!.steps[0].title,exact:true}).waitFor({timeout:10000}).catch(async()=>{await page.screenshot({path:`${output}/failure-${card.id}-${width}.png`,fullPage:true,animations:'disabled'});throw Error(`Lesson ${card.id}: ${await page.locator('main').innerText()} | ${errors.join('; ')}`);});
   for(let step=0;step<4;step++){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${card.id} ${step} ${width}`);if(step<3)await page.getByRole('button',{name:'Sonraki',exact:true}).click();scenes++;}
   const doc=lessonDocument(card.id)!;await page.getByRole('radio').nth((doc.correctIndex+1)%doc.options.length).check();await page.getByRole('button',{name:'Cevabımı kontrol et',exact:true}).click();await page.getByText('Bir kez daha düşünelim.',{exact:true}).waitFor();
   await page.getByRole('radio').nth(doc.correctIndex).check();await page.getByRole('button',{name:'Cevabımı kontrol et',exact:true}).click();await page.getByText('Buldun! Kuralı yakaladın.',{exact:true}).waitFor();
   if(card.id==='visual_sequence')await page.screenshot({path:`${output}/player-${width}.png`,fullPage:true,animations:'disabled'});
   await page.getByRole('button',{name:'Bu konuda pratik yap',exact:true}).click();assert.equal(await page.evaluate(()=>window.lessonPractice),card.id);
   await page.getByRole('button',{name:'Konu kütüphanesine dön',exact:true}).click();
  }
 }
 await page.locator('[data-lesson="dice_unfold"]').click();await page.getByRole('button',{name:'Bu adımı sesli dinle'}).click();assert.equal(await page.evaluate(()=>(window as any).voiceStarted),true);
 await page.evaluate(()=>window.dispatchEvent(new Event('bilsem:android-back',{cancelable:true})));await page.locator('[data-lesson]').first().waitFor();assert.ok(await page.evaluate(()=>(window as any).voiceCancelled)>0);
 await page.locator('[data-lesson="dice_unfold"]').click();await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.bj-teaching-cube').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.getByRole('button',{name:'Konu kütüphanesine dön',exact:true}).click();await page.getByRole('searchbox',{name:'Konu anlatımı ara'}).fill('bulunmayan sözcük');await page.getByRole('status').filter({hasText:'Bu aramada konu bulunamadı'}).waitFor();
 humanRecording=true;await page.goto(origin+'/tests/browser/lessons.html');await page.locator('[data-lesson="visual_sequence"]').click();await page.getByText('İnsan kaydı · Fixture recording only',{exact:true}).waitFor();await page.getByRole('button',{name:'Bu adımı sesli dinle'}).click();await page.getByRole('button',{name:'Sesli anlatımı durdur'}).waitFor();assert.equal(audioDownloads,1);await page.getByRole('button',{name:'Konu kütüphanesine dön',exact:true}).click();assert.ok(await page.evaluate(()=>(window as any).mediaPauses)>0);humanRecording=false;
 paidBlocked=true;await page.goto(origin+'/tests/browser/lessons.html?owner=second-student');await page.locator('[data-lesson="dice_unfold"]').click();await page.getByRole('button',{name:'Velimle üyeliği incele'}).click();assert.equal(await page.evaluate(()=>window.lessonMembership),true);
 assert.deepEqual(errors,[]);console.log(`Topic lessons: ${scenes} scene/viewport checks; 18 quizzes, practice selection, filtering, voice cleanup, Android Back, paid gating and reduced motion passed.`);
}finally{await browser?.close();await server.close();}
