import {createHash} from 'node:crypto';
const fileNames=['roles.sql','schema.sql','data.sql','auth-data.sql'];
const digest=value=>createHash('sha256').update(value).digest('hex');
const sessionRows=/^\s*(?:COPY|INSERT\s+INTO)\s+(?:"auth"|auth)\s*\.\s*(?:"(?:sessions|refresh_tokens|one_time_tokens|flow_state|mfa_challenges)"|(?:sessions|refresh_tokens|one_time_tokens|flow_state|mfa_challenges))\s*\(/im;
// Matches the encrypted archive retention configured in backup.yml. This is
// an operational bound, not a retention basis for the underlying account data.
export const BACKUP_RETENTION_DAYS=30;
const DAY=86_400_000;
export function backupExpiry(createdAt){
 const created=typeof createdAt==='string'?Date.parse(createdAt):NaN;
 if(!Number.isFinite(created))throw Error('Yedek oluşturma tarihi doğrulanamadı.');
 const expires=new Date(created+BACKUP_RETENTION_DAYS*DAY);
 if(!Number.isFinite(expires.getTime()))throw Error('Yedek saklama sınırı doğrulanamadı.');
 return expires.toISOString();
}
export function backupManifest(files,createdAt=new Date().toISOString()){
 if(fileNames.some(name=>typeof files[name]!=='string'||!files[name].trim()))throw Error('Yedek dosyaları eksik veya boş.');
 return {format:'zekapark-db-v2',createdAt,expiresAt:backupExpiry(createdAt),authIncluded:true,sessionsIncluded:false,storageObjectsIncluded:false,files:Object.fromEntries(fileNames.map(name=>[name,files[name]])),checksums:Object.fromEntries(fileNames.map(name=>[name,digest(files[name])]))};
}
export function verifyBackupManifest(archive,{now=Date.now()}={}){
 if(archive?.format!=='zekapark-db-v2'||archive.authIncluded!==true||archive.sessionsIncluded!==false||archive.storageObjectsIncluded!==false||!Number.isFinite(Date.parse(archive.createdAt)))throw Error('Tam geri yükleme için Auth içeren v2 yedeği gerekli.');
 if(fileNames.some(name=>typeof archive.files?.[name]!=='string'||!archive.files[name].trim()||archive.checksums?.[name]!==digest(archive.files[name])))throw Error('Yedek dosya bütünlüğü doğrulanamadı.');
 if(fileNames.some(name=>sessionRows.test(archive.files[name])))throw Error('Oturum veya yenileme tokenı içeren yedek kabul edilmedi.');
 const expiry=backupExpiry(archive.createdAt);
 // Existing v2 archives derive the same deadline from their creation time.
 if(archive.expiresAt!==undefined&&archive.expiresAt!==expiry)throw Error('Yedek saklama sınırı değiştirilemez.');
 if(!Number.isFinite(now)||Date.parse(archive.createdAt)>now+5*60_000)throw Error('Yedek tarihi gelecekte veya sistem saati doğrulanamadı.');
 if(now>=Date.parse(expiry))throw Error('Yedeğin 30 günlük saklama süresi dolmuş; geri yükleme başlatılmadı.');
 return fileNames;
}
