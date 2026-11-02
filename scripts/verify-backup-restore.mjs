import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {backupKey,decryptBackup} from './backup-crypto.mjs';
import {verifyBackupManifest} from './backup-manifest.mjs';
import {readFile} from 'node:fs/promises';
import {postgresChildEnvironment} from './postgres-child-environment.mjs';
import {diagnosticTail,runtimeFailureCategory,runtimeFailureDetails,startRuntimeWithRetry} from './backup-runtime-diagnostics.mjs';
import {AUTH_RUNTIME_SCHEMA_SQL} from './backup-runtime-schema.mjs';
import {decodeStorageArchive,localStorageCredentials} from './restore-backup-storage.mjs';

const input=process.argv[2];
if(!input)throw Error('Şifreli yedek dosyası gerekli.');
const runtimeOnly=input==='--runtime-check';
const storageArchive=!runtimeOnly&&process.argv[3]?path.resolve(process.argv[3]):null;
const keyFingerprint=runtimeOnly?null:createHash('sha256').update(backupKey(process.env.BACKUP_ENCRYPTION_KEY)).digest('hex');
const archive=path.resolve(input),dir=await mkdtemp(path.join(tmpdir(),'bilsem-restore-check-'));
// CLI 2.122.0 pins these official images; Auth 2.197.0 includes the source
// managed schema baseline. Prefetch sequentially with an empty private Docker
// config. Keep slim images disabled so the prefetched and started images match.
// Source: https://github.com/supabase/cli/blob/v2.122.0/apps/cli/src/shared/services/Dockerfile
const clean={...postgresChildEnvironment(),SUPABASE_INTERNAL_IMAGE_REGISTRY:'docker.io',SUPABASE_USE_SLIM_IMAGES:'false',DOCKER_CONFIG:path.join(dir,'docker-config')};
const runtimeImages=Object.freeze([
 ['Postgres','supabase/postgres:17.11.0.006'],
 ['Auth','supabase/gotrue:v2.197.0'],
 ['Storage','supabase/storage-api:v1.84.19'],
 ['Gateway','library/kong:2.8.1'],
]);
function run(command,args,env=clean,timeout=600_000,label='yerel ortam',capture=false){return new Promise((resolve,reject)=>{
 const child=spawn(command,args,{cwd:dir,env,stdio:['ignore',capture?'pipe':'ignore','pipe'],timeout});let diagnostic='',output='',overflow=false;
 if(capture)child.stdout.on('data',chunk=>{if(Buffer.byteLength(output)+chunk.length>65536){overflow=true;child.kill();}else output+=chunk.toString();});
 child.stderr.on('data',chunk=>{diagnostic=diagnosticTail(diagnostic,chunk);});
 child.once('error',()=>reject(Error('İzole geri yükleme aracı başlatılamadı.')));
 child.once('close',code=>{
  if(code===0&&!overflow){resolve(output);return;}
  const state=diagnostic.match(/SQLSTATE=((?:[0-9][0-9A-Z]{4}|P0001|XX000))\b/)?.[1];
  const location=diagnostic.match(/\b(roles|schema|auth-schema|auth-data|data|defaults|verify)\.sql:(\d+)\b/);
  const storageCode=diagnostic.match(/\bSTORAGE_[A-Z0-9_]{1,48}\b/)?.[0];
  const safe=[label,runtimeFailureCategory(diagnostic),runtimeFailureDetails(diagnostic),state&&`SQLSTATE=${state}`,location&&`${location[1]}.sql:${location[2]}`,storageCode].filter(Boolean).join(' ');
  const error=Error(`İzole geri yükleme kabulü başarısız (${safe}); gizli değerler gösterilmedi.`);
  error.code=runtimeFailureCategory(diagnostic);error.details=runtimeFailureDetails(diagnostic);reject(error);
 });
});}
const cli=(args,timeout=60_000,capture=false)=>run('npx',['--yes','supabase@2.122.0',...args],clean,timeout,`Supabase ${args[0]}`,capture);
const startedAt=Date.now();let verified=false,archiveMetadata=null;
try{
 if(!runtimeOnly){const manifest=JSON.parse(decryptBackup(await readFile(archive),backupKey(process.env.BACKUP_ENCRYPTION_KEY)).toString());verifyBackupManifest(manifest);archiveMetadata={archiveCreatedAt:manifest.createdAt,archiveExpiresAt:manifest.expiresAt};}
 if(storageArchive)await decodeStorageArchive(storageArchive,backupKey(process.env.BACKUP_ENCRYPTION_KEY));
 await mkdir(clean.DOCKER_CONFIG,{mode:0o700});
 await cli(['init']);
 // This isolated backend may need to reproduce bucket limits above the local
 // CLI default. Actual backup payloads remain bounded separately to 128 MiB.
 const configPath=path.join(dir,'supabase/config.toml');
 const config=await readFile(configPath,'utf8');let storageSection=false;
 const localConfig=config.replace(/(\[storage\]\r?\n)([\s\S]*?)(?=\r?\n\[|$)/,(all,header,body)=>{
  if(!/^file_size_limit\s*=/m.test(body))throw Error('İzole Storage boyut ayarı doğrulanamadı.');
  storageSection=true;return header+body.replace(/^file_size_limit\s*=.*$/m,'file_size_limit = "5GiB"');
 });
 if(!storageSection)throw Error('İzole Storage yapılandırması bulunamadı.');
 await writeFile(configPath,localConfig,{mode:0o600});
 for(const [service,image] of runtimeImages){
  await run('docker',['pull',image],clean,240_000,`${service} image pull`);
  console.log(`${service} resmî imajı hazır.`);
 }
 await startRuntimeWithRetry(()=>cli(['start','--exclude','realtime,imgproxy,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],240_000),()=>cli(['stop','--no-backup']));
 await run('psql',['--no-psqlrc','--set','ON_ERROR_STOP=on','--command',AUTH_RUNTIME_SCHEMA_SQL],{...clean,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres',PGSSLMODE:'disable'},120_000,'yerel şema kontrolü');
 if(runtimeOnly){
  // CLI v2.122.0 provisions the local Auth owner with dbConfig.Password.
  // Roll back a harmless DDL probe; do not change roles or managed grants.
  await run('psql',['--no-psqlrc','--set','ON_ERROR_STOP=on','--command','BEGIN; ALTER TABLE auth.users ADD COLUMN bilsem_isolated_restore_probe boolean; ROLLBACK;'],{...clean,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'supabase_auth_admin',PGPASSWORD:'postgres',PGDATABASE:'postgres',PGSSLMODE:'disable'},120_000,'yerel Auth sahibi kontrolü');
  const storage=localStorageCredentials(JSON.parse(await cli(['status','--output','json'],60_000,true)));
  await run('node',[fileURLToPath(new URL('./check-backup-storage-runtime.mjs',import.meta.url))],{...clean,...storage,RESTORE_DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:54322/postgres',RESTORE_STORAGE_OWNER_DATABASE_URL:'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'},120_000,'yerel Storage kabulü');
  console.log('İzole Supabase çalışma ortamı ve Auth şeması doğrulandı; üretim verisi kullanılmadı.');
  console.log('İzole Storage dosya, sahiplik ve erişim geri yükleme provası da geçti; üretim yedeği makbuzu oluşturulmadı.');
 }else{
 await run(process.execPath,[fileURLToPath(new URL('./restore-backup.mjs',import.meta.url)),archive],{
  ...clean,BACKUP_ENCRYPTION_KEY:process.env.BACKUP_ENCRYPTION_KEY,
  RESTORE_DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  RESTORE_AUTH_OWNER_DATABASE_URL:'postgresql://supabase_auth_admin:postgres@127.0.0.1:54322/postgres',
 },600_000,'SQL içe aktarma');
 verified=true;
 console.log('Şifreli yedek taze yerel Supabase ortamına geri yüklendi; Auth/profil ve aile bağlantıları doğrulandı.');
 if(storageArchive){
  const storage=localStorageCredentials(JSON.parse(await cli(['status','--output','json'],60_000,true)));
  await run(process.execPath,[fileURLToPath(new URL('./restore-backup-storage.mjs',import.meta.url)),storageArchive,path.resolve('backup-storage-verification.json')],{...clean,...storage,BACKUP_ENCRYPTION_KEY:process.env.BACKUP_ENCRYPTION_KEY,RESTORE_DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:54322/postgres',RESTORE_STORAGE_OWNER_DATABASE_URL:'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'},600_000,'Storage içe aktarma');
  console.log('Storage arşivi de izole API üzerinden geri yüklendi; dosya hash, alan, sahiplik ve erişim kontrolleri geçti.');
 }
 }
}finally{
 if(!runtimeOnly)await writeFile(path.resolve('backup-restore-verification.json'),JSON.stringify({verified,isolated:true,checkedAt:new Date().toISOString(),startedAt:new Date(startedAt).toISOString(),durationMs:Date.now()-startedAt,storageObjectsIncluded:false,keyFingerprint,...archiveMetadata})+'\n',{mode:0o600});
 try{await cli(['stop','--no-backup']);}finally{await rm(dir,{recursive:true,force:true});}
}
