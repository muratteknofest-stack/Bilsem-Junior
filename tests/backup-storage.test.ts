import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {backupKey,decryptBackup,encryptBackup} from '../scripts/backup-crypto.mjs';
import {STORAGE_CATALOG_SQL,storageMetadataSql,storageOwnerEnvironment} from '../scripts/backup-storage-catalog.mjs';
import {canonical,captureStorageFiles,normalizedStorageCatalog,restorableStorageCatalog,sha256,storageApi,storageCatalogDigest,storageManifest,storagePath,verifyStorageManifest,STORAGE_LIMITS} from '../scripts/backup-storage-core.mjs';
import {createStorageBackup,nonSecretAuthConfig,storageServiceKey} from '../scripts/backup-storage.mjs';
import {restoreStorageManifest} from '../scripts/restore-backup-storage.mjs';
import {checkStorageReceipt} from '../scripts/release-closure.mjs';
import {statusFrom} from '../scripts/backup-status.mjs';

const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const token='sbp_'+'a'.repeat(40),localKey='local-fixture-service',anonKey='local-fixture-anon';
const ownerId='11111111-1111-4111-8111-111111111111';
function sourceCatalog(){
 const at=new Date().toISOString();
 return {buckets:[{id:'private',name:'private',public:false,type:'STANDARD',owner:null,owner_id:null,created_at:at,updated_at:at,file_size_limit:1024,allowed_mime_types:['application/octet-stream']},{id:'public',name:'public',public:true,type:'STANDARD',owner:null,owner_id:null,created_at:at,updated_at:at,file_size_limit:null,allowed_mime_types:null}],
  objects:[{id:randomUUID(),bucket_id:'private',name:'iç içe/özel % belge?.bin',owner:null,owner_id:ownerId,created_at:at,updated_at:at,metadata:{size:3,mimetype:'application/octet-stream'},user_metadata:{label:'özel'}},{id:randomUUID(),bucket_id:'public',name:'empty.bin',owner:null,owner_id:null,created_at:at,updated_at:at,metadata:{size:0,mimetype:'application/octet-stream'},user_metadata:null}],
  policies:[{schemaname:'storage',tablename:'objects',policyname:'owner_read',permissive:'PERMISSIVE',roles:['authenticated'],cmd:'SELECT',qual:"((bucket_id = 'private'::text) AND (owner_id = (auth.uid())::text))",with_check:null}],
  grants:['buckets','objects'].flatMap(table=>['anon','authenticated','service_role'].map(role=>({table,role,privilege:'SELECT',grantable:false}))),
  security:[{table:'buckets',enabled:true,forced:false},{table:'objects',enabled:true,forced:false}],
 };
}
function archive(){
 const catalog=normalizedStorageCatalog(sourceCatalog());
 const files=catalog.objects.map((o:{bucket_id:string;name:string})=>{const body=o.bucket_id==='private'?Buffer.from('abc'):Buffer.alloc(0);return {bucket_id:o.bucket_id,name:o.name,bytes:body.length,sha256:sha256(body),content:body.toString('base64'),contentType:'application/octet-stream',cacheControl:'max-age=3600'};});
 return storageManifest(catalog,files,{format:'bilsem-project-config-snapshot-v1',auth:{site_url:'https://app.example'},restoreVerified:false});
}

