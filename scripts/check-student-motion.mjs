// Actual student components, local fixture identity, no live API or payment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
process.env.VITE_SUPABASE_URL='https://motion-fixture.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_isolated_fixture';
const server=await createServer({server:{host:'127.0.0.1',port:5188,strictPort:true},cacheDir:'/tmp/bilsem-student-motion-vite-cache'});
await server.listen();
let browser;
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',error=>{errors.push(error.message);console.error('Fixture browser:',error.message);});
  page.on('console',message=>{if(message.type()==='error')console.error('Fixture console:',message.text());});
  await page.route('https://motion-fixture.invalid/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await fs.mkdir('test-artifacts/student-motion',{recursive:true});
  const base='http://127.0.0.1:5188/tests/browser/student-motion.html';
  const root=page.locator('.bj-motion-world');
  const style=(selector,pseudo)=>page.locator(selector).first().evaluate((el,pseudo)=>({name:getComputedStyle(el,pseudo).animationName,state:getComputedStyle(el,pseudo).animationPlayState}),pseudo);
  const assertStill=async()=>{
    const active=await root.evaluate(el=>[el,...el.querySelectorAll('*')].flatMap(node=>[null,'::before','::after'].map(p=>getComputedStyle(node,p).animationName)).filter(name=>name!=='none'));
    assert.deepEqual(active,[],'Pausing must stop decorations, cards and pseudo-element beacons');
  };
  await page.goto(base);await page.getByRole('heading',{name:'Fısıldayan Orman',exact:true}).waitFor();
  assert.equal((await style('.bj-story-dialogue img')).name,'bj-guide-float');
  assert.equal((await style('.bj-expedition-scenery')).name,'bj-world-drift');
  assert.equal((await style('.bj-story-node','::after')).name,'bj-beacon');
  assert.equal(await page.locator('.bj-adventure-atmosphere>i').count(),7);
  const firstTransform=await page.locator('.bj-story-dialogue img').evaluate(el=>getComputedStyle(el).transform);
  await page.waitForFunction(previous=>getComputedStyle(document.querySelector('.bj-story-dialogue img')).transform!==previous,firstTransform);
  const pause=page.getByRole('button',{name:'Animasyonları duraklat',exact:true});
  await pause.click();await assertStill();
  await page.reload();await page.getByRole('button',{name:'Animasyonları başlat',exact:true}).waitFor();await assertStill();
  await page.getByRole('button',{name:'Animasyonları başlat',exact:true}).click();
  assert.equal((await style('.bj-story-dialogue img')).name,'bj-guide-float');
  // App backgrounding pauses rather than resetting the scene.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal((await style('.bj-story-dialogue img')).state,'paused');
  assert.equal((await style('.bj-story-node','::after')).state,'paused');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>document.querySelector('.bj-motion-world').dataset.motionPaused==='false');
  const shots=[];
  for(const width of [320,360,390,430,820]) {
    await page.setViewportSize({width,height:844});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    const hit=await pause.boundingBox();assert.ok(hit.height>=44&&hit.width>=44);
    const task=await page.locator('.bj-story-stages button').first().boundingBox();assert.ok(task.y+task.height<844);
    await page.screenshot({path:`test-artifacts/student-motion/story-${width}.png`,fullPage:true});shots.push(width);
  }
  // Each illustrated chapter keeps the motion layer and its actual navigation.
  const picturedBiomes=new Set();
  for(const chapter of ['Duran Değirmen','Bulut Gözlemevi','Kristal Geçit','Unutulan Liman','Rüzgârın Kütüphanesi','Yıldızların Şifresi','Atlasın Kalbi']){
    await page.getByRole('button',{name:'Sonraki hikâye bölümü',exact:true}).click();
    await page.getByRole('heading',{name:chapter,exact:true}).waitFor();
    assert.equal(await page.locator('.bj-story-stages button:disabled').count(),6);
    const biome=await page.locator('.bj-journey').getAttribute('data-scene');
    assert.deepEqual(await page.evaluate(()=>Array.from(document.querySelectorAll('svg [fill^="url(#"]'),el=>el.getAttribute('fill').slice(5,-1)).filter(id=>!document.getElementById(id))),[]);
    if(!picturedBiomes.has(biome)){
      await page.screenshot({path:`test-artifacts/student-motion/biome-${biome}.png`,fullPage:true,animations:'disabled'});
      picturedBiomes.add(biome);
    }
  }
  const nav=page.getByRole('navigation',{name:'Yerel kontrol'});
  await nav.getByRole('button',{name:'Çalış',exact:true}).click();
  for(const group of ['Testler','Araçlar','Gelişim']){
    await page.getByRole('navigation',{name:'Çalışma alanı grupları'}).getByRole('button',{name:group,exact:true}).click();
    await page.locator('.bj-native-feature-grid button').first().waitFor();
    assert.equal((await style('.bj-feature-key')).name,'bj-badge-float');
    await page.locator('.bj-native-feature-grid button').first().click();
    assert.ok((await page.getByLabel('Son işlem').textContent()).length>0);
  }
  // A finished entrance must release transform so the 3D press can still move.
  await page.waitForFunction(()=>document.querySelector('.bj-native-feature-grid button').getAnimations().length===0);
  const card=page.locator('.bj-native-feature-grid button').first(),box=await card.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.bj-native-feature-grid button')).transform).m42>=2.9);
  await page.mouse.up();
  await nav.getByRole('button',{name:'Ödüller',exact:true}).click();
  assert.equal(await page.locator('.bj-native-feature-grid button').count(),4);
  await page.getByRole('heading',{name:'Emeklerin parlıyor!',exact:true}).waitFor();
  assert.equal(await page.locator('.bj-reward-object').count(),4);
  for(const width of [320,360,390,430,820]){
    await page.setViewportSize({width,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`test-artifacts/student-motion/rewards-${width}.png`,fullPage:true,animations:'disabled'});
  }
  for(const [label,route] of [['Görevlerim','student-challenges'],['Rozetlerim','achievements'],['Sıralama','leaderboard'],['İlerlemem','student-progress']]){
    await page.locator('.bj-native-feature-grid button').filter({has:page.getByRole('heading',{name:label,exact:true})}).click();
    assert.equal(await page.getByLabel('Son işlem').textContent(),route);
  }
  assert.equal((await style('.bj-mission-token')).name,'bj-token-rock');
  await nav.getByRole('button',{name:'Profil',exact:true}).click();
  await page.getByRole('region',{name:'Keşif pasaportum',exact:true}).waitFor();
  await page.getByRole('heading',{name:'Merhaba, Deniz',exact:true}).waitFor();
  assert.equal(await page.getByRole('progressbar',{name:'Sonraki seviyeye ilerleme'}).getAttribute('aria-valuenow'),'20');
  for(const width of [320,360,390,430,820]){
    await page.setViewportSize({width,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`test-artifacts/student-motion/profile-${width}.png`,fullPage:true,animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});
  const reminder=page.getByRole('button',{name:'Çalışma hatırlatıcısı',exact:true});
  await reminder.scrollIntoViewIfNeeded();
  assert.equal((await style('.bj-profile-action[data-tone=sky] .bj-profile-key')).name,'bj-profile-key-nod');
  const reminderBox=await reminder.boundingBox();assert.ok(reminderBox.height>=44);
  await page.mouse.move(reminderBox.x+reminderBox.width/2,reminderBox.y+reminderBox.height/2);await page.mouse.down();
  await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.bj-profile-action')).transform).m42>=4.9);
  await page.mouse.up();assert.equal(await page.getByLabel('Son işlem').textContent(),'reminder');
  await page.getByRole('button',{name:'Veli alanı ve Google Play üyeliği',exact:true}).click();assert.equal(await page.getByLabel('Son işlem').textContent(),'parent');
  await page.getByRole('button',{name:'Sıralama',exact:true}).click();assert.equal(await page.getByLabel('Son işlem').textContent(),'leaderboard');
  await page.getByRole('button',{name:'Çıkış yap',exact:true}).click();assert.equal(await page.getByLabel('Son işlem').textContent(),'logout');
  assert.ok((await page.getByRole('link',{name:'Hesap ve veli rehberi',exact:true}).getAttribute('href')).endsWith('/bilgi/hesap-ve-veli-rehberi'));
  assert.ok((await page.getByRole('link',{name:'English · Thinking games',exact:true}).getAttribute('href')).endsWith('/en/'));
  const preferences=page.locator('.bj-profile-preferences summary');await preferences.click();
  await page.getByRole('button',{name:'Sessiz',exact:true}).click();await assertStill();
  await page.getByRole('button',{name:'Dengeli',exact:true}).click();
  assert.equal(await pause.getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Tercihleri kapat',exact:true}).click();assert.equal(await page.locator('.bj-profile-preferences details').getAttribute('open'),null);
  await page.locator('.zp-grade-settings summary').click();await page.locator('.zp-grade-settings section').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.locator('.zp-grade-settings summary').click();
  await page.locator('.zp-profile-tools summary').click();await page.locator('.zp-profile-tools-content').waitFor();await page.locator('.zp-profile-tools summary').click();
  await page.getByRole('button',{name:'Avatar kutlaması',exact:true}).click();
  assert.equal(await page.getByRole('progressbar',{name:'Sonraki seviyeye ilerleme'}).getAttribute('aria-valuenow'),'20','Decorations must not award XP');
  await page.emulateMedia({reducedMotion:'reduce'});await assertStill();await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await page.screenshot({path:'test-artifacts/student-motion/profile-dark.png',fullPage:true,animations:'disabled'});
  await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  await pause.click();await assertStill();
  await nav.getByRole('button',{name:'Macera',exact:true}).click();await assertStill();
  await page.getByRole('button',{name:'Animasyonları başlat',exact:true}).click();
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await root.waitFor();await assertStill();
  // Device preference wins even when the stored in-app preference is enabled.
  assert.equal(await pause.getAttribute('aria-pressed'),'true');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'?web=1');await page.locator('.bj-quest-path').waitFor();await page.setViewportSize({width:390,height:844});
  await page.locator('.bj-explorer-portal').scrollIntoViewIfNeeded();
  assert.equal((await style('.bj-explorer-islands')).name,'bj-explorer-hover');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal((await style('.bj-explorer-islands')).state,'paused');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal((await style('.bj-quest-start .bj-quest-coin')).name,'bj-node-bob');
  await page.locator('.bj-quest-start').click();assert.equal(await page.getByLabel('Son işlem').textContent(),'adaptive');
  await pause.click();await assertStill();
  await page.getByRole('button',{name:'Animasyonları başlat',exact:true}).click();
  await page.setViewportSize({width:390,height:300});
  await page.locator('.zp-student-topline').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.bj-quest-path').dataset.motionOffscreen==='true');
  assert.equal((await style('.bj-quest-start .bj-quest-coin')).state,'paused');
  await page.getByRole('button',{name:'Görevlerim',exact:true}).click();
  await page.getByRole('button',{name:'Çalışma alanım',exact:true}).click();
  await page.locator('.bj-quest-path').waitFor();
  await page.waitForFunction(()=>document.querySelector('.bj-quest-path').dataset.motionOffscreen==='true');
  for(const width of shots){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await page.screenshot({path:'test-artifacts/student-motion/web-dark.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({viewports:shots,chapters:8,studyGroups:3,pausedPreferencePersists:true,backgroundPauses:true,offscreenPauses:true,deviceReducedMotion:true,pageErrors:errors.length}));
} finally {await browser?.close();await server.close();}
