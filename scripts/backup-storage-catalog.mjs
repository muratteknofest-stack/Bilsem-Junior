import {spawn} from 'node:child_process';
import {postgresChildEnvironment} from './postgres-child-environment.mjs';
import {isolatedRestoreTarget} from './restore-backup.mjs';

export const STORAGE_CLIENT_ROLES=Object.freeze(['PUBLIC','anon','authenticated','service_role']);
export const STORAGE_CATALOG_SQL=`SELECT jsonb_build_object(
 'buckets',(SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.id),'[]'::jsonb) FROM storage.buckets b),
 'objects',(SELECT coalesce(jsonb_agg(to_jsonb(o)-'last_accessed_at' ORDER BY o.bucket_id,o.name),'[]'::jsonb) FROM storage.objects o),
 'security',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity,'forced',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND c.relname IN ('buckets','objects')),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.tablename,p.policyname),'[]'::jsonb) FROM pg_policies p WHERE schemaname='storage'),
 'grants',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'role',coalesce(r.rolname,'PUBLIC'),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY c.relname,a.grantee,a.privilege_type),'[]'::jsonb)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a LEFT JOIN pg_roles r ON r.oid=a.grantee
 WHERE n.nspname='storage' AND c.relname IN ('buckets','objects') AND (a.grantee=0 OR r.rolname IN ('anon','authenticated','service_role')))
);`;

export function storageError(code){return Object.assign(Error(`Storage kurtarma işlemi başarısız (${code}); özel değerler gösterilmedi.`),{code});}
export function storageOwnerEnvironment(ownerUrl,databaseUrl){
 const owner=isolatedRestoreTarget(ownerUrl),database=isolatedRestoreTarget(databaseUrl);
 // The fresh runtime's existing bootstrap identity can recreate policies that
 // reference Auth helpers as well as Storage-owned tables. No role membership
 // or cross-schema privilege is added to the normal restore/data users.
 if(owner.PGUSER!=='supabase_admin'||['PGHOST','PGPORT','PGDATABASE'].some(k=>owner[k]!==database[k]))throw storageError('STORAGE_LOCAL_OWNER');
 return owner;
}

/** Only fixed queries and the authenticated archive's metadata reach stdin.
 * stdout is bounded and never printed; database errors are reduced to a code. */
export function storagePsql(env,sql){return new Promise((resolve,reject)=>{
 // pg_get_expr (used by pg_policies) omits schemas on the session search_path.
 // Render source and target policy expressions with the same catalog-only
 // path, while preserving the source's read-only transaction option.
 const connection={...env,PGOPTIONS:[env.PGOPTIONS,'-c search_path=pg_catalog'].filter(Boolean).join(' ')};
 const child=spawn('psql',['--no-psqlrc','--quiet','--tuples-only','--no-align','--set','ON_ERROR_STOP=on','--set','VERBOSITY=sqlstate'],{env:postgresChildEnvironment(connection),stdio:['pipe','pipe','pipe'],timeout:120_000});
 const chunks=[];let length=0,overLimit=false,diagnostic='';
 child.stdout.on('data',chunk=>{length+=chunk.length;if(length>16*1024*1024){overLimit=true;child.kill();}else chunks.push(chunk);});
 child.stderr.on('data',chunk=>{if(diagnostic.length<8192)diagnostic+=chunk.toString();});
 child.once('error',()=>reject(storageError('STORAGE_DATABASE_TOOL')));
 child.once('close',code=>{const state=diagnostic.match(/\b(?:ERROR|FATAL):\s*((?:[0-9][0-9A-Z]{4}|P0001|XX000))\b/)?.[1];code===0&&!overLimit?resolve(Buffer.concat(chunks).toString().trim()):reject(storageError(overLimit?'STORAGE_CATALOG_LIMIT':state?`STORAGE_DATABASE_${state}`:'STORAGE_DATABASE_QUERY'));});
 child.stdin.on('error',()=>{});child.stdin.end(sql);
});}
export async function readStorageCatalog(env,{source=false}={}){
 const raw=await storagePsql(env,(source?'SET ROLE postgres;\n':'')+STORAGE_CATALOG_SQL);
 try{return JSON.parse(raw);}catch{throw storageError('STORAGE_CATALOG_FORMAT');}
}

