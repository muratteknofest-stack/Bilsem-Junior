import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApiApp } from '../server/api-app';
import { manualReelSchema } from '../server/routes/reels-routes';

test('manual Reels generation accepts only supported class, level and verified topic', () => {
  for (const grade of [1, 2, 3, 4]) {
    assert.equal(manualReelSchema.safeParse({grade,difficulty:1,mechanic:'auto'}).success, true);
  }
  for (const value of [
    {grade:0,difficulty:1,mechanic:'auto'},
    {grade:5,difficulty:1,mechanic:'auto'},
    {grade:1,difficulty:3,mechanic:'auto'},
    {grade:1,difficulty:1,mechanic:'matrix-attributes'},
    {grade:1,difficulty:2,mechanic:'interleaved-sequence'},
    {grade:2,difficulty:1,mechanic:'interleaved-sequence'},
    {grade:4,difficulty:4,mechanic:'auto'},
    {grade:2,difficulty:2,mechanic:'paper-folding'},
    {grade:2,difficulty:2,mechanic:'auto',url:'https://attacker.com'},
    {grade:'2',difficulty:2,mechanic:'auto'},
  ]) assert.equal(manualReelSchema.safeParse(value).success,false,JSON.stringify(value));
});

test('Reels status and generation endpoints reject unverified anonymous callers', async () => {
  const server=createApiApp().listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();
  assert.ok(address&&typeof address==='object');
  try {
    for (const [method,path,body] of [
      ['GET','/api/admin/reels',undefined],
      ['POST','/api/admin/reels/generate',JSON.stringify({grade:2,difficulty:2,mechanic:'auto'})],
      ['POST','/api/instagram/publish',JSON.stringify({action:'verify'})],
    ] as const) {
      const response: Response = await fetch('http://127.0.0.1:'+address.port+path, {
        method, headers: {'Content-Type':'application/json'}, ...(body?{body}:{})
      });
      assert.equal(response.status,401,method+' '+path);
    }
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
  }
});

test('Reels manual pipeline is preview-only and protects publishing credentials', async () => {
  const base=new URL('../',import.meta.url);
  const workflow=await readFile(new URL('.github/workflows/bilsem-junior-reels.yml',base),'utf8');
  const route=await readFile(new URL('server/routes/reels-routes.ts',base),'utf8');
  const uploader=await readFile(new URL('scripts/reels/upload_manual_preview.py',base),'utf8');
  const admin=await readFile(new URL('src/components/AdminPanelView.tsx',base),'utf8');
  assert.match(workflow,/manual-archive:/);
  assert.match(workflow,/environment: production-reels/);
  assert.match(workflow,/if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/REEL_REQUEST_ID/);
  assert.match(workflow,/upload_manual_preview\.py/);
  assert.match(workflow,/if: github\.event_name == 'schedule' && vars\.REELS_ENABLED == 'true'/);
  assert.match(route,/requireSupabaseAuth, requireVerifiedEmail, requireProfileRole\('admin'\)/);
  assert.match(route,/sharedRateLimit\('admin-manual-reels'/);
  assert.match(route,/GITHUB_REELS_TOKEN/);
  assert.match(route,/ref: 'main'/);
  assert.doesNotMatch(route,/DEFAULT_GH_PARTS|DEFAULT_IG_TOKEN|EAAikD|ghp_/);
  assert.match(uploader,/Does NOT publish to Instagram/);
  assert.doesNotMatch(uploader,/graph\.facebook\.com|media_publish/);
  assert.match(admin,/Instagram Reels Stüdyosu/);
});
