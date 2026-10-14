import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createApiApp} from '../server/api-app.ts';
const server=createApiApp().listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;let count=0;const times=[];
try{
 for(let batch=0;batch<6;batch++)await Promise.all(Array.from({length:10},async(_,index)=>{
  const start=performance.now(),hostile=index%3===0,path=hostile?'/api/parent/student-session':index%3===1?'/api/account/export':'/api/admin/support-requests';
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(5000),...(hostile?{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:'{}'}:{})});
  assert.equal(response.status,hostile?403:401);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-frame-options'),'DENY');const value=await response.json();assert.equal(value.access_token,undefined);times.push(performance.now()-start);count++;
 }));
 times.sort((a,b)=>a-b);const p95=Math.round(times[Math.ceil(times.length*.95)-1]);assert.ok(p95<3000,'Local API guard response budget exceeded.');
 console.log(`Local API guard load: ${count} requests, concurrency 10, p95 ${p95} ms. No production users or emails involved. Authenticated production load remains a separate acceptance check.`);
}finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
