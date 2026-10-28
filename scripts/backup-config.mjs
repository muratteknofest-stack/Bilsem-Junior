import {appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {PRODUCTION_SUPABASE_ORIGIN} from '../shared/supabase-environment.mjs';
import {backupKey} from './backup-crypto.mjs';

/** Validate before any database connection; error messages contain no values. */
export function backupConfiguration(env=process.env){
 const missing=['SUPABASE_DB_URL','BACKUP_ENCRYPTION_KEY'].filter(name=>!env[name]?.trim());
 if(missing.length)throw Error(`production-backup ortamında eksik ayarlar: ${missing.join(', ')}. Değerleri yalnız GitHub ortamının Secrets alanına girin.`);
 const key=backupKey(env.BACKUP_ENCRYPTION_KEY);
 let url;
 try{url=new URL(env.SUPABASE_DB_URL);}catch{throw Error('SUPABASE_DB_URL biçimi geçersiz; bağlantı değeri günlükte gösterilmedi.');}
 const project=new URL(PRODUCTION_SUPABASE_ORIGIN).hostname.split('.')[0];
 const direct=url.hostname===`db.${project}.supabase.co`;
 const pooler=/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)&&url.username.endsWith(`.${project}`);
 if(!['postgres:','postgresql:'].includes(url.protocol)||(!direct&&!pooler)||!url.username||!url.password||url.pathname!=='/postgres'||url.hash||url.port&&url.port!=='5432')
  throw Error('Yedek bağlantısı beklenen Bilsem Junior projesinin doğrudan veya session pooler PostgreSQL adresi olmalıdır.');
 // libpq query parameters such as host/dbname/service must not override the
 // checked hostname, project or database when passed to pg_dump.
 if([...url.searchParams.keys()].some(name=>name!=='sslmode'))throw Error('Yedek bağlantısında hedef değiştiren veya desteklenmeyen parametre var.');
 url.searchParams.set('sslmode','verify-full');
 return {key,dbUrl:url.toString()};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{backupConfiguration();console.log('Yedek ayarları, proje hedefi ve şifreleme biçimi doğrulandı. Bağlantı ve gerçek geri yükleme ayrıca test edilmelidir.');}
 catch(error){
  const message=error instanceof Error?error.message:'Yedek ayarları doğrulanamadı.';
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### Bilsem Junior yedek yapılandırması\n\n${message}\n\nŞifreler ve anahtarlar rapora eklenmedi.\n`);
  console.error(message);process.exitCode=1;
 }
}
