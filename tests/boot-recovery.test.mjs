import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../public/boot-recovery.js', import.meta.url),'utf8');
function fixture({storage=new Map(),denied=false}={}) {
  const nodes={},listeners={},redirects=[],timers=[];
  for(const id of ['root','bj-load-recovery','bj-load-message','bj-load-retry'])nodes[id]={hidden:id==='bj-load-recovery',textContent:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}};
  const document={title:'Bilsem Junior',getElementById:id=>nodes[id]};
  const window={URL,navigator:{onLine:true},location:{href:'https://zekapark.vercel.app/reset-password?code=keep#access_token=keep',replace:href=>redirects.push(href),reload:()=>redirects.push('reload')},sessionStorage:{getItem(key){if(denied)throw Error('Denied');return storage.get(key)||null;},setItem(key,value){if(denied)throw Error('Denied');storage.set(key,value);}},setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},addEventListener(name,fn){listeners[name]=fn;}};
  runInNewContext(source,{window,document,Date});
  return {window,document,nodes,redirects,timers,event:(name,extra={})=>listeners[name]({preventDefault(){},...extra})};
}
test('stale chunks reload once per tab and preserve auth redirects without clearing progress',()=>{
  const storage=new Map([['unrelated-progress','preserve']]);
  const first=fixture({storage});first.event('vite:preloadError');
  assert.equal(first.redirects.length,1);
  const url=new URL(first.redirects[0]);
  assert.equal(url.pathname,'/reset-password');assert.equal(url.searchParams.get('code'),'keep');assert.equal(url.hash,'#access_token=keep');assert.ok(url.searchParams.has('bj_refresh'));
  const next=fixture({storage});next.event('vite:preloadError');
  assert.equal(next.redirects.length,0);assert.equal(next.nodes['bj-load-recovery'].hidden,false);assert.equal(storage.get('unrelated-progress'),'preserve');
});
test('blocked session storage offers manual recovery without an automatic reload loop',()=>{
  const page=fixture({denied:true});page.event('vite:preloadError');
  assert.equal(page.redirects.length,0);assert.equal(page.nodes['bj-load-recovery'].hidden,false);
  page.nodes['bj-load-retry'].listeners.click();assert.equal(page.redirects.length,1);
});
test('the entry bundle can fail before React imports and still trigger bounded recovery',()=>{
  const page=fixture();page.event('error',{target:{tagName:'SCRIPT',type:'module'}});
  assert.equal(page.redirects.length,1);
});
test('early module failures and stalled loads are visible; late success restores the app',()=>{
  const page=fixture();page.event('unhandledrejection');
  assert.equal(page.nodes['bj-load-recovery'].hidden,false);
  page.window.__bilsemBoot.ready();
  assert.equal(page.nodes['bj-load-recovery'].hidden,true);assert.equal(page.nodes.root.hidden,false);
  page.event('unhandledrejection');assert.equal(page.nodes['bj-load-recovery'].hidden,true);
  const slow=fixture();slow.timers[0]();assert.match(slow.nodes['bj-load-message'].textContent,/uzun sürdü/);
  slow.window.navigator.onLine=false;slow.window.__bilsemBoot.fail();assert.match(slow.nodes['bj-load-message'].textContent,/İnternet/);
});
test('the recovery shell is outside the React root and its handler loads before the app',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('id="bj-load-recovery"')<html.indexOf('src="/boot-recovery.js"'));
  assert.ok(html.indexOf('src="/boot-recovery.js"')<html.indexOf('src="/src/main.tsx"'));
  assert.doesNotMatch(html,/onclick\s*=/i);
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  for(const path of ['/','/index.html','/boot-recovery.js','/boot-recovery.css'])assert.ok(config.headers.some(row=>row.source===path&&row.headers.some(h=>h.key==='Cache-Control'&&h.value.includes('no-cache'))),path);
});
