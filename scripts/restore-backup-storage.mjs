import {readFile,stat,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {backupKey,decryptBackup} from './backup-crypto.mjs';
import {BACKUP_PROJECT_REF} from './backup-config.mjs';
import {storageError,storageOwnerEnvironment,readStorageCatalog,storagePsql,storageMetadataSql} from './backup-storage-catalog.mjs';
import {STORAGE_LIMITS,storageApi,verifyStorageManifest,normalizedStorageCatalog,restorableStorageCatalog,sha256,canonical} from './backup-storage-core.mjs';

export async function decodeStorageArchive(path,key){
 if((await stat(path)).size>STORAGE_LIMITS.archiveBytes)throw storageError('STORAGE_ARCHIVE_LIMIT');
 const bytes=await readFile(path);let manifest;
 try{manifest=JSON.parse(decryptBackup(bytes,key).toString());}catch{throw storageError('STORAGE_ARCHIVE_DECRYPT');}
 verifyStorageManifest(manifest);return {manifest,archiveSha256:sha256(bytes)};
}
export function localStorageCredentials(status){
 const env={RESTORE_STORAGE_API_URL:status?.API_URL,RESTORE_STORAGE_SERVICE_KEY:status?.SERVICE_ROLE_KEY,RESTORE_STORAGE_ANON_KEY:status?.ANON_KEY};
 storageApi({mode:'restore',apiUrl:env.RESTORE_STORAGE_API_URL,key:env.RESTORE_STORAGE_SERVICE_KEY});
 storageApi({mode:'restore',apiUrl:env.RESTORE_STORAGE_API_URL,key:env.RESTORE_STORAGE_ANON_KEY});
 return env;
}
/**
 * @param {unknown} manifest
 * @param {{apiUrl:string,serviceKey:string,anonKey:string,ownerEnv:Record<string,string>,fetcher?:typeof fetch,readCatalog?:typeof readStorageCatalog,executeSql?:typeof storagePsql,allowFixture?:boolean}} options
 */
export async function restoreStorageManifest(manifest,{apiUrl,serviceKey,anonKey,ownerEnv,fetcher=fetch,readCatalog=readStorageCatalog,executeSql=storagePsql,allowFixture=false}){
 const counts=verifyStorageManifest(manifest,{allowFixture});
 const api=storageApi({mode:'restore',apiUrl,key:serviceKey,fetcher});
 const anon=storageApi({mode:'restore',apiUrl,key:anonKey,fetcher});
 const empty=await readCatalog(ownerEnv);
 if(empty.buckets?.length||empty.objects?.length||empty.policies?.length)throw storageError('STORAGE_TARGET_NOT_EMPTY');
 const listed=await api.listBuckets();if(!Array.isArray(listed)||listed.length)throw storageError('STORAGE_TARGET_NOT_EMPTY');
 const catalog=normalizedStorageCatalog(manifest.catalog);
 for(const b of catalog.buckets)await api.createBucket(b);
 for(let i=0;i<catalog.objects.length;i++)await api.upload(catalog.objects[i],manifest.files[i]);
 for(const b of catalog.buckets)await api.updateBucket(b);
 await executeSql(ownerEnv,storageMetadataSql(catalog));
 const after=await readCatalog(ownerEnv);
 const actualMetadata=restorableStorageCatalog(after),expectedMetadata=restorableStorageCatalog(catalog);
 for(const section of ['buckets','objects','policies','grants','security'])if(canonical(actualMetadata[section])!==canonical(expectedMetadata[section]))throw storageError(`STORAGE_${section.toUpperCase()}_MISMATCH`);
 for(let i=0;i<catalog.objects.length;i++){
  const file=await api.download(catalog.objects[i]),expected=manifest.files[i];
  if(file.bytes.length!==expected.bytes||sha256(file.bytes)!==expected.sha256||file.contentType!==expected.contentType)throw storageError('STORAGE_RESTORE_HASH');
 }
 for(const b of catalog.buckets){
  const sample=catalog.objects.find(o=>o.bucket_id===b.id);if(!sample)continue;
  const result=await anon.publicDownload(sample);
  if(!b.public&&!result.denied||b.public&&(result.denied||sha256(result.bytes)!==manifest.files[catalog.objects.indexOf(sample)].sha256))throw storageError('STORAGE_VISIBILITY_MISMATCH');
 }
 return {format:'bilsem-storage-verification-v1',projectRef:BACKUP_PROJECT_REF,verified:true,isolated:true,productionSource:!manifest.fixture,checkedAt:new Date().toISOString(),archiveCreatedAt:manifest.createdAt,archiveExpiresAt:manifest.expiresAt,sourceCatalogSha256:manifest.catalogSha256,...counts,filesVerified:true,bucketConfigVerified:true,ownershipVerified:true,clientAccessVerified:true,projectConfigSnapshotVerified:sha256(canonical(manifest.settings))===manifest.settingsSha256,projectConfigRestoreVerified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const startedAt=Date.now();let receipt={format:'bilsem-storage-verification-v1',projectRef:BACKUP_PROJECT_REF,verified:false,isolated:true,productionSource:true};
 try{
  const path=process.argv[2];if(!path)throw storageError('STORAGE_ARCHIVE_REQUIRED');
  // Guard both API and database targets before the first network operation.
  const credentials=localStorageCredentials({API_URL:process.env.RESTORE_STORAGE_API_URL,SERVICE_ROLE_KEY:process.env.RESTORE_STORAGE_SERVICE_KEY,ANON_KEY:process.env.RESTORE_STORAGE_ANON_KEY});
  const ownerEnv=storageOwnerEnvironment(process.env.RESTORE_STORAGE_OWNER_DATABASE_URL,process.env.RESTORE_DATABASE_URL);
  const {manifest,archiveSha256}=await decodeStorageArchive(path,backupKey(process.env.BACKUP_ENCRYPTION_KEY));
  receipt={...await restoreStorageManifest(manifest,{apiUrl:credentials.RESTORE_STORAGE_API_URL,serviceKey:credentials.RESTORE_STORAGE_SERVICE_KEY,anonKey:credentials.RESTORE_STORAGE_ANON_KEY,ownerEnv}),archiveSha256};
  console.log(`Storage şifreli arşivinden ${receipt.buckets} alan ve ${receipt.objects} dosya izole ortama geri yüklendi; içerik hash'leri, sahiplik ve erişim ayarları doğrulandı.`);
 }catch(e){
  receipt.code=/^STORAGE_[A-Z0-9_]+$/.test(e?.code??'')?e.code:'STORAGE_RESTORE_FAILED';
  console.error(`Storage geri yükleme başarısız (${receipt.code}); özel değerler gösterilmedi.`);process.exitCode=1;
 }finally{
  await writeFile(path.resolve(process.argv[3]||'backup-storage-verification.json'),JSON.stringify({...receipt,checkedAt:new Date().toISOString(),durationMs:Date.now()-startedAt})+'\n',{mode:0o600});
 }
}
