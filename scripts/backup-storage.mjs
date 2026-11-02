import {writeFile,rename,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {backupKey,encryptBackup} from './backup-crypto.mjs';
import {backupManagementRequest,temporaryBackupAccess,backupConnectionEnvironment} from './backup-access.mjs';
import {readStorageCatalog,storageError} from './backup-storage-catalog.mjs';
import {captureStorageFiles,storageApi,storageManifest,storageCatalogDigest} from './backup-storage-core.mjs';

// Only these non-secret Auth settings are copied. Credentials/signing keys and
// actual provider configuration recovery remain a separate release obligation.
export const AUTH_RECOVERY_FIELDS=Object.freeze(['site_url','uri_allow_list','disable_signup','jwt_exp','mailer_autoconfirm','external_email_enabled','external_phone_enabled','password_min_length','password_required_characters','security_refresh_token_reuse_interval','security_update_password_require_reauthentication','security_captcha_enabled','mfa_max_enrolled_factors','mfa_totp_enroll_enabled','mfa_totp_verify_enabled','rate_limit_email_sent','rate_limit_token_refresh','rate_limit_verify','sessions_timebox','sessions_inactivity_timeout','mailer_urlpaths_invite','mailer_urlpaths_confirmation','mailer_urlpaths_recovery','mailer_urlpaths_email_change']);
export function nonSecretAuthConfig(config){
 return Object.fromEntries(AUTH_RECOVERY_FIELDS.filter(k=>Object.hasOwn(config??{},k)&&(config[k]===null||['string','boolean','number'].includes(typeof config[k]))).map(k=>[k,config[k]]));
}
export async function storageServiceKey(token,fetcher=fetch){
 let keys;try{keys=await backupManagementRequest('/api-keys?reveal=true',token,undefined,fetcher);}catch{throw storageError('STORAGE_KEY_ACCESS');}
 const key=Array.isArray(keys)&&keys.find(k=>k.name==='service_role'&&typeof k.api_key==='string')?.api_key;
 if(!key)throw storageError('STORAGE_KEY_ACCESS');return key;
}
export async function projectSettingsSnapshot(token,fetcher=fetch){
 const snapshot={format:'bilsem-project-config-snapshot-v1',auth:null,omitted:['provider-secrets','SMTP-password','OAuth-secrets','JWT-signing-keys','API-keys','Edge-Functions','network-and-Realtime-config'],restoreVerified:false};
 try{snapshot.auth=nonSecretAuthConfig(await backupManagementRequest('/config/auth',token,undefined,fetcher));}catch{snapshot.unavailable=['AUTH_CONFIG_ACCESS'];}
 return snapshot;
}
/** @param {{token:string,key:Buffer,fetcher?:typeof fetch,catalogReader?:()=>Promise<unknown>}} options */
export async function createStorageBackup({token,key,fetcher=fetch,catalogReader}){
 if(!/^sbp_[a-zA-Z0-9_-]{20,}$/.test(token??''))throw storageError('STORAGE_ACCESS_TOKEN_REQUIRED');
 const access=temporaryBackupAccess(token,fetcher);
 const read=catalogReader??(async()=>readStorageCatalog(backupConnectionEnvironment(await access()),{source:true}));
 const before=await read(),sourceHash=storageCatalogDigest(before);
 const api=storageApi({key:await storageServiceKey(token,fetcher),fetcher});
 const settings=await projectSettingsSnapshot(token,fetcher);
 const files=await captureStorageFiles(before,api);
 if(storageCatalogDigest(await read())!==sourceHash)throw storageError('STORAGE_SOURCE_CHANGED');
 const manifest=storageManifest(before,files,settings);
 return encryptBackup(Buffer.from(JSON.stringify(manifest)),key);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output='zekapark-storage.enc',pending=output+'.pending';
 try{
  process.umask(0o077);
  const archive=await createStorageBackup({token:process.env.SUPABASE_ACCESS_TOKEN,key:backupKey(process.env.BACKUP_ENCRYPTION_KEY)});
  await writeFile(pending,archive,{mode:0o600});await rename(pending,output);
  console.log('Storage dosyaları, alan ayarları, sahiplik ve erişim politikaları ayrı şifreli arşive alındı.');
 }catch(e){
  const code=/^STORAGE_[A-Z0-9_]+$/.test(e?.code??'')?e.code:'STORAGE_BACKUP_FAILED';
  console.error(`Storage yedekleme başarısız (${code}); özel değerler gösterilmedi.`);process.exitCode=1;
 }finally{await rm(pending,{force:true});}
}
