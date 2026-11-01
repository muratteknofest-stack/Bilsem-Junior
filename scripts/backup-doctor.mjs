import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {connect as tlsConnect} from 'node:tls';
import {writeFile,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {BACKUP_PROJECT_REF,backupConfiguration} from './backup-config.mjs';
import {BACKUP_CA_PATH,verifyBackupCaBundle} from './backup-tls.mjs';
import {backupManagementRequest,primaryPooler,temporaryLoginIdentity,backupConnectionEnvironment} from './backup-access.mjs';
import {postgresChildEnvironment} from './postgres-child-environment.mjs';

/**
 * Read-only diagnosis of the encrypted backup pipeline. It answers one
 * question: which stage fails, and what does the operator need to change?
 * Only fixed codes and fixed Turkish sentences leave this module: never a
 * token, password, connection URL, hostname, SQL statement or provider body.
 */

export const DOCTOR_FORMAT='bilsem-backup-doctor-v1';

/** HTTP status of the pinned Management API -> fixed, actionable code. */
export function providerStatusStage(stage,status){
 if(status===401||status===403)return {stage,status:'fail',code:'TOKEN_PERMISSION',detail:'Supabase yönetim anahtarı bu proje için okuma/yazma kapsamına sahip değil.'};
 if(status===404)return {stage,status:'fail',code:'ENDPOINT_UNAVAILABLE',detail:'Beklenen Supabase yönetim uç noktası bulunamadı; sağlayıcı sürümü değişmiş olabilir.'};
 if(status===429)return {stage,status:'fail',code:'RATE_LIMIT',detail:'Supabase yönetim API’si istek sınırına takıldı; sonraki zamanlanmış çalışma beklenmeli.'};
 if(status>=500)return {stage,status:'fail',code:'PROVIDER_ERROR',detail:'Supabase yönetim API’si geçici sunucu hatası döndürdü.'};
 return {stage,status:'fail',code:'PROVIDER_REJECTED',detail:'Supabase yönetim isteği beklenmeyen bir durum koduyla reddedildi.'};
}

/** Network/probe failures -> fixed codes; the original message is discarded. */
export function classifyProbeError(error){
 const code=typeof error?.code==='string'?error.code:'';
 if(['CERT_HAS_EXPIRED','CERT_NOT_YET_VALID','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','CERT_UNTRUSTED','ERR_TLS_CERT_ALTNAME_INVALID'].includes(code))
  return code==='ERR_TLS_CERT_ALTNAME_INVALID'?'TLS_HOSTNAME':'TLS_CERTIFICATE';
 if(['ENOTFOUND','EAI_AGAIN'].includes(code))return 'DNS';
 if(['ETIMEDOUT','ESOCKETTIMEDOUT','ABORT_ERR'].includes(code)||error?.name==='AbortError')return 'TIMEOUT';
 if(code==='ECONNREFUSED')return 'CONNECTION_REFUSED';
 if(/^ERR_TLS_|^ERR_SSL_/.test(code))return 'TLS_HANDSHAKE';
 return 'CONNECTION';
}

/**
 * Smallest safe probe: TCP + pinned-CA TLS handshake, no credentials.
 * @param {any} [options]
 * @returns {Promise<{ok:boolean,code:string}>}
 */
export function probeTls(options={}){
 const {host,port=5432,ca,timeoutMs=10_000,connect=tlsConnect}=options;
 return new Promise(resolve=>{
  let settled=false,socket,timer;
  const done=result=>{if(settled)return;settled=true;clearTimeout(timer);socket?.destroy();resolve(result);};
  try{socket=connect({host,port,servername:host,ca,rejectUnauthorized:true,timeout:timeoutMs});}
  catch(error){resolve({ok:false,code:classifyProbeError(error)});return;}
  timer=setTimeout(()=>done({ok:false,code:'TIMEOUT'}),timeoutMs+1_000);
  socket.once('secureConnect',()=>done({ok:true,code:'OK'}));
  socket.once('timeout',()=>done({ok:false,code:'TIMEOUT'}));
  socket.once('error',error=>done({ok:false,code:classifyProbeError(error)}));
 });
}

/** PostgreSQL 17 clients are required; a 16 client cannot dump the live server. */
export function postgresToolVersions({spawnImpl=spawn,env=postgresChildEnvironment()}={}){
 const tool=tool=>new Promise(resolve=>{
  let output='';
  const child=spawnImpl(tool,['--version'],{env,stdio:['ignore','pipe','ignore']});
  child.stdout?.on('data',chunk=>{if(output.length<200)output+=chunk.toString();});
  child.once('error',()=>resolve({tool,ok:false}));
  child.once('close',code=>resolve({tool,ok:code===0&&/\b17\./.test(output)}));
 });
 return Promise.all(['pg_dump','pg_dumpall','psql'].map(tool));
}

const NEXT_ACTIONS={
 TOKEN_PERMISSION:'Supabase yönetim anahtarını yalnız bu proje için database okuma ve database yazma kapsamıyla yenileyin (geçici oturum kimliği oluşturma database:write ister); değeri yalnız GitHub production-backup ortam sırrına yazın.',
 PROVIDER_UNREACHABLE:'GitHub Actions çalışanından api.supabase.com erişimini kontrol edin; kurumsal ağ veya sağlayıcı kesintisi varsa SUPABASE_DB_URL yoluna geçin.',
 ENDPOINT_UNAVAILABLE:'Supabase yönetim API sürümünü doğrulayın; uç nokta değiştiyse yedek betiği güncellenmeden çalıştırılmamalı.',
 RATE_LIMIT:'Aynı saatte ek yedek denemesi yapmayın; bir sonraki zamanlanmış çalışmayı bekleyin.',
 PROVIDER_ERROR:'Sağlayıcı durum sayfasını kontrol edip yedek işini elle yeniden çalıştırın; art arda deneme yapmayın.',
 PROVIDER_REJECTED:'Supabase yönetim yanıtının durum kodunu sağlayıcı panelinden doğrulayın; gövde veya anahtar günlüğe yazılmamalı.',
 POOLER_TARGET:'Projenin birincil session pooler hedefi okunamadı; yönetim anahtarının proje kapsamını doğrulayın.',
 LOGIN_IDENTITY:'Süreli veritabanı kimliği beklenen biçimde dönmedi; yönetim anahtarının yazma kapsamını doğrulayın.',
 TLS_CERTIFICATE:'Sertifika zinciri sabitlenmiş Supabase CA paketiyle uyuşmuyor; paket güncellemesi incelenmeden TLS doğrulaması gevşetilmemeli.',
 TLS_HOSTNAME:'Sunucu sertifikası bağlanılan adla eşleşmiyor; bağlantı hedefi değiştirilmemeli, yapılandırma düzeltilmeli.',
 TLS_HANDSHAKE:'TLS el sıkışması tamamlanamadı; sağlayıcı veya ağ aracısı TLS’i kesiyor olabilir.',
 DNS:'Veritabanı sunucusu adı çözümlenemedi; sağlayıcı adresini ve ağ ayarlarını kontrol edin.',
 TIMEOUT:'Bağlantı zaman aşımına uğradı; sağlayıcı ağ erişimini ve güvenlik duvarını kontrol edin.',
 CONNECTION_REFUSED:'Bağlantı reddedildi; session pooler 5432 kapalıysa sağlayıcı yapılandırması doğrulanmalı.',
 CONNECTION:'Veritabanı bağlantısı kurulamadı; ağ yolunu ve sağlayıcı durumunu kontrol edin.',
 CONFIGURATION:'Zorunlu ortam ayarları eksik veya biçimi geçersiz; değerler yalnız GitHub ortam sırlarına girilmeli.',
 CERTIFICATE:'Sabitlenmiş CA paketi doğrulanamadı; yedek CA dosyasının bütünlüğü korunmalı.',
 POSTGRES_TOOLS:'PostgreSQL 17 istemci araçları gerekli; iş akışı doğru paketi kurmalı.',
 UNKNOWN:'Tanımlanmayan durum; gizli değer yazmadan teknik sorumlu incelemeli.'
};

export function nextActionFor(code){return NEXT_ACTIONS[code]||NEXT_ACTIONS.UNKNOWN;}

function stage(name,status,code,detail){return {stage:name,status,code,detail};}

/**
 * Runs every stage that the given environment allows. A missing capability is
 * `skip`, never `pass`; the caller must not treat a partial run as a success.
 */
/** @param {any} [options] @returns {Promise<any>} */
export async function runBackupDoctor(options={}){
 const {
 env=process.env,fetcher=fetch,probe=probeTls,tools=postgresToolVersions,offline=false,now=new Date(),
 }=options;
 const stages=[];let mode=null,credentials=null;
 try{
  credentials=backupConfiguration(env);
  mode=credentials.accessToken?'token':'db_url';
  stages.push(stage('environment','pass','OK',mode==='token'?'Yönetim anahtarı ve şifreleme anahtarı doğrulandı.':'Veritabanı bağlantısı ve şifreleme anahtarı doğrulandı.'));
 }catch(error){
  stages.push(stage('environment','fail','CONFIGURATION',error instanceof Error?error.message:'Yedek yapılandırması doğrulanamadı.'));
 }
 let ca;
 try{
  ca=verifyBackupCaBundle(readFileSync(BACKUP_CA_PATH));
  stages.push(stage('certificate_bundle','pass','OK','Sabitlenmiş Supabase CA paketi ve geçerlilik tarihleri doğrulandı.'));
 }catch{
  stages.push(stage('certificate_bundle','fail','CERTIFICATE','Sabitlenmiş Supabase CA paketi doğrulanamadı.'));
 }
 if(offline){
  for(const name of ['postgres_tools','provider_api','login_role','database_tls'])
   stages.push(stage(name,'skip','OFFLINE','Çevrimdışı tanı bu aşamayı çalıştırmadı.'));
 }else{
  const versions=await tools();
  const missing=versions.filter(row=>!row.ok).map(row=>row.tool);
  stages.push(missing.length
   ?stage('postgres_tools','fail','POSTGRES_TOOLS',`PostgreSQL 17 istemci araçları doğrulanamadı: ${missing.join(', ')}.`)
   :stage('postgres_tools','pass','OK','PostgreSQL 17 istemci araçları doğrulandı.'));

  let target=null;
  if(mode==='token'){
   try{
    const rows=await backupManagementRequest('/config/database/pooler',credentials.accessToken,undefined,fetcher);
    const pooler=primaryPooler(rows);
    if(!pooler)stages.push(stage('provider_api','fail','POOLER_TARGET','Bu projeye ait birincil session pooler hedefi doğrulanamadı.'));
    else{target=pooler;stages.push(stage('provider_api','pass','OK','Projenin birincil session pooler hedefi doğrulandı.'));}
   }catch(error){
    if(error?.code==='PROVIDER_HTTP')stages.push(providerStatusStage('provider_api',error.status));
    else stages.push(stage('provider_api','fail','PROVIDER_UNREACHABLE','Supabase yönetim API’sine ulaşılamadı.'));
   }
   try{
    temporaryLoginIdentity(await backupManagementRequest('/cli/login-role',credentials.accessToken,{read_only:false},fetcher));
    stages.push(stage('login_role','pass','OK','Süreli veritabanı kimliği doğrulandı.'));
   }catch(error){
    if(error?.code==='PROVIDER_HTTP')stages.push(providerStatusStage('login_role',error.status));
    else if(error?.code==='PROVIDER_UNREACHABLE')stages.push(stage('login_role','fail','PROVIDER_UNREACHABLE','Supabase yönetim API’sine ulaşılamadı.'));
    else stages.push(stage('login_role','fail','LOGIN_IDENTITY','Süreli veritabanı kimliği doğrulanamadı.'));
   }
  }else if(mode==='db_url'){
   try{
    const [host,port]=[new URL(credentials.dbUrl).hostname,'5432'];
    target={db_host:host,db_port:port};
    stages.push(stage('provider_api','skip','DB_URL_MODE','Yönetim anahtarı kullanılmıyor; sağlayıcı API aşaması atlandı.'));
    stages.push(stage('login_role','skip','DB_URL_MODE','Doğrudan veritabanı bağlantısı kullanılıyor; geçici kimlik gerekmez.'));
   }catch{
    stages.push(stage('provider_api','fail','CONFIGURATION','Veritabanı bağlantı hedefi okunamadı.'));
    stages.push(stage('login_role','skip','CONFIGURATION','Bağlantı hedefi doğrulanmadan kimlik aşaması çalıştırılmadı.'));
   }
  }else{
   stages.push(stage('provider_api','skip','NO_CREDENTIALS','Yapılandırma doğrulanmadığı için sağlayıcı aşaması çalıştırılmadı.'));
   stages.push(stage('login_role','skip','NO_CREDENTIALS','Yapılandırma doğrulanmadığı için kimlik aşaması çalıştırılmadı.'));
  }
  if(target&&ca){
   const result=await probe({host:target.db_host,port:5432,ca:readFileSync(BACKUP_CA_PATH)});
   stages.push(result.ok
    ?stage('database_tls','pass','OK','Veritabanı sunucusuyla sabitlenmiş CA kullanılarak TLS bağlantısı kuruldu.')
    :stage('database_tls','fail',result.code,`TLS bağlantı denetimi başarısız (${result.code}).`));
  }else{
   stages.push(stage('database_tls','skip',target?'CERTIFICATE':'NO_TARGET','Doğrulanmış hedef olmadan TLS denetimi çalıştırılmadı.'));
  }
 }
 const failed=stages.filter(row=>row.status==='fail');
 const skipped=stages.filter(row=>row.status==='skip');
 const conclusion=failed.length?'blocked':skipped.length?'partial':'ready';
 const actions=[...new Set(failed.map(row=>nextActionFor(row.code)))];
 return {
  format:DOCTOR_FORMAT,checkedAt:now.toISOString(),projectRef:BACKUP_PROJECT_REF,mode,conclusion,
  stages,nextActions:actions,secretsIncluded:false,
 };
}

export function doctorSummary(report){
 const mark=row=>row.status==='pass'?'PASS':row.status==='fail'?'FAIL':'SKIP';
 return `### Bilsem Junior yedek tanısı (${report.conclusion})\n\n`+
  `Proje: \`${report.projectRef}\` · Yol: ${report.mode||'doğrulanmadı'} · ${report.checkedAt}\n\n`+
  `| Aşama | Sonuç | Kod | Açıklama |\n|---|---|---|---|\n`+
  report.stages.map(row=>`| ${row.stage} | ${mark(row)} | ${row.code} | ${row.detail.replace(/\|/g,'/')} |`).join('\n')+
  (report.nextActions.length?`\n\n**Gerekli işlem**\n${report.nextActions.map(action=>`- ${action}`).join('\n')}`:'')+
  '\n\nBu raporda anahtar, parola, bağlantı adresi veya sağlayıcı yanıt gövdesi bulunmaz.\n';
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 const reportIndex=args.indexOf('--report');
 const reportPath=reportIndex>=0?args[reportIndex+1]:null;
 const report=await runBackupDoctor({offline:args.includes('--offline')});
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,doctorSummary(report));
 console.log(JSON.stringify(report,null,2));
 if(report.conclusion==='blocked'){
  console.error('Yedek tanısı başarısız; döküm ve geri yükleme başlatılmamalı. Gizli değer gösterilmedi.');
  process.exitCode=1;
 }
}
