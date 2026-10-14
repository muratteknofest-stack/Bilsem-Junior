import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {backupKey,decryptBackup} from './backup-crypto.mjs';
import {verifyBackupManifest} from './backup-manifest.mjs';
export function isolatedRestoreTarget(value){
 const url=new URL(value||'missing:');
 if(!['postgres:','postgresql:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||!url.username||!url.password||url.search||url.hash||!/^\/[a-zA-Z0-9_]+$/.test(url.pathname))throw Error('Geri yükleme yalnızca boş, yerel ve izole Supabase veritabanına yapılabilir.');
 return {PGHOST:url.hostname==='[::1]'?'::1':url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:url.pathname.slice(1),PGSSLMODE:'disable'};
}
function psql(env,args,input){return new Promise((resolve,reject)=>{
 const child=spawn('psql',['--no-psqlrc','--set','ON_ERROR_STOP=on',...args],{env:{...process.env,...env},stdio:['pipe','pipe','ignore'],timeout:120_000});let output='';
 child.stdout.on('data',chunk=>{if(output.length<10000)output+=chunk.toString();});child.on('error',()=>reject(Error('Yerel PostgreSQL aracı başlatılamadı.')));child.on('close',code=>code===0?resolve(output.trim()):reject(Error('Geri yükleme veya ön koşul kontrolü başarısız. Başarı kaydı oluşturulmadı.')));child.stdin.end(input||'');
});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let dir;try{
  const [input]=process.argv.slice(2),env=isolatedRestoreTarget(process.env.RESTORE_DATABASE_URL);
  if(!input)throw Error('Şifreli yedek dosyası gerekli.');
  const archive=JSON.parse(decryptBackup(await readFile(input),backupKey(process.env.BACKUP_ENCRYPTION_KEY)).toString());verifyBackupManifest(archive);
  // Local Supabase must already own its managed schemas; application schema must be empty.
  await psql(env,['-c',"do $$ begin if to_regclass('auth.users') is null or to_regclass('public.profiles') is not null or exists(select 1 from auth.users) then raise exception 'Target must be a fresh local Supabase'; end if; end $$;"]);
  process.umask(0o077);dir=await mkdtemp(path.join(tmpdir(),'zekapark-restore-'));const args=['--single-transaction'];
  const defaultsFile=path.join(dir,'defaults.sql');await writeFile(defaultsFile,'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;',{mode:0o600});args.push('--file',defaultsFile);
  for(const name of ['roles.sql','schema.sql','auth-data.sql','data.sql']){
   if(/(?:^|\n)\s*\\(?:connect|c\s|!)/i.test(archive.files[name])||/\bCOPY\b[^;]*\bPROGRAM\b/i.test(archive.files[name]))throw Error('Yedekte hedef değiştiren veya dış program çalıştıran komut kabul edilmedi.');
   const file=path.join(dir,name);await writeFile(file,archive.files[name],{mode:0o600});args.push('--file',file);
  }
  const verify="do $$ begin if exists(select 1 from public.profiles p left join auth.users u on u.id=p.id where u.id is null) or exists(select 1 from auth.sessions) or exists(select 1 from public.profiles c where c.linked_parent_id is not null and not exists(select 1 from public.profiles p where p.id::text=c.linked_parent_id and c.id::text=any(p.linked_student_ids))) then raise exception 'Restore integrity failed'; end if; end $$;";
  const checkFile=path.join(dir,'verify.sql');await writeFile(checkFile,verify,{mode:0o600});args.push('--file',checkFile);await psql(env,args);
  console.log('Şifreli yedek izole yerel Supabase ortamına geri yüklendi; Auth/profil ve aile bağlantıları doğrulandı. Storage dosyaları ve e-posta giriş pilotu ayrıca doğrulanmalıdır.');
 }catch(error){console.error(error instanceof Error?error.message:'Geri yükleme doğrulanamadı.');process.exitCode=1;}finally{if(dir)await rm(dir,{recursive:true,force:true});}
}