test('Storage writes are restricted to literal loopback and source credentials never follow redirects',async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;return Response.json([]);};
 for(const apiUrl of ['https://vtcsoqohkiagbwatlabk.supabase.co','http://localhost:54321','http://127.0.0.1.evil.test:54321','http://user:pass@127.0.0.1:54321','http://127.0.0.1:54321/storage','http://127.0.0.1:54321/?target=x'])
  assert.throws(()=>storageApi({mode:'restore',apiUrl,key:localKey,fetcher}));
 const source=storageApi({key:localKey,fetcher});
 await assert.rejects(source.createBucket({id:'private'}),{code:'STORAGE_SOURCE_WRITE'});
 await assert.rejects(source.upload({bucket_id:'private',name:'x'},{content:'',contentType:'text/plain',cacheControl:'max-age=0'}),{code:'STORAGE_SOURCE_WRITE'});
 assert.equal(calls,0);
 for(const name of ['../secret','a/../../secret','/absolute','a\\b','a//b','a/','a/./b','a\u0000b'])assert.throws(()=>storagePath(name));
 assert.equal(storagePath('Türkçe/özel %.bin'),'Türkçe/özel %.bin');
 const api=storageApi({key:localKey,fetcher:async(url,options)=>{
  assert.equal(options?.redirect,'error');assert.equal(options?.method,'GET');
  assert.equal(String(url),'https://vtcsoqohkiagbwatlabk.supabase.co/storage/v1/object/authenticated/private/T%C3%BCrk%C3%A7e/%C3%B6zel%20%25.bin');
  return new Response('abc');
 }});
 assert.equal((await api.download({bucket_id:'private',name:'Türkçe/özel %.bin'})).bytes.toString(),'abc');
});

test('Storage manifests reject missing objects, byte/hash changes, unsafe metadata, expiration and runtime fixtures',()=>{
 const m=archive(),key=randomBytes(32);
 const roundtrip=JSON.parse(decryptBackup(encryptBackup(Buffer.from(JSON.stringify(m)),key),key).toString());
 assert.deepEqual(verifyStorageManifest(roundtrip),{buckets:2,objects:2,bytes:3,privateBuckets:1});
 for(const mutate of [
  (v:typeof m)=>{v.files.pop();},(v:typeof m)=>{v.files[0].content='YWJk';},
  (v:typeof m)=>{v.files[0].bytes=4;},(v:typeof m)=>{v.files[0].sha256='0'.repeat(64);},
  (v:typeof m)=>{v.catalog.objects[0].owner_id='another-owner';},
  (v:typeof m)=>{v.catalog.buckets[0].public=true;},
  (v:typeof m)=>{v.catalog.security[0].enabled=false;},
  (v:typeof m)=>{v.files[0].name='../escape';},(v:typeof m)=>{v.settings.auth={site_url:'https://changed.example'};},
  (v:typeof m)=>{v.files[0].contentType='text/plain\r\nsecret: x';},
  (v:typeof m)=>{v.fixture=true;},
 ]){const v=clone(m);mutate(v);assert.throws(()=>verifyStorageManifest(v));}
 assert.throws(()=>verifyStorageManifest(m,{now:Date.parse(m.expiresAt)}));
 assert.throws(()=>verifyStorageManifest(m,{now:Date.parse(m.createdAt)-600_000}));
 const fixture=clone(m);fixture.fixture=true;
 assert.doesNotThrow(()=>verifyStorageManifest(fixture,{allowFixture:true}));
 const policy=clone(m.catalog);policy.policies[0].qual='true); DROP TABLE public.profiles; --';
 assert.throws(()=>storageMetadataSql(policy));
 policy.policies[0].qual='true\n\\! run-private-program';
 assert.throws(()=>storageMetadataSql(policy),'Policy text cannot inject psql meta commands');
 const duplicate=sourceCatalog();duplicate.objects.push(duplicate.objects[0]);
 assert.throws(()=>normalizedStorageCatalog(duplicate));
 const versioned=sourceCatalog();Object.assign(versioned.buckets[0],{versioning_status:'Enabled'});
 assert.throws(()=>normalizedStorageCatalog(versioned));
});

