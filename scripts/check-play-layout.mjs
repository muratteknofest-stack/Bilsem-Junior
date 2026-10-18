import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PlayMembershipPage} from '../src/components/PlayMembershipPage.tsx';
import express from 'express';
import {chromium} from 'playwright';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const app=express();app.use('/sales',express.static('public/sales'));app.use('/logo.svg',express.static('public/logo.svg'));
app.get('/',(req,res)=>res.send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/sales/sales.css"></head><body>'+renderToStaticMarkup(React.createElement(PlayMembershipPage,{brand:'ZekaPark',storeUrl:null,ready:false}))+'</body></html>'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage();for(const width of [320,360,390,768,1024,1440]){await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);assert.equal(await page.locator('.zp-plan-card').count(),3);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.ok(!(await page.content()).includes('shopier.com'));}console.log('6 Google Play public membership layouts passed.');}finally{await browser.close();server.close();}
