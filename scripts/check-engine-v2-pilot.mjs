import {createServer} from 'vite';import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const output='test-artifacts/engine-v2';await mkdir(output,{recursive:true});const server=await createServer({server:{host:'127.0.0.1',port:5193,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],failures=[];let checks=0,webgl=false,contextFallback=false,pixelDifferenceRatio=null;
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:5193/tests/browser/engine-v2-pilot.html');await page.waitForSelector('.zp-answer-option');const count=await page.evaluate(()=>window.__pilotCount);
 for(const [width,height] of [[320,568],[390,844],[768,1024]]){await page.setViewportSize({width,height});
  for(let index=0;index<count;index++){
   await page.evaluate(index=>window.__showPilot(index),index);await page.waitForTimeout(45);const memory=page.getByRole('button',{name:'Deseni gizle ve cevapla'});if(await memory.isVisible())await memory.click();
   const bad=await page.evaluate(()=>{const root=document.querySelector('.zp-focus'),options=[...document.querySelectorAll('.zp-answer-option')],bad=[];
    if(root.scrollWidth>root.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1)bad.push('horizontal-overflow');if(root.scrollHeight>root.clientHeight+1)bad.push('vertical-overflow');if(options.length!==4)bad.push('missing-options');
    for(const option of options){const r=option.getBoundingClientRect();if(r.width<44||r.height<44||r.left<0||r.right>innerWidth+1||r.bottom>innerHeight+1)bad.push('option-touch-or-bounds');}
    for(const svg of document.querySelectorAll('.zp-question-visual svg,.zp-answer-option svg')){const r=svg.getBoundingClientRect();if(r.width&&r.height&&(r.left<0||r.right>innerWidth+1))bad.push('svg-overflow');}for(const svg of document.querySelectorAll('[aria-label="Semboller arası bağımsız eşitlikler"] svg')){if(svg.getBoundingClientRect().width>0&&svg.getBoundingClientRect().width<16)bad.push('symbol-too-small');}return bad;});
   if(bad.length)failures.push({width,height,index,bad});await page.locator('.zp-answer-option').first().click();if(!(await page.evaluate(()=>window.__pilotAnswer)))failures.push({width,index,bad:['answer-not-selected']});
   if((index%12===0||index===109)&&width===390)await page.screenshot({path:`${output}/question-${index}.png`});checks++;
  }console.log('viewport',width,height,'checked',count);
 }
 await page.setViewportSize({width:390,height:844});const cubeIndex=(await page.evaluate(()=>window.__pilotTypes)).indexOf('cube_counting');await page.evaluate(index=>window.__showPilot(index),cubeIndex);await page.waitForTimeout(150);
 await page.waitForTimeout(200);const geometryBefore=await page.locator('[data-spatial-scene] svg').first().evaluate(svg=>[svg.getAttribute('viewBox'),...Array.from(svg.querySelectorAll('path,polygon')).map(el=>el.getAttribute('d')||el.getAttribute('points'))]);
 const svgBefore=await page.screenshot({clip:await page.locator('[data-spatial-scene] svg').first().boundingBox(),animations:'disabled'});
 const loaded=page.waitForResponse(response=>response.url().endsWith('/models/bilsem-unit-cube.glb')&&response.status()===200).then(()=>true).catch(()=>false);
 await page.getByRole('button',{name:'3B görünüm',exact:true}).first().click();await page.waitForSelector('[data-spatial-scene] canvas',{timeout:30000});if(!await loaded)throw Error('Blender GLB was not loaded');await page.waitForTimeout(1500);
 webgl=await page.locator('canvas').evaluate(canvas=>!!canvas.getContext('webgl2'));await page.screenshot({path:`${output}/cube-webgl.png`});
 await page.locator('canvas').evaluate(canvas=>canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());await page.waitForSelector('[data-spatial-scene] svg');contextFallback=true;
 // Compare the diagram, excluding the explanatory fallback notice and controls.
 await page.locator('.zp-spatial-notice').evaluateAll(elements=>elements.forEach(el=>el.style.visibility='hidden'));
 await page.waitForTimeout(250);
 const geometryAfter=await page.locator('[data-spatial-scene] svg').first().evaluate(svg=>[svg.getAttribute('viewBox'),...Array.from(svg.querySelectorAll('path,polygon')).map(el=>el.getAttribute('d')||el.getAttribute('points'))]);
 const svgAfter=await page.screenshot({clip:await page.locator('[data-spatial-scene] svg').first().boundingBox(),animations:'disabled'});
 if(JSON.stringify(geometryBefore)!==JSON.stringify(geometryAfter))failures.push({bad:['svg-fallback-geometry-regression']});
 pixelDifferenceRatio=await page.evaluate(async([before,after])=>{
   const load=async data=>createImageBitmap(await (await fetch('data:image/png;base64,'+data)).blob()),a=await load(before),b=await load(after);
   if(Math.abs(a.width-b.width)>2||Math.abs(a.height-b.height)>2)return 1;
   const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;const c=canvas.getContext('2d');c.drawImage(a,0,0);const left=c.getImageData(0,0,a.width,a.height).data;c.clearRect(0,0,a.width,a.height);c.drawImage(b,0,0,a.width,a.height);const right=c.getImageData(0,0,a.width,a.height).data;
   let changed=0;for(let i=0;i<left.length;i+=4)if(Math.max(...[0,1,2,3].map(j=>Math.abs(left[i+j]-right[i+j])))>16)changed++;a.close();b.close();return changed/(canvas.width*canvas.height);
 },[svgBefore.toString('base64'),svgAfter.toString('base64')]);
 if(pixelDifferenceRatio>.01)failures.push({bad:['svg-fallback-pixel-regression'],pixelDifferenceRatio});
 if(!webgl)failures.push({bad:['webgl-context-unavailable']});
}catch(error){failures.push({fatal:error.message});}finally{await browser.close();await server.close();}
const result={checks,persistedPilotQuestions:100,additionalAuthoringAndContextCases:16,viewports:3,webgl,contextFallback,pixelDifferenceRatio,errors,failures};await writeFile(`${output}/results.json`,JSON.stringify(result,null,2));await writeFile('docs/question-engine-v2/mobile-report.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length||failures.length)process.exitCode=1;
