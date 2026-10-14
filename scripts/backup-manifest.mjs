import {createHash} from 'node:crypto';
const fileNames=['roles.sql','schema.sql','data.sql','auth-data.sql'];
const digest=value=>createHash('sha256').update(value).digest('hex');
export function backupManifest(files,createdAt=new Date().toISOString()){
 if(fileNames.some(name=>typeof files[name]!=='string'||!files[name].trim()))throw Error('Yedek dosyaları eksik veya boş.');
 return {format:'zekapark-db-v2',createdAt,authIncluded:true,sessionsIncluded:false,storageObjectsIncluded:false,files:Object.fromEntries(fileNames.map(name=>[name,files[name]])),checksums:Object.fromEntries(fileNames.map(name=>[name,digest(files[name])]))};
}
export function verifyBackupManifest(archive){
 if(archive?.format!=='zekapark-db-v2'||archive.authIncluded!==true||archive.sessionsIncluded!==false||archive.storageObjectsIncluded!==false||!Number.isFinite(Date.parse(archive.createdAt)))throw Error('Tam geri yükleme için Auth içeren v2 yedeği gerekli.');
 if(fileNames.some(name=>typeof archive.files?.[name]!=='string'||!archive.files[name].trim()||archive.checksums?.[name]!==digest(archive.files[name])))throw Error('Yedek dosya bütünlüğü doğrulanamadı.');
 return fileNames;
}