const tables=new Set(['buckets','objects']);
const commands=new Set(['ALL','SELECT','INSERT','UPDATE','DELETE']);
const privileges=new Set(['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']);
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=255&&!/[\u0000-\u001f\u007f]/.test(value);
const quote=value=>'"'+value.replaceAll('"','""')+'"';
export function validateStorageAccess(catalog){
 if(!Array.isArray(catalog.policies)||!Array.isArray(catalog.grants)||catalog.policies.length>256||catalog.grants.length>128)throw storageError('STORAGE_ACCESS_FORMAT');
 const seen=new Set();
 for(const p of catalog.policies){
  const key=JSON.stringify([p.tablename,p.policyname]);
  if(!tables.has(p.tablename)||!identifier(p.policyname)||seen.has(key)||!commands.has(p.cmd)||!['PERMISSIVE','RESTRICTIVE'].includes(p.permissive)||!Array.isArray(p.roles)||!p.roles.length||p.roles.some(r=>!identifier(r)))throw storageError('STORAGE_POLICY_FORMAT');
  seen.add(key);
  for(const expression of [p.qual,p.with_check])if(expression!==null&&(typeof expression!=='string'||expression.length>16384||/[;\\\u0000]|--|\/\*/.test(expression)))throw storageError('STORAGE_POLICY_FORMAT');
 }
 for(const g of catalog.grants)if(!tables.has(g.table)||!STORAGE_CLIENT_ROLES.includes(g.role)||!privileges.has(g.privilege)||typeof g.grantable!=='boolean')throw storageError('STORAGE_GRANT_FORMAT');
}

export function validateStorageRls(security){
 if(!Array.isArray(security)||security.length!==2||new Set(security.map(s=>s.table)).size!==2||security.some(s=>!tables.has(s.table)||s.enabled!==true||typeof s.forced!=='boolean'))throw storageError('STORAGE_RLS_STATE');
}

/** Service-generated IDs/physical versions remain those of the fresh Storage
 * backend. Restore logical ownership, creation dates, user metadata and client
 * access. Update timestamps remain those of this recovery operation. */
export function storageMetadataSql(catalog){
 validateStorageAccess(catalog);
 validateStorageRls(catalog.security);
 const payload=Buffer.from(JSON.stringify({buckets:catalog.buckets,objects:catalog.objects})).toString('base64');
 const json=`convert_from(decode('${payload}','base64'),'UTF8')::jsonb`;
 const policies=catalog.policies.map(p=>`CREATE POLICY ${quote(p.policyname)} ON storage.${quote(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.map(r=>r==='public'?'PUBLIC':quote(r)).join(',')}${p.qual===null?'':` USING (${p.qual})`}${p.with_check===null?'':` WITH CHECK (${p.with_check})`};`).join('\n');
 const grants=catalog.grants.map(g=>`GRANT ${g.privilege} ON storage.${quote(g.table)} TO ${g.role==='PUBLIC'?'PUBLIC':quote(g.role)}${g.grantable?' WITH GRANT OPTION':''};`).join('\n');
 const security=catalog.security.map(s=>`ALTER TABLE storage.${quote(s.table)} ENABLE ROW LEVEL SECURITY; ALTER TABLE storage.${quote(s.table)} ${s.forced?'FORCE':'NO FORCE'} ROW LEVEL SECURITY;`).join('\n');
 return `BEGIN;
 DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename IN ('buckets','objects')) THEN RAISE EXCEPTION 'Storage access target must be fresh'; END IF; END $$;
 UPDATE storage.buckets b SET owner=x.owner,owner_id=x.owner_id,created_at=x.created_at
 FROM jsonb_populate_recordset(NULL::storage.buckets,${json}->'buckets') x WHERE b.id=x.id;
 UPDATE storage.objects o SET owner=x.owner,owner_id=x.owner_id,created_at=x.created_at,user_metadata=x.user_metadata
 FROM jsonb_populate_recordset(NULL::storage.objects,${json}->'objects') x WHERE o.bucket_id=x.bucket_id AND o.name=x.name;
 REVOKE ALL ON storage.buckets,storage.objects FROM PUBLIC,anon,authenticated,service_role;
 ${grants}
 ${security}
 ${policies}
 COMMIT;`;
}
