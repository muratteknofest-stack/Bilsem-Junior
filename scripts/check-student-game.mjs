import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';

process.env.VITE_SUPABASE_URL='https://game-fixture.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_isolated_fixture';
const server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:true}});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const output='test-artifacts/student-game-world';await fs.mkdir(output,{recursive:true});
let browser;
try {
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[],externalFontRequests=[];
  page.on('request', request=>{if(/fonts\.(googleapis|gstatic)\.com/.test(request.url()))externalFontRequests.push(request.url());});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/same key|unique.*key/i.test(message.text()))errors.push(message.text());});
  const screens=['modes','plan','skills','challenges','progress','tests','native-story','native-study','native-rewards','native-profile','achievements','mistakes','glossary','growth','native-story-progress','native-story-complete','native-story-library','native-story-collection','story-result'];
  const openScreen=async screen=>{
    await page.goto(`${origin}/tests/browser/student-game.html?screen=${screen}`);
    await page.locator('.bj-student-game,.bj-game-page').first().waitFor();
    if(screen==='native-story-library')await page.getByRole('button',{name:'Hikâyeler',exact:true}).click();
    if(screen==='native-story-collection')await page.getByRole('button',{name:'Koleksiyonum',exact:true}).click();
    if(screen==='native-story-complete')await page.getByRole('button',{name:'Önceki hikâye bölümü',exact:true}).click();
  };
  const checkStoryContrast=async()=>{
    const ratios=await page.evaluate(()=>{
      const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
      const luminance=color=>rgb(color).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
      const contrast=(text,bg)=>{const a=luminance(text),b=luminance(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
      const card=document.querySelector('.bj-story-stages li[data-state=current] .bj-journey-node-copy');
      const button=document.querySelector('.bj-journey-continue');
      return [[card,['strong','small','span']],[button,[null]]].flatMap(([container,selectors])=>{
        const style=getComputedStyle(container),stops=style.backgroundImage.match(/rgba?\([^)]+\)/g)||[style.backgroundColor];
        return selectors.map(selector=>{const target=selector?container.querySelector(selector):container;return{selector:selector||'continue',ratio:Math.min(...stops.map(bg=>contrast(getComputedStyle(target).color,bg)))};});
      });
    });
    assert.ok(ratios.every(item=>item.ratio>=4.5),`Story text contrast: ${JSON.stringify(ratios)}`);
  };
  let checks=0;const layoutProblems=[];
  for(const width of [320,390,820,1440]) {
    await page.setViewportSize({width,height:width<700?844:1000});
    for(const screen of screens) {
      await openScreen(screen);
      if(screen==='modes') {
        const fonts=await page.evaluate(async()=>{
          const loaded=await Promise.all([document.fonts.load('600 16px Outfit','ĞğİıŞşÇçÖöÜü'),document.fonts.load('600 16px "Plus Jakarta Sans"','ĞğİıŞşÇçÖöÜü')]);
          return loaded.map(faces=>faces.length>0&&faces.every(face=>face.status==='loaded'));
        });
        assert.deepEqual(fonts,[true,true],'Local Turkish fonts must load without an external provider');
      }
      if(screen==='plan')await page.locator('#today-personalized-study-plan-card').waitFor();
      if(screen==='native-story-progress')await checkStoryContrast();
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) {
        const offenders=await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).map(el=>({tag:el.tagName,cls:el.className?.baseVal??el.className,box:el.getBoundingClientRect(),text:(el.textContent||'').slice(0,70)})).filter(el=>el.box.width>0&&(el.box.right>innerWidth+1||el.box.left< -1)).slice(-16).map(el=>({tag:el.tag,cls:el.cls,left:el.box.left,right:el.box.right,text:el.text})));
        layoutProblems.push({screen,width});console.error(JSON.stringify({screen,width,offenders}));
        await page.screenshot({path:`${output}/overflow-${screen}-${width}.png`,fullPage:true,animations:'disabled'});
      }
      const broken=await page.evaluate(()=>Array.from(document.querySelectorAll('svg [fill^="url(#"]'),el=>el.getAttribute('fill').slice(5,-1)).filter(id=>!document.getElementById(id)));
      assert.deepEqual(broken,[],`${screen} has unresolved material definitions`);
      if(width===390||width===1440&&['modes','skills','native-story'].includes(screen))await page.screenshot({path:`${output}/${screen}-${width}.png`,fullPage:true,animations:'disabled'});
      if(screen==='modes') {
        const portal=page.getByRole('region',{name:'Junior ile keşif adası',exact:true});
        await portal.locator('.bj-explorer-guide').evaluate(image=>image.decode());
        assert.ok(await portal.locator('.bj-explorer-guide').evaluate(image=>image.naturalWidth>0),'The local guide must load');
        const inventory=await page.locator('.bj-inventory-art>.bj-game-art>svg').evaluateAll(items=>items.map(el=>el.getBoundingClientRect().width));
        assert.equal(inventory.length,3,'Three primary destinations keep the workspace focused');
        assert.ok(inventory.every(size=>size>=44),'Primary objects must remain legible');
        const more=page.locator('.bj-more-navigation');
        assert.equal(await more.locator('nav button:visible').count(),0);
        await more.locator('summary').click();
        assert.equal(await more.locator('nav button:visible').count(),4,'All secondary areas remain reachable');
        await more.locator('summary').click();
        await page.getByRole('button',{name:'Çalışmaya başla',exact:true}).click();
        assert.equal(await page.getByLabel('İşlem kaydı').textContent(),'adaptive');
        if(width<1000){
          const drawer=page.getByRole('button',{name:'Hedeflerim ve serim',exact:false});
          assert.equal(await page.locator('.zp-daily-snapshot').isVisible(),false);
          await drawer.click();assert.equal(await page.locator('.zp-daily-snapshot').isVisible(),true);
          await drawer.click();assert.equal(await page.locator('.zp-daily-snapshot').isVisible(),false);
        }
        await page.getByRole('button',{name:'Konu Anlatımları',exact:false}).click();
        assert.equal(await page.getByLabel('İşlem kaydı').textContent(),'student-lessons');
      }
      if(screen==='native-study') {
        const objects=await page.locator('.bj-game-feature-art>.bj-game-art>svg').evaluateAll(items=>items.map(el=>el.getBoundingClientRect().width));
        assert.ok(objects.length>0&&objects.every(size=>size>=104),'Study objects must retain the enlarged size');
        await page.getByRole('region',{name:'Junior ile keşif adası',exact:true}).getByRole('button',{name:'Konu Anlatımları',exact:true}).click();
        assert.equal(await page.getByLabel('İşlem kaydı').textContent(),'student-lessons');
        await page.getByRole('button').filter({has:page.getByRole('heading',{name:'Konu Anlatımları',exact:true})}).click();
        assert.equal(await page.getByLabel('İşlem kaydı').textContent(),'student-lessons');
        await page.getByRole('button',{name:'Gelişim',exact:true}).click();
        await page.getByRole('button').filter({has:page.getByRole('heading',{name:'Kişisel Planım',exact:true})}).click();
        assert.equal(await page.getByLabel('İşlem kaydı').textContent(),'student-plan');
      }
      if(screen==='native-rewards') {
        const toys=await page.locator('.bj-reward-object>.bj-game-art>svg').evaluateAll(items=>items.map(el=>el.getBoundingClientRect().width));
        assert.equal(toys.length,4);assert.ok(toys.every(size=>size>=104),'Reward objects must retain the enlarged size');
      }
      if(screen==='native-study'||screen==='native-rewards') {
        const overlaps=await page.locator('.bj-native-feature-grid>button').evaluateAll(cards=>cards.map(card=>{
          const art=card.querySelector('.bj-game-art>svg').getBoundingClientRect();
          const copy=card.querySelector('h2').getBoundingClientRect();
          return art.bottom>copy.top+1;
        }));
        assert.ok(overlaps.every(overlap=>!overlap),'Enlarged objects must not overlap card titles');
      }
      if(width===390&&['modes','native-study','native-story-progress'].includes(screen)&&process.env.BILSEM_STUDENT_VISUAL_PREVIEW==='1') {
        const preview=await page.screenshot({type:'jpeg',quality:65,fullPage:true,animations:'disabled'});
        console.log(`BILSEM_STUDENT_PREVIEW_${screen}:`+preview.toString('base64'));
      }
      if(screen==='native-story-progress') {
        assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),2);
        assert.equal(await page.locator('.bj-story-stages button:disabled').count(),3);
        assert.equal(await page.getByRole('progressbar',{name:'Bu bölümde tamamlanan görevler',exact:true}).getAttribute('aria-valuenow'),'2');
        await page.locator('.bj-story-stages li[data-state=current] button').click();
        assert.match(await page.getByLabel('İşlem kaydı').textContent(),/:2$/);
        await page.locator('.bj-story-stages li[data-state=complete] button').first().click();
        assert.match(await page.getByLabel('İşlem kaydı').textContent(),/:0$/);
        assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),2,'Decorative interactions cannot advance a stage');
      }
      if(screen==='native-story-complete') {
        assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),6);
        assert.equal(await page.getByRole('progressbar',{name:'Bu bölümde tamamlanan görevler',exact:true}).getAttribute('aria-valuenow'),'6');
        await page.getByRole('button',{name:'Sıradaki bölümü aç',exact:false}).click();
        assert.equal(await page.getByRole('progressbar',{name:'Bu bölümde tamamlanan görevler',exact:true}).getAttribute('aria-valuenow'),'0');
      }
      if(screen==='story-result')assert.equal(await page.getByRole('meter',{name:'Macera yıldızları',exact:true}).getAttribute('aria-valuenow'),'3.5');
      checks++;
    }
  }
  for(const screen of ['plan','native-profile','native-rewards','modes','native-story-progress','native-story-library','native-story-collection','story-result']) {
    await page.setViewportSize({width:390,height:844});
    await openScreen(screen);
    await page.evaluate(()=>document.documentElement.classList.add('dark'));
    if(screen==='native-story-progress')await checkStoryContrast();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`${output}/${screen}-dark.png`,fullPage:true,animations:'disabled'});
  }
  assert.deepEqual(externalFontRequests,[],'Opening student screens must not contact Google Fonts');
  assert.deepEqual(errors,[]);assert.deepEqual(layoutProblems,[],'Student pages must fit their viewport');
  console.log(`Student game world: ${checks} page/viewport combinations; lesson/plan navigation, story locking/replay/chapter progress, proportional result stars, material definitions, dark mode and no live writes passed.`);
} finally {await browser?.close();await server.close();}
