import {createHash} from 'node:crypto';
import {BACKUP_PROJECT_REF} from './backup-config.mjs';
import {backupExpiry} from './backup-manifest.mjs';
import {storageError,validateStorageAccess,validateStorageRls} from './backup-storage-catalog.mjs';

export const STORAGE_LIMITS=Object.freeze({buckets:128,objects:10000,objectBytes:32*1024*1024,totalBytes:128*1024*1024,jsonBytes:16*1024*1024,archiveBytes:192*1024*1024});
export const STORAGE_ARCHIVE_FORMAT='bilsem-storage-backup-v1';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
const compare=(a,b)=>a<b?-1:a>b?1:0;
export function canonical(value){return JSON.stringify(sort(value));}
function sort(value){return Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sort(value[k])])):value;}
export function storagePath(value,{bucket=false}={}){
 if(typeof value!=='string'||!value||Buffer.byteLength(value)>1024||/[\\\u0000-\u001f\u007f]/.test(value)||value.split('/').some(p=>!p||p==='.'||p==='..')||(bucket&&value.includes('/')))throw storageError('STORAGE_PATH');
 return value;
}
const timestamp=value=>{if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw storageError('STORAGE_DATE');return value;};
const dateForComparison=value=>value==null?null:new Date(timestamp(value)).toISOString();
function boundedJson(value){if(Buffer.byteLength(canonical(value))>65536)throw storageError('STORAGE_METADATA_LIMIT');return value;}
export function normalizedStorageCatalog(input){
 if(!Array.isArray(input?.buckets)||!Array.isArray(input?.objects)||input.buckets.length>STORAGE_LIMITS.buckets||input.objects.length>STORAGE_LIMITS.objects)throw storageError('STORAGE_CATALOG_FORMAT');
 const buckets=input.buckets.map(b=>{
  storagePath(b.id,{bucket:true});
  if(b.name!==b.id||typeof b.public!=='boolean'||(b.type??'STANDARD')!=='STANDARD'||(b.versioning_status&&String(b.versioning_status).toLowerCase()!=='disabled'))throw storageError('STORAGE_BUCKET_UNSUPPORTED');
  if(b.file_size_limit!=null&&(!Number.isSafeInteger(Number(b.file_size_limit))||Number(b.file_size_limit)<0))throw storageError('STORAGE_BUCKET_LIMIT');
  if(b.allowed_mime_types!=null&&(!Array.isArray(b.allowed_mime_types)||b.allowed_mime_types.some(m=>typeof m!=='string'||m.length>255||/[\r\n\u0000]/.test(m))))throw storageError('STORAGE_BUCKET_FORMAT');
  return {...b,owner:b.owner??null,owner_id:b.owner_id??null,type:'STANDARD',file_size_limit:b.file_size_limit==null?null:Number(b.file_size_limit),allowed_mime_types:b.allowed_mime_types??null};
 }).sort((a,b)=>compare(canonical(a.id),canonical(b.id)));
 const ids=new Set(buckets.map(b=>b.id));if(ids.size!==buckets.length)throw storageError('STORAGE_DUPLICATE');
 const seen=new Set();
 const objects=input.objects.map(o=>{
  storagePath(o.bucket_id,{bucket:true});storagePath(o.name);
  const key=canonical([o.bucket_id,o.name]);
  if(!ids.has(o.bucket_id)||seen.has(key)||typeof o.id!=='string'||!o.id||o.is_delete_marker||o.archived_at||o.is_versioned)throw storageError('STORAGE_OBJECT_FORMAT');
  seen.add(key);timestamp(o.created_at);timestamp(o.updated_at);boundedJson(o.metadata??null);boundedJson(o.user_metadata??null);
  for(const owner of [o.owner,o.owner_id])if(owner!=null&&(typeof owner!=='string'||owner.length>255||/[\u0000-\u001f]/.test(owner)))throw storageError('STORAGE_OWNER_FORMAT');
  return {...o,owner:o.owner??null,owner_id:o.owner_id??null,user_metadata:o.user_metadata??null};
 }).sort((a,b)=>compare(canonical([a.bucket_id,a.name]),canonical([b.bucket_id,b.name])));
 validateStorageAccess({policies:input.policies??[],grants:input.grants??[]});
 const policies=[...(input.policies??[])].map(p=>({...p,roles:p.roles.slice().sort()})).sort((a,b)=>compare(canonical([a.tablename,a.policyname]),canonical([b.tablename,b.policyname])));
 const grantMap=new Map();
 for(const g of input.grants??[]){const key=canonical([g.table,g.role,g.privilege]),prior=grantMap.get(key);grantMap.set(key,{...g,grantable:Boolean(g.grantable||prior?.grantable)});}
 const grants=[...grantMap.values()].sort((a,b)=>compare(canonical(a),canonical(b)));
 validateStorageRls(input.security);
 const security=input.security.slice().sort((a,b)=>compare(a.table,b.table));
 const catalog={buckets,objects,policies,grants,security};validateStorageAccess(catalog);return catalog;
}
export function storageCatalogDigest(catalog){return sha256(canonical(normalizedStorageCatalog(catalog)));}
export function restorableStorageCatalog(input){
 const c=normalizedStorageCatalog(input);
 return {
  buckets:c.buckets.map(b=>({id:b.id,owner:b.owner,owner_id:b.owner_id,public:b.public,type:b.type,file_size_limit:b.file_size_limit,allowed_mime_types:b.allowed_mime_types?.slice().sort()??null,created_at:dateForComparison(b.created_at)})),
  objects:c.objects.map(o=>({bucket_id:o.bucket_id,name:o.name,owner:o.owner,owner_id:o.owner_id,user_metadata:o.user_metadata,created_at:dateForComparison(o.created_at)})),
  policies:c.policies,grants:c.grants,security:c.security,
 };
}

