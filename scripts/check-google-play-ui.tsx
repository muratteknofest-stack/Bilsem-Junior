// Local Chromium fixture with fictional store data. No Google/API/account access.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
const output=resolve('test-artifacts/google-play-ui');await mkdir(output,{recursive:true});
const cssNames=(await readdir('dist-android/assets')).filter(name=>/^main-.*\.css$/.test(name));
if(cssNames.length!==1)throw Error('Run npm run android:build:web before this layout check.');
const css=await readFile('dist-android/assets/'+cssNames[0],'utf8');
const fixture=`
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{PlayBillingPanel}from'./src/components/PlayBillingPanel';
import{initialPlayBillingState}from'./src/lib/google-play-flow';
const ready={...initialPlayBillingState(),phase:'idle',fresh:true,storeChecked:true,
config:{ready:true,enforced:true,productId:'zekapark_uyelik',binding:{accountId:'a'.repeat(64),profileId:'b'.repeat(64)},access:{active:false,expiresAt:null}},
offers:[{basePlanId:'monthly',price:'₺299,00',period:'P1M'},{basePlanId:'quarterly',price:'₺699,00',period:'P3M'},{basePlanId:'annual',price:'₺1.499,00',period:'P1Y'}],notice:{kind:'info',text:'Döneminizi seçip Google Play ile devam edin.'}};
window.__billingActions=[];
function Fixture(){const[state,setState]=useState(ready);window.__billingShow=kind=>{
 const s=structuredClone(ready);
 if(kind==='pending'){s.pending=true;s.notice={kind:'warning',text:'Ödemeniz Google Play’de beklemede.'};}
 if(kind==='active'){s.config.access={active:true,expiresAt:'2027-01-16T12:00:00Z',autoRenewing:false};s.notice={kind:'success',text:'Aboneliğiniz doğrulandı.'};}
 if(kind==='error'){s.fresh=false;s.notice={kind:'error',text:'Bağlantı kesildi. Yeniden deneyin.'};}
 if(kind==='api-error'){s.config=null;s.fresh=false;s.offers=[];s.notice={kind:'error',text:'API uç noktası bulunamadı.'};}
 if(kind==='stale'){s.config.access={active:true,expiresAt:'2027-01-16T12:00:00Z'};s.fresh=false;s.notice={kind:'error',text:'Güncel durum doğrulanamadı.'};}
 if(kind==='closed'){s.config.ready=false;s.offers=[];s.notice={kind:'info',text:'Google Play abonelikleri henüz satışa açılmadı.'};}
 if(kind==='loading')return setState(initialPlayBillingState());
 setState(s);
};return <PlayBillingPanel studentName="Deniz Örnek" state={state} onPurchase={plan=>window.__billingActions.push(plan)} onRestore={()=>window.__billingActions.push('restore')} onRefresh={()=>window.__billingActions.push('refresh')}/>;}
createRoot(document.getElementById('root')).render(<Fixture/>);`;
await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'browser',format:'iife',outfile:resolve(output,'fixture.js'),logLevel:'silent'});
const html='<!doctype html>'+renderToStaticMarkup(<html lang="tr"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>ZekaPark yerel abonelik testi</title><style>{css}</style></head><body style={{background:'#f1f5f9'}}><main style={{maxWidth:760,margin:'0 auto',padding:12}}><p style={{fontSize:12,padding:4}}>Yerel arayüz testi · Örnek fiyatlar · Gerçek ödeme alınmaz</p><div id="root"/></main><script src="./fixture.js"/></body></html>);
await writeFile(resolve(output,'index.html'),html);
const app=express();app.use(express.static(output));app.use(express.static(resolve('public')));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 const page=await browser.newPage({viewport:{width:360,height:800},deviceScaleFactor:1});const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`);await page.getByRole('radio',{name:/Aylık/}).waitFor();
 await page.locator('.zp-play-plan-art').evaluateAll(async nodes=>{await Promise.all(nodes.map(node=>(node as HTMLImageElement).decode()));});
 if(await page.locator('.zp-play-plan-art').evaluateAll(nodes=>nodes.length!==3||nodes.some(node=>(node as HTMLImageElement).naturalWidth!==1536)))throw Error('Plan artwork did not load');
 const glyphWidth=await page.evaluate(()=>{const ctx=document.createElement('canvas').getContext('2d')!;ctx.font='16px sans-serif';return ctx.measureText('ZekaPark').width;});
 if(glyphWidth<10)throw Error('QA browser has no usable fonts; layout results would be invalid.');
 await page.getByRole('radio',{name:/Yıllık/}).check();
 if(await page.evaluate(()=>(window as any).__billingActions.length)!==0)throw Error('Selecting a plan initiated checkout');
 await page.getByRole('button',{name:'Google Play ile devam et',exact:true}).click();
 if(JSON.stringify(await page.evaluate(()=>(window as any).__billingActions))!==JSON.stringify(['annual']))throw Error('Selected plan did not reach checkout');
 await page.getByRole('button',{name:'Yenile',exact:true}).click();await page.getByRole('button',{name:'Satın alımları geri yükle',exact:true}).click();
 if(JSON.stringify(await page.evaluate(()=>(window as any).__billingActions))!==JSON.stringify(['annual','refresh','restore']))throw Error('Recovery actions did not reach handlers');
 let cases=0;
 for(const width of [320,360,390,430,768]){
  await page.setViewportSize({width,height:width<700?800:1024});
  for(const state of ['ready','pending','active','error','api-error','stale','closed','loading']){
   await page.evaluate(state=>(window as any).__billingShow(state),state);
   await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('Horizontal overflow '+width+' '+state);
   if(['pending','active','stale','closed','loading','error','api-error'].includes(state)){
    const checkout=page.getByRole('button',{name:'Google Play ile devam et',exact:true});
    if(await checkout.count()&&await checkout.isEnabled())throw Error('Unsafe checkout '+state);
   }
   if(state==='stale'&&await page.getByText('Aboneliğiniz aktif',{exact:true}).count())throw Error('Stale entitlement shown as current');
   if(state==='error'&&!(await page.getByRole('alert').count()))throw Error('Missing accessible error');
   if(state==='api-error'){
    const message=await page.getByRole('alert').innerText();
    if(message.includes('API uç noktası')||!message.includes('Yenile'))throw Error('Technical API error leaked instead of actionable recovery');
    if(await page.getByRole('radio').evaluateAll(nodes=>nodes.some(n=>!(n as HTMLInputElement).disabled)))throw Error('Unavailable plans remain selectable');
    if(await page.getByRole('button',{name:'Yenile',exact:true}).isDisabled())throw Error('Connection error prevents refresh');
   }
   if(['ready','closed','api-error'].includes(state)){
    const small=await page.getByRole('button').evaluateAll(nodes=>nodes.some(n=>n.getBoundingClientRect().height<44));if(small)throw Error('Touch target below 44px');
    await page.screenshot({path:resolve(output,`${state}-${width}.png`),fullPage:true});
   }
   cases++;
  }
 }
 await page.evaluate(()=>(window as any).__billingShow('ready'));
 // Native radio controls provide keyboard selection without custom key handlers.
 await page.getByRole('radio',{name:/Aylık/}).evaluate(node=>(node as HTMLElement).focus());await page.keyboard.press('ArrowDown');
 if(await page.getByRole('radio',{name:/3 aylık/}).isChecked()!==true)throw Error('Radio keyboard navigation failed');
 if(pageErrors.length)throw Error(pageErrors.join('; '));
 console.log(JSON.stringify({layoutCases:cases,interactions:5,pageErrors:pageErrors.length,screenshots:output}));
}finally{await browser?.close();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
