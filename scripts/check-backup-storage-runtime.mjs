import {randomUUID} from 'node:crypto';
import {storageOwnerEnvironment,readStorageCatalog} from './backup-storage-catalog.mjs';
import {storageManifest} from './backup-storage-core.mjs';
import {restoreStorageManifest} from './restore-backup-storage.mjs';

// Synthetic fixture only. This command never writes a recovery receipt or
// reads a production token, encryption key, file or customer record.
const now=new Date().toISOString();
const ownerEnv=storageOwnerEnvironment(process.env.RESTORE_STORAGE_OWNER_DATABASE_URL,process.env.RESTORE_DATABASE_URL);
const baseline=await readStorageCatalog(ownerEnv);
const buckets=['runtime-private','runtime-public'].map((id,i)=>({id,name:id,type:'STANDARD',public:i===1,owner:null,owner_id:null,created_at:now,updated_at:now,file_size_limit:1024,allowed_mime_types:['application/octet-stream']}));
// The pinned Storage API accepts its documented S3-safe ASCII key set.
// Exercise spaces, a reserved URL character and nesting without renaming data.
const objects=buckets.map((b,i)=>({id:randomUUID(),bucket_id:b.id,name:i?'nested/empty file.bin':'nested/private file?.bin',owner:null,owner_id:i?null:'runtime-owner',created_at:now,updated_at:now,user_metadata:{fixture:true},metadata:{size:i?0:7}}));
const contents=[Buffer.from('fixture'),Buffer.alloc(0)];
const {sha256}=await import('./backup-storage-core.mjs');
const files=objects.map((o,i)=>({bucket_id:o.bucket_id,name:o.name,bytes:contents[i].length,sha256:sha256(contents[i]),content:contents[i].toString('base64'),contentType:'application/octet-stream',cacheControl:'max-age=3600'}));
const policies=[{schemaname:'storage',tablename:'objects',policyname:'runtime_owner_read',permissive:'PERMISSIVE',roles:['authenticated'],cmd:'SELECT',qual:"((bucket_id = 'runtime-private'::text) AND (owner_id = (auth.uid())::text))",with_check:null}];
const manifest=storageManifest({buckets,objects,policies,grants:baseline.grants,security:baseline.security},files,{format:'runtime-fixture',restoreVerified:false},{fixture:true});
await restoreStorageManifest(manifest,{apiUrl:process.env.RESTORE_STORAGE_API_URL,serviceKey:process.env.RESTORE_STORAGE_SERVICE_KEY,anonKey:process.env.RESTORE_STORAGE_ANON_KEY,ownerEnv,allowFixture:true});
console.log('İzole Storage: özel/açık alan, boşluklu/iç içe yol, boş dosya, sahiplik ve erişim politikası gerçek API üzerinden doğrulandı; üretim verisi kullanılmadı.');