/** Source is immutable and project-pinned. Writes require a literal loopback
 * origin; neither archive contents nor an environment variable select source. */
/** @param {{mode?:string,apiUrl?:string,key?:string,fetcher?:typeof fetch}} [options] */
export function storageApi({mode='source',apiUrl,key,fetcher=fetch}={}){
 let origin=`https://${BACKUP_PROJECT_REF}.supabase.co`;
 if(mode==='restore'){
  let u;try{u=new URL(apiUrl);}catch{throw storageError('STORAGE_LOCAL_TARGET');}
  if(u.protocol!=='http:'||!['127.0.0.1','[::1]'].includes(u.hostname)||!u.port||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw storageError('STORAGE_LOCAL_TARGET');
  origin=u.origin;
 }else if(mode!=='source'||apiUrl!==undefined)throw storageError('STORAGE_SOURCE_TARGET');
 if(typeof key!=='string'||key.length<8||key.length>8192||/[\r\n\u0000]/.test(key))throw storageError('STORAGE_KEY_FORMAT');
 async function request(route,{method='GET',body,headers={},binary=false,allowDenied=false,maxBytes=STORAGE_LIMITS.jsonBytes}={}){
  if(mode==='source'&&method!=='GET')throw storageError('STORAGE_SOURCE_WRITE');
  try{
   const response=await fetcher(`${origin}/storage/v1${route}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,...headers},...(body===undefined?{}:{body}),redirect:'error',signal:AbortSignal.timeout(30_000)});
   if(allowDenied&&[400,401,403,404].includes(response.status)){await response.body?.cancel();return {denied:true};}
   if(!response.ok){await response.body?.cancel();throw storageError(`STORAGE_HTTP_${[400,401,403,404,409,413,429,500,503].includes(response.status)?response.status:'FAILED'}`);}
   const announced=response.headers.get('content-length');if(announced!==null&&(!/^\d+$/.test(announced)||Number(announced)>maxBytes)){await response.body?.cancel();throw storageError('STORAGE_RESPONSE_LIMIT');}
   const chunks=[];let length=0;
   if(response.body)for await(const chunk of response.body){length+=chunk.length;if(length>maxBytes)throw storageError('STORAGE_RESPONSE_LIMIT');chunks.push(Buffer.from(chunk));}
   const bytes=Buffer.concat(chunks);
   if(binary)return {bytes,contentType:response.headers.get('content-type')||'application/octet-stream',cacheControl:response.headers.get('cache-control')||'max-age=3600'};
   try{return bytes.length?JSON.parse(bytes.toString()):null;}catch{throw storageError('STORAGE_RESPONSE_FORMAT');}
  }catch(e){if(/^STORAGE_[A-Z0-9_]+$/.test(e?.code??''))throw e;throw storageError('STORAGE_TRANSPORT');}
 }
 const objectPath=o=>`${encodeURIComponent(storagePath(o.bucket_id,{bucket:true}))}/${storagePath(o.name).split('/').map(encodeURIComponent).join('/')}`;
 return {
  listBuckets:()=>request('/bucket'),
  download:o=>request(`/object/authenticated/${objectPath(o)}`,{binary:true,maxBytes:STORAGE_LIMITS.objectBytes}),
  publicDownload:o=>request(`/object/public/${objectPath(o)}`,{binary:true,allowDenied:true,maxBytes:STORAGE_LIMITS.objectBytes}),
  createBucket:b=>request('/bucket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:b.id,name:b.id,public:false,type:'STANDARD'})}),
  updateBucket:b=>request(`/bucket/${encodeURIComponent(b.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:b.id,name:b.id,public:b.public,file_size_limit:b.file_size_limit,allowed_mime_types:b.allowed_mime_types})}),
  upload:(o,file)=>request(`/object/${objectPath(o)}`,{method:'POST',body:Buffer.from(file.content,'base64'),headers:{'Content-Type':file.contentType,'Cache-Control':file.cacheControl,'x-upsert':'false'}}),
 };
}

export async function captureStorageFiles(catalog,api){
 const c=normalizedStorageCatalog(catalog),files=new Array(c.objects.length);let total=0,failure;
 await Promise.all(Array.from({length:Math.min(4,c.objects.length)},async(_,worker)=>{
  for(let i=worker;i<c.objects.length&&!failure;i+=4){try{
   const o=c.objects[i],file=await api.download(o);total+=file.bytes.length;
   if(total>STORAGE_LIMITS.totalBytes)throw storageError('STORAGE_TOTAL_LIMIT');
   if(o.metadata?.size!=null&&Number(o.metadata.size)!==file.bytes.length)throw storageError('STORAGE_SOURCE_CHANGED');
   if(/[\r\n\u0000]/.test(file.contentType+file.cacheControl))throw storageError('STORAGE_HEADER_FORMAT');
   files[i]={bucket_id:o.bucket_id,name:o.name,bytes:file.bytes.length,sha256:sha256(file.bytes),content:file.bytes.toString('base64'),contentType:file.contentType,cacheControl:file.cacheControl};
  }catch(error){failure=error;}}
 }));
 if(failure)throw failure;return files;
}
export function storageManifest(catalog,files,settings,{createdAt=new Date().toISOString(),fixture=false}={}){
 const c=normalizedStorageCatalog(catalog);
 const manifest={format:STORAGE_ARCHIVE_FORMAT,projectRef:BACKUP_PROJECT_REF,createdAt,expiresAt:backupExpiry(createdAt),fixture,catalog:c,catalogSha256:storageCatalogDigest(c),files,settings,settingsSha256:sha256(canonical(settings))};
 verifyStorageManifest(manifest,{allowFixture:fixture});return manifest;
}
export function verifyStorageManifest(m,{now=Date.now(),allowFixture=false}={}){
 if(m?.format!==STORAGE_ARCHIVE_FORMAT||m.projectRef!==BACKUP_PROJECT_REF||typeof m.fixture!=='boolean'||(m.fixture&&!allowFixture)||!Number.isFinite(now)||Date.parse(m.createdAt)>now+300_000||now>=Date.parse(backupExpiry(m.createdAt))||m.expiresAt!==backupExpiry(m.createdAt))throw storageError('STORAGE_ARCHIVE_FORMAT');
 const c=normalizedStorageCatalog(m.catalog);
 if(storageCatalogDigest(c)!==m.catalogSha256||!m.settings||Buffer.byteLength(canonical(m.settings))>STORAGE_LIMITS.jsonBytes||sha256(canonical(m.settings))!==m.settingsSha256||!Array.isArray(m.files)||m.files.length!==c.objects.length)throw storageError('STORAGE_ARCHIVE_INTEGRITY');
 let total=0;
 for(let i=0;i<m.files.length;i++){
  const f=m.files[i],o=c.objects[i];
  if(f.bucket_id!==o.bucket_id||f.name!==o.name||!Number.isSafeInteger(f.bytes)||f.bytes<0||f.bytes>STORAGE_LIMITS.objectBytes||typeof f.content!=='string'||f.content.length>Math.ceil(STORAGE_LIMITS.objectBytes/3)*4||typeof f.contentType!=='string'||typeof f.cacheControl!=='string'||f.contentType.length>255||f.cacheControl.length>1024||/[\r\n\u0000]/.test(f.contentType+f.cacheControl))throw storageError('STORAGE_FILE_FORMAT');
  const body=Buffer.from(f.content,'base64');total+=body.length;
  if(body.toString('base64')!==f.content||body.length!==f.bytes||total>STORAGE_LIMITS.totalBytes||sha256(body)!==f.sha256)throw storageError('STORAGE_FILE_INTEGRITY');
 }
 return {buckets:c.buckets.length,objects:c.objects.length,bytes:total,privateBuckets:c.buckets.filter(b=>!b.public).length};
}
