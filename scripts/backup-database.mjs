import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {encryptBackup,decryptBackup} from './backup-crypto.mjs';
import {backupManifest,verifyBackupManifest} from './backup-manifest.mjs';
import {backupConfiguration} from './backup-config.mjs';
import {postgresChildEnvironment} from './postgres-child-environment.mjs';
import {temporaryBackupAccess,backupConnectionEnvironment} from './backup-access.mjs';

// Reviewed Supabase migration filters, vendored with license and hashes. Run
// PostgreSQL 17 directly so libpq receives the verified TLS configuration.
const vendor=fileURLToPath(new URL('./vendor/supabase-cli-2.81.3/',import.meta.url));
const excluded=['information_schema','pg_*','_analytics','_realtime','_supavisor','auth','extensions','pgbouncer','realtime','storage','supabase_functions','supabase_migrations','cron','dbdev','graphql','graphql_public','net','pgmq','pgsodium','pgsodium_masks','pgtle','repack','tiger','tiger_data','timescaledb_*','_timescaledb_*','topology','vault'].join('|');
const reserved=['anon','authenticated','authenticator','cli_login_.*','dashboard_user','pgbouncer','postgres','service_role','supabase_.*','pgsodium_keyholder','pgsodium_keyiduser','pgsodium_keymaker','pgtle_admin'].join('|');
const allowedConfigs=['pgaudit.*','pgrst.*','session_replication_role','statement_timeout','track_io_timing'].join('|');
const excludedAuth=['sessions','refresh_tokens','one_time_tokens','flow_state','mfa_challenges','schema_migrations','instances'];
async function verifyTool(tool){
 await new Promise((resolve,reject)=>{
  const child=spawn(tool,['--version'],{env:postgresChildEnvironment(),stdio:['ignore','pipe','ignore'],timeout:10_000});let output='';
  child.stdout.on('data',chunk=>{if(output.length<500)output+=chunk.toString();});
  child.once('error',()=>reject(Error('PostgreSQL 17 istemci araçları gerekli.')));
  child.once('close',code=>code===0&&/\b17\./.test(output)?resolve():reject(Error('PostgreSQL 17 istemci araçları gerekli.')));
 });
}
async function dump(script,file,env){
 try{
  const child=spawn('bash',[path.join(vendor,script)],{env:postgresChildEnvironment(env),stdio:['ignore','pipe','ignore'],timeout:15*60_000});
  const exit=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error()));});
  await Promise.all([exit,pipeline(child.stdout,createWriteStream(file,{mode:0o600}))]);
 }catch{throw Error('Veritabanı dökümü doğrulanamadı; bağlantı ve kimlik bilgileri günlükte gösterilmedi.');}
}
process.umask(0o077);
const config=backupConfiguration();
const access=config.accessToken?temporaryBackupAccess(config.accessToken):async()=>config.dbUrl;
await verifyTool('pg_dump');await verifyTool('pg_dumpall');
const dir=await mkdtemp(path.join(tmpdir(),'bilsem-backup-'));
try{
 const files={};
 for(const [name,script,options] of [
  ['roles.sql','dump_role.sh',{RESERVED_ROLES:reserved,ALLOWED_CONFIGS:allowedConfigs}],
  ['schema.sql','dump_schema.sh',{EXCLUDED_SCHEMAS:excluded}],
  ['data.sql','dump_data.sh',{INCLUDED_SCHEMAS:'*',EXCLUDED_SCHEMAS:excluded}],
  ['auth-data.sql','dump_data.sh',{INCLUDED_SCHEMAS:'auth',EXCLUDED_SCHEMAS:'',EXTRA_FLAGS:excludedAuth.map(table=>`--exclude-table="auth"."${table}"`).join(' ')}],
 ]){
  const file=path.join(dir,name);
  await dump(script,file,{...backupConnectionEnvironment(await access()),...options});
  files[name]=await readFile(file,'utf8');
  if(!files[name].trim())throw Error('Boş yedek kabul edilmedi.');
 }
 for(const table of ['users','identities'])if(!new RegExp(`COPY\\s+(?:"auth"|auth)\\.(?:"${table}"|${table})\\s*\\(`,'i').test(files['auth-data.sql']))throw Error('Auth kullanıcı ve kimlik tablolarının yedeği doğrulanamadı.');
 const manifest=backupManifest(files);verifyBackupManifest(manifest);
 const archive=Buffer.from(JSON.stringify(manifest)),encrypted=encryptBackup(archive,config.key);
 if(!decryptBackup(encrypted,config.key).equals(archive))throw Error('Yedek şifreleme doğrulaması başarısız.');
 await writeFile('zekapark-database.enc',encrypted,{mode:0o600});
 console.log('Uygulama ve Auth yedeği şifrelendi; oturum verileri dışlandı. Storage nesneleri ayrıca yedeklenmelidir.');
}finally{await rm(dir,{recursive:true,force:true});}
