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
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/same key|unique.*key/i.test(message.text()))errors.push(message.text());});
  const screens=['modes','plan','skills','challenges','progress','tests','native-story','native-study','native-rewards','native-profile','achievements','mistakes','glossary','growth'];
  let checks=0;const layoutProblems=[];
  for(const width of [320,390,820,1440]) {
    await page.setViewportSize({width,height:width<700?844:1000});
    for(const screen of screens) {
      await page.goto(`${origin}/tests/browser/student-game.html?screen=${screen}`);
      await page.locator('.bj-student-game,.bj-game-page').first().waitFor();
      if(screen==='plan')await page.locator('#today-personalized-study-plan-card').waitFor();
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
        assert.ok(inventory.length>=6&&inventory.every(size=>size>=30),'Inventory toys must retain their full size');
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
        assert.equal(toys.length,4);assert.ok(toys.every(size=>size>=75),'Reward artwork must retain its full toy size');
      }
      checks++;
    }
  }
  for(const screen of ['plan','native-profile','native-rewards','modes']) {
    await page.setViewportSize({width:390,height:844});
    await page.goto(`${origin}/tests/browser/student-game.html?screen=${screen}`);await page.locator('.bj-student-game').first().waitFor();
    await page.evaluate(()=>document.documentElement.classList.add('dark'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`${output}/${screen}-dark.png`,fullPage:true,animations:'disabled'});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(layoutProblems,[],'Student pages must fit their viewport');
  console.log(`Student game world: ${checks} page/viewport combinations; lesson/plan navigation, material definitions, dark mode and no live writes passed.`);
} finally {await browser?.close();await server.close();}