test('oversized or failed HTTP responses do not become successful files or privacy checks',async()=>{
 for(const kind of ['announced','stream','denied-server-error']){
  const api=storageApi({mode:'restore',apiUrl:'http://127.0.0.1:54321',key:localKey,fetcher:async()=>{
   if(kind==='announced')return new Response('x',{headers:{'content-length':String(STORAGE_LIMITS.objectBytes+1)}});
   if(kind==='denied-server-error')return new Response('private provider detail',{status:500});
   return new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(17*1024*1024));controller.enqueue(new Uint8Array(17*1024*1024));controller.close();}}));
  }});
  await assert.rejects(kind==='denied-server-error'?api.publicDownload({bucket_id:'private',name:'x'}):api.download({bucket_id:'private',name:'x'}),{code:kind==='denied-server-error'?'STORAGE_HTTP_500':'STORAGE_RESPONSE_LIMIT'});
 }
});

test('source capture is project-pinned, uses no writes and rejects a changed catalog',async()=>{
 const c=sourceCatalog();let reads=0;
 const fetcher=async(input:RequestInfo|URL,options?:RequestInit)=>{
  const url=String(input);assert.equal(options?.redirect,'error');assert.equal(options?.method,'GET');
  assert.ok(url.startsWith('https://api.supabase.com/v1/projects/vtcsoqohkiagbwatlabk/')||url.startsWith('https://vtcsoqohkiagbwatlabk.supabase.co/storage/v1/'));
  if(url.endsWith('/api-keys'))return Response.json([{name:'service_role',api_key:'private-source-key'}]);
  if(url.endsWith('/config/auth'))return Response.json({site_url:'https://app.example',smtp_pass:'private-password',external_google_secret:'private-secret'});
  return new Response(url.endsWith('empty.bin')?'':'abc',{headers:{'content-type':'application/octet-stream'}});
 };
 const key=backupKey(randomBytes(32).toString('base64'));
 const output=await createStorageBackup({token,key,fetcher,catalogReader:async()=>{reads++;return clone(c);}});
 assert.equal(reads,2);
 const decoded=JSON.parse(decryptBackup(output,key).toString());
 assert.equal(verifyStorageManifest(decoded).objects,2);
 assert.deepEqual(decoded.settings.auth,{site_url:'https://app.example'});
 assert.doesNotMatch(JSON.stringify(decoded),/private-source-key|private-password|private-secret/);
 reads=0;
 await assert.rejects(createStorageBackup({token,key,fetcher,catalogReader:async()=>{const v=clone(c);if(++reads===2)v.objects[0].updated_at=new Date(Date.parse(v.objects[0].updated_at)+1000).toISOString();return v;}}),{code:'STORAGE_SOURCE_CHANGED'});
 await assert.rejects(storageServiceKey(token,async()=>Response.json({private:'private-detail'},{status:403})),{code:'STORAGE_KEY_ACCESS'});
 assert.deepEqual(nonSecretAuthConfig({site_url:'https://app.example',smtp_pass:'private',jwt_secret:'private',password_min_length:12}),{site_url:'https://app.example',password_min_length:12});
});

