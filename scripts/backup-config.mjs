import {appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {PRODUCTION_SUPABASE_ORIGIN} from '../shared/supabase-environment.mjs';
import {backupKey} from './backup-crypto.mjs';

/** Validate before any database connection; error messages contain no values. */
export const BACKUP_PROJECT_REF=new URL(PRODUCTION_SUPABASE_ORIGIN).hostname.split('.')[0];
export function validatedBackupUrl(value){
 let url;
 try{url=new URL(value);}catch{throw Error('SUPABASE_DB_URL biçimi geçersiz; bağlantı değeri günlükte gösterilmedi.');}
 const project=BACKUP_PROJECT_REF;
 const direct=url.hostname===`db.${project}.supabase.co`;
 const pooler=/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)&&url.username.endsWith(`.${project}`);
 if(!['postgres:','postgresql:'].includes(url.protocol)||(!direct&&!pooler)||!url.username||!url.password||url.pathname!=='/postgres'||url.hash||url.port&&url.port!=='5432')
  throw Error('Yedek bağlantısı beklenen Bilsem Junior projesinin doğrudan veya session pooler PostgreSQL adresi olmalıdır.');
 // libpq query parameters such as host/dbname/service must not override the
 // checked hostname, project or database when passed to pg_dump.
 if([...url.searchParams.keys()].some(name=>name!=='sslmode'))throw Error('Yedek bağlantısında hedef değiştiren veya desteklenmeyen parametre var.');
 url.searchParams.set('sslmode','verify-full');
 return url.toString();
}
export function backupConfiguration(env=process.env){
 const missing=[];
 if(!env.SUPABASE_ACCESS_TOKEN?.trim()&&!env.SUPABASE_DB_URL?.trim())missing.push('SUPABASE_DB_URL veya SUPABASE_ACCESS_TOKEN');
 if(!env.BACKUP_ENCRYPTION_KEY?.trim())missing.push('BACKUP_ENCRYPTION_KEY');
 if(missing.length)throw Error(`production-backup ortamında eksik ayarlar: ${missing.join(', ')}. Değerleri yalnız GitHub ortamının Secrets alanına girin.`);
 const key=backupKey(env.BACKUP_ENCRYPTION_KEY);
 if(env.SUPABASE_ACCESS_TOKEN?.trim()){
  const accessToken=env.SUPABASE_ACCESS_TOKEN.trim();
  if(!/^sbp_(?:oauth_)?[a-f0-9]{40}$/.test(accessToken))throw Error('Supabase yönetim anahtarı biçimi doğrulanamadı; değer gösterilmedi.');
  return {key,accessToken,dbUrl:null};
 }
 return {key,dbUrl:validatedBackupUrl(env.SUPABASE_DB_URL)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{backupConfiguration();console.log('Yedek ayarları, proje hedefi ve şifreleme biçimi doğrulandı. Bağlantı ve gerçek geri yükleme ayrıca test edilmelidir.');}
 catch(error){
  const message=error instanceof Error?error.message:'Yedek ayarları doğrulanamadı.';
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### Bilsem Junior yedek yapılandırması\n\n${message}\n\nŞifreler ve anahtarlar rapora eklenmedi.\n`);
  console.error(message);process.exitCode=1;
 }
}
