import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {backupKey} from './backup-crypto.mjs';
import {postgresChildEnvironment} from './postgres-child-environment.mjs';

const input=process.argv[2];
if(!input)throw Error('Şifreli yedek dosyası gerekli.');
backupKey(process.env.BACKUP_ENCRYPTION_KEY);
const archive=path.resolve(input),dir=await mkdtemp(path.join(tmpdir(),'bilsem-restore-check-'));
const clean=postgresChildEnvironment();
function run(command,args,env=clean,timeout=600_000){return new Promise((resolve,reject)=>{
 const child=spawn(command,args,{cwd:dir,env,stdio:'ignore',timeout});
 child.once('error',()=>reject(Error('İzole geri yükleme aracı başlatılamadı.')));
 child.once('close',code=>code===0?resolve():reject(Error('İzole geri yükleme kabulü başarısız; gizli değerler gösterilmedi.')));
});}
const cli=args=>run('npx',['--yes','supabase@2.81.3',...args]);
let verified=false;
try{
 await cli(['init']);
 await cli(['start','--exclude','realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
 await run(process.execPath,[fileURLToPath(new URL('./restore-backup.mjs',import.meta.url)),archive],{
  ...clean,BACKUP_ENCRYPTION_KEY:process.env.BACKUP_ENCRYPTION_KEY,
  RESTORE_DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
 });
 verified=true;
 console.log('Şifreli yedek taze yerel Supabase ortamına geri yüklendi; Auth/profil ve aile bağlantıları doğrulandı.');
}finally{
 await writeFile(path.resolve('backup-restore-verification.json'),JSON.stringify({verified,isolated:true,checkedAt:new Date().toISOString(),storageObjectsIncluded:false})+'\n',{mode:0o600});
 try{await cli(['stop','--no-backup']);}finally{await rm(dir,{recursive:true,force:true});}
}