async function isolatedFixture(){
 const db=new PGlite();
 await db.exec(`CREATE ROLE supabase_admin SUPERUSER; CREATE ROLE supabase_storage_admin; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;
 SET ROLE supabase_storage_admin;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean DEFAULT false,type text DEFAULT 'STANDARD',owner uuid,owner_id text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),file_size_limit bigint,allowed_mime_types jsonb);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text REFERENCES storage.buckets(id),name text,owner uuid,owner_id text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),metadata jsonb,user_metadata jsonb,UNIQUE(bucket_id,name));
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;GRANT ALL ON storage.buckets,storage.objects TO anon,authenticated,service_role;
 RESET ROLE;`);
 const contents=new Map<string,{body:Buffer;contentType:string;cacheControl:string}>();let uploads=0;
 const server=createServer(async(req,res)=>{
  const parts=new URL(req.url!,'http://fixture').pathname.slice('/storage/v1'.length).split('/').slice(1).map(decodeURIComponent);
  const payload=[];for await(const chunk of req)payload.push(Buffer.from(chunk));const bytes=Buffer.concat(payload);
  const json=bytes.length&&req.headers['content-type']==='application/json'?JSON.parse(bytes.toString()):null;
  const send=(value:unknown,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
  if(![localKey,anonKey].includes(String(req.headers.apikey)))return send({error:'private fixture detail'},401);
  try{
   if(parts[0]==='bucket'&&req.method==='GET')return send((await db.query<{row:unknown}>('SELECT to_jsonb(b) AS row FROM storage.buckets b')).rows.map(r=>r.row));
   if(parts[0]==='bucket'&&req.method==='POST'){await db.query('INSERT INTO storage.buckets(id,name,public,type) VALUES($1,$1,$2,$3)',[json.id,json.public,json.type]);return send({name:json.id});}
   if(parts[0]==='bucket'&&req.method==='PUT'){await db.query('UPDATE storage.buckets SET public=$2,file_size_limit=$3,allowed_mime_types=$4::jsonb WHERE id=$1',[parts[1],json.public,json.file_size_limit,JSON.stringify(json.allowed_mime_types)]);return send({message:'updated'});}
   if(parts[0]==='object'&&req.method==='POST'){
    const [bucket,...path]=parts.slice(1),name=path.join('/');uploads++;
    const contentType=String(req.headers['content-type']),cacheControl=String(req.headers['cache-control']);
    contents.set(JSON.stringify([bucket,name]),{body:bytes,contentType,cacheControl});
    await db.query('INSERT INTO storage.objects(bucket_id,name,metadata) VALUES($1,$2,$3::jsonb)',[bucket,name,JSON.stringify({size:bytes.length,mimetype:contentType})]);
    return send({Id:randomUUID(),Key:bucket+'/'+name});
   }
   if(parts[0]==='object'&&req.method==='GET'){
    const [kind,bucket,...path]=parts.slice(1),name=path.join('/');
    const b=(await db.query<{public:boolean}>('SELECT public FROM storage.buckets WHERE id=$1',[bucket])).rows[0];
    if(kind==='public'&&!b?.public)return send({error:'private'},404);
    if(kind==='authenticated'&&req.headers.apikey!==localKey)return send({error:'private'},403);
    const file=contents.get(JSON.stringify([bucket,name]));if(!file)return send({error:'missing'},404);
    res.writeHead(200,{'content-type':file.contentType,'cache-control':file.cacheControl});res.end(file.body);return;
   }
   send({error:'unexpected route'},404);
  }catch{send({error:'private database detail'},500);}
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 const readCatalog=async()=>{const r=await db.query<{jsonb_build_object:ReturnType<typeof normalizedStorageCatalog>}>(STORAGE_CATALOG_SQL);return r.rows[0].jsonb_build_object;};
 return {db,apiUrl:`http://127.0.0.1:${address.port}`,readCatalog,executeSql:async(_env:unknown,sql:string)=>{await db.exec('SET ROLE supabase_admin;'+sql+'RESET ROLE;');},get uploads(){return uploads;},close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();}};
}

test('real HTTP transfer plus PostgreSQL metadata restore preserves bytes, Turkish paths, private access, owner policies and client grants',async()=>{
 const f=await isolatedFixture();
 try{
  const m=archive();
  const receipt=await restoreStorageManifest(m,{apiUrl:f.apiUrl,serviceKey:localKey,anonKey,ownerEnv:{},readCatalog:f.readCatalog,executeSql:f.executeSql});
  assert.equal(receipt.verified,true);assert.equal(receipt.productionSource,true);assert.equal(receipt.projectConfigRestoreVerified,false);
  assert.equal(f.uploads,2);
  assert.equal(canonical(restorableStorageCatalog(await f.readCatalog())),canonical(restorableStorageCatalog(m.catalog)));
  await f.db.exec(`SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${ownerId}',false);`);
  assert.equal((await f.db.query('SELECT name FROM storage.objects')).rows.length,1,'Matching owner can see the private row');
  await f.db.exec("SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);");
  assert.equal((await f.db.query('SELECT name FROM storage.objects')).rows.length,0,'Another family cannot read the restored private row');
  await f.db.exec('RESET ROLE;');
  await assert.rejects(restoreStorageManifest(m,{apiUrl:f.apiUrl,serviceKey:localKey,anonKey,ownerEnv:{},readCatalog:f.readCatalog,executeSql:f.executeSql}),{code:'STORAGE_TARGET_NOT_EMPTY'});
  assert.equal(f.uploads,2,'A nonempty target is rejected before any overwrite');
 }finally{await f.close();}
});

test('Storage acceptance requires actual-production evidence and does not claim provider settings were restored',()=>{
 const at=new Date().toISOString();
 const r={format:'bilsem-storage-verification-v1',projectRef:'vtcsoqohkiagbwatlabk',verified:true,isolated:true,productionSource:true,checkedAt:at,buckets:3,objects:933,bytes:43562401,privateBuckets:3,filesVerified:true,bucketConfigVerified:true,ownershipVerified:true,clientAccessVerified:true,archiveSha256:'a'.repeat(64),sourceCatalogSha256:'b'.repeat(64),projectConfigRestoreVerified:false};
 assert.equal(checkStorageReceipt(r).ok,true);
 for(const patch of [{productionSource:false},{verified:false},{ownershipVerified:false},{clientAccessVerified:false},{privateBuckets:4},{objects:-1},{archiveSha256:''},{sourceCatalogSha256:''},{projectRef:'other'}, {checkedAt:new Date(Date.now()-31*86400000).toISOString()}])assert.equal(checkStorageReceipt({...r,...patch}).ok,false);
 const base={doctor:{conclusion:'ready',stages:[]},verification:{verified:true,isolated:true,checkedAt:at},storageRequired:true};
 const missing=statusFrom(base);assert.equal(missing.outcome,'incomplete');assert.equal(missing.databaseVerified,true);
 const success=statusFrom({...base,storageVerification:r});assert.equal(success.outcome,'verified');assert.equal(success.storageVerification?.projectConfigRestoreVerified,false);
 assert.throws(()=>storageOwnerEnvironment('postgresql://supabase_storage_admin:pass@external.example/db','postgresql://postgres:pass@127.0.0.1/db'));
 assert.throws(()=>storageOwnerEnvironment('postgresql://supabase_storage_admin:pass@127.0.0.1:54323/db','postgresql://postgres:pass@127.0.0.1:54322/db'));
});

test('the real restore CLI rejects corrupt and synthetic archives before network access and writes only a sanitized failure receipt',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bilsem-storage-cli-'));
 try{
  const key=randomBytes(32),input=join(dir,'private-customer-file.enc'),receiptPath=join(dir,'receipt.json');
  const fixture=archive();fixture.fixture=true;
  for(const [bytes,code] of [[Buffer.from('private-customer-data invalid ciphertext'),'STORAGE_ARCHIVE_DECRYPT'],[encryptBackup(Buffer.from(JSON.stringify(fixture)),key),'STORAGE_ARCHIVE_FORMAT']] as const){
   writeFileSync(input,bytes);
   const result=spawnSync(process.execPath,[resolve('scripts/restore-backup-storage.mjs'),input,receiptPath],{cwd:dir,encoding:'utf8',timeout:10000,env:{...process.env,BACKUP_ENCRYPTION_KEY:key.toString('base64'),RESTORE_STORAGE_API_URL:'http://127.0.0.1:54321',RESTORE_STORAGE_SERVICE_KEY:localKey,RESTORE_STORAGE_ANON_KEY:anonKey,RESTORE_DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:54322/postgres',RESTORE_STORAGE_OWNER_DATABASE_URL:'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'}});
   assert.equal(result.status,1);
   const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));
   assert.equal(receipt.verified,false);assert.equal(receipt.code,code);
   assert.equal(checkStorageReceipt(receipt).ok,false);
   assert.doesNotMatch(result.stderr+JSON.stringify(receipt),/private-customer|local-fixture|postgresql:|127\.0\.0\.1/);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
