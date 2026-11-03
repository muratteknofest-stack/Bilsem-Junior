import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output = 'test-artifacts/app-audio';
await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: true } });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const reports = [];
  for (const [platform,width,height] of [['web',1280,900],['android',360,640]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: platform === 'android' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.audioContexts = 0; window.audioOscillators = 0;
      const Context = window.AudioContext;
      window.AudioContext = class extends Context {
        constructor(...args) { super(...args); window.audioContexts++; }
        createOscillator() { window.audioOscillators++; return super.createOscillator(); }
      };
    });
    const snapshot = () => page.evaluate(() => ({ contexts: window.audioContexts, voices: window.audioOscillators, scene: window.audioTest.sound.musicScene, playing: window.audioTest.sound.musicPlaying, enabled: window.audioTest.sound.enabled }));
    await page.goto(`${base}/tests/browser/app-audio.html`);
    await page.getByRole('button', { name: 'Lobi', exact: true }).waitFor();
    assert.deepEqual(await snapshot(), { contexts:0, voices:0, scene:'lobby', playing:false, enabled:true });
    await page.locator('#effect').evaluate(el => el.click());
    assert.equal((await snapshot()).contexts, 0, 'synthetic clicks must not start audio');
    await page.locator('#effect').click();
    await page.waitForFunction(() => window.audioTest.sound.musicPlaying);
    assert.equal((await snapshot()).contexts, 1);
    await page.getByRole('button', { name:'Profil',exact:true }).click();
    await page.waitForFunction(() => window.audioTest.sound.musicScene === 'profile');
    assert.equal((await snapshot()).playing, true);
    for (const label of ['Sorular','Konu']) {
      await page.getByRole('button', { name:label,exact:true }).click();
      await page.waitForFunction(() => window.audioTest.sound.musicScene === null);
      assert.equal((await snapshot()).playing, false);
    }
    await page.getByRole('button',{name:'Lobi',exact:true}).click();
    await page.getByText('Görünüm ve ses',{exact:true}).click();
    await page.getByRole('button',{name:'Müziği kapat',exact:true}).click();
    assert.equal((await snapshot()).playing, false);
    const before = (await snapshot()).voices;
    await page.getByRole('button',{name:'Sesi dene',exact:true}).click();
    assert.equal((await snapshot()).voices,before+3,'effects remain available with music muted');
    await page.getByRole('button',{name:'Müziği aç',exact:true}).click();
    await page.getByRole('slider',{name:'Müzik düzeyi',exact:true}).fill('20');
    assert.equal(await page.evaluate(()=>window.audioTest.sound.musicVolume), .2);
    await page.getByRole('button',{name:'Öğrenci seslerini kapat',exact:true}).click();
    assert.equal((await snapshot()).playing, false);
    await page.reload(); await page.getByText('Görünüm ve ses',{exact:true}).click();
    assert.equal((await snapshot()).contexts, 0); assert.equal((await snapshot()).enabled, false);
    assert.equal(await page.getByRole('slider',{name:'Müzik düzeyi',exact:true}).inputValue(),'20');
    await page.getByRole('button',{name:'Öğrenci seslerini aç',exact:true}).click();
    await page.waitForFunction(()=>window.audioTest.sound.musicPlaying);
    await page.getByRole('button',{name:'Tercihleri kapat',exact:true}).click();
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
    assert.equal((await snapshot()).playing,false);
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow')));
    await page.waitForFunction(()=>window.audioTest.sound.musicPlaying);
    await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal((await snapshot()).playing,false);
    await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForFunction(()=>window.audioTest.sound.musicPlaying);
    assert.equal((await snapshot()).contexts,1,'route/mute/lifecycle changes reuse one audio context');
    const rendered = await page.evaluate(async()=>{
      const results=[];
      for(const [scene,theme] of Object.entries(window.audioTest.MUSIC_THEMES)) {
        const rate=22050,beat=60/theme.bpm,ctx=new OfflineAudioContext(1,Math.ceil((theme.beats*beat+1)*rate),rate);
        const gain=ctx.createGain();gain.gain.value=.45*.3;gain.connect(ctx.destination);
        theme.notes.forEach(note=>window.audioTest.scheduleMusicNote(ctx,gain,note,.05+note.beat*beat,beat,()=>{}));
        const buffer=await ctx.startRendering(),data=buffer.getChannelData(0);let peak=0,energy=0;
        for(const sample of data){peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}
        results.push({scene,peak,rms:Math.sqrt(energy/data.length),seconds:buffer.duration});
      }
      return results;
    });
    for(const result of rendered){assert.ok(result.peak>.005 && result.peak<.25);assert.ok(result.rms>.0005 && result.rms<.04);}
    assert.notEqual(rendered[0].seconds,rendered[1].seconds);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.getByText('Görünüm ve ses',{exact:true}).click();
    await page.screenshot({path:`${output}/${platform}-controls.png`,animations:'disabled'});
    await page.evaluate(()=>window.audioTest.unmount());
    assert.equal((await snapshot()).playing,false);
    assert.deepEqual(errors,[]); reports.push({platform,rendered,errors,passed:true}); await context.close();
  }
  await fs.writeFile(`${output}/report.json`,JSON.stringify(reports,null,2)+'\n');
  console.log('Web and Android audio: gesture gate, trusted effects, distinct rendered scores, routes, preferences, lifecycle and cleanup passed.');
} finally { await browser?.close(); await server.close(); }
