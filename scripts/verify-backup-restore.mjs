import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {backupKey} from './backup-crypto.mjs';
import {postgresChildEnvironment} from './postgres-child-environment.mjs';
import {diagnosticTail,runtimeFailureCategory,runtimeFailureDetails,startRuntimeWithRetry} from './backup-runtime-diagnostics.mjs';

const input=process.argv[2];
if(!input)throw Error('Şifreli yedek dosyası gerekli.');
const runtimeOnly=input==='--runtime-check';
const keyFingerprint=runtimeOnly?null:createHash('sha256').update(backupKey(process.env.BACKUP_ENCRYPTION_KEY)).digest('hex');
const archive=path.resolve(input),dir=await mkdtemp(path.join(tmpdir(),'bilsem-restore-check-'));
// Match supabase/setup-cli's registry choice for CLI versions 1.28.0–2.107.x.
// Anonymous ECR pulls on shared runners hit RATE_LIMIT. Use Supabase's official
// GHCR mirror with the same CLI-pinned image tags, never a user-supplied mirror.
const clean={...postgresChildEnvironment(),SUPABASE_INTERNAL_IMAGE_REGISTRY:'ghcr.io'};
function run(command,args,env=clean,timeout=600_000,label='yerel ortam'){return new Promise((resolve,reject)=>{
 const child=spawn(command,args,{cwd:dir,env,stdio:['ignore','ignore','pipe'],timeout});let diagnostic='';
 child.stderr.on('data',chunk=>{diagnostic=diagnosticTail(diagnostic,chunk);});
 child.once('error',()=>reject(Error('İzole geri yükleme aracı başlatılamadı.')));
 child.once('close',code=>{
  if(code===0){resolve();return;}
  const state=diagnostic.match(/SQLSTATE=((?:[0-9][0-9A-Z]{4}|P0001|XX000))\b/)?.[1];
  const location=diagnostic.match(/\b(roles|schema|auth-data|data|defaults|verify)\.sql:(\d+)\b/);
  const safe=[label,runtimeFailureCategory(diagnostic),runtimeFailureDetails(diagnostic),state&&`SQLSTATE=${state}`,location&&`${location[1]}.sql:${location[2]}`].filter(Boolean).join(' ');
  const error=Error(`İzole geri yükleme kabulü başarısız (${safe}); gizli değerler gösterilmedi.`);
  error.code=runtimeFailureCategory(diagnostic);error.details=runtimeFailureDetails(diagnostic);reject(error);
 });
});}
const cli=(args,timeout=60_000)=>run('npx',['--yes','supabase@2.81.3',...args],clean,timeout,`Supabase ${args[0]}`);
let verified=false;
try{
 await cli(['init']);
 await startRuntimeWithRetry(()=>cli(['start','--exclude','realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],240_000),()=>cli(['stop','--no-backup']));
 if(runtimeOnly){
  await run('psql',['--no-psqlrc','--set','ON_ERROR_STOP=on','--command',"do $$ begin if to_regclass('auth.users') is null or to_regclass('auth.identities') is null then raise exception 'Managed Auth schema missing'; end if; end $$;"],{...clean,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres',PGSSLMODE:'disable'},120_000,'yerel şema kontrolü');
  console.log('İzole Supabase çalışma ortamı ve Auth şeması doğrulandı; üretim verisi kullanılmadı.');
 }else{
 await run(process.execPath,[fileURLToPath(new URL('./restore-backup.mjs',import.meta.url)),archive],{
  ...clean,BACKUP_ENCRYPTION_KEY:process.env.BACKUP_ENCRYPTION_KEY,
  RESTORE_DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
 },600_000,'SQL içe aktarma');
 verified=true;
 console.log('Şifreli yedek taze yerel Supabase ortamına geri yüklendi; Auth/profil ve aile bağlantıları doğrulandı.');
 }
}finally{
 if(!runtimeOnly)await writeFile(path.resolve('backup-restore-verification.json'),JSON.stringify({verified,isolated:true,checkedAt:new Date().toISOString(),storageObjectsIncluded:false,keyFingerprint})+'\n',{mode:0o600});
 try{await cli(['stop','--no-backup']);}finally{await rm(dir,{recursive:true,force:true});}
}
