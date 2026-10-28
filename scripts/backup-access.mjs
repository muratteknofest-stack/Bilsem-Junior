import {BACKUP_PROJECT_REF,validatedBackupUrl} from './backup-config.mjs';

/** Project-pinned Management API. Responses can contain passwords: never expose
 * a body, request, token or cause in diagnostics. No redirect is followed. */
async function managementRequest(path,token,body,fetcher){
 try{
  const response=await fetcher(`https://api.supabase.com/v1/projects/${BACKUP_PROJECT_REF}${path}`,{
   method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15_000),
  });
  if(!response.ok||!/^application\/json\b/i.test(response.headers.get('content-type')||''))throw Error();
  return await response.json();
 }catch{throw Error('Supabase geçici yedek erişimi doğrulanamadı; gizli değerler gösterilmedi.');}
}

export function temporaryBackupAccess(token,fetcher=fetch){
 let pooler;
 return async()=>{
  if(!pooler){
   const rows=await managementRequest('/config/database/pooler',token,undefined,fetcher);
   pooler=Array.isArray(rows)&&rows.find(row=>row.identifier===BACKUP_PROJECT_REF&&row.database_type==='PRIMARY'&&row.db_name==='postgres'&&/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(row.db_host));
   if(!pooler)throw Error('Bu projeye ait birincil session pooler hedefi doğrulanamadı.');
  }
  const login=await managementRequest('/cli/login-role',token,{read_only:true},fetcher);
  if(!/^cli_login_[a-z_]+$/.test(login?.role||'')||typeof login.password!=='string'||!login.password||!Number.isFinite(login.ttl_seconds)||login.ttl_seconds<60||login.ttl_seconds>3600)
   throw Error('Süreli veritabanı kimliği doğrulanamadı.');
  // Shared pooler's documented session port is 5432 even when the project
  // reports its transaction endpoint (6543). Never use that mode for dumps.
  const url=new URL(`postgresql://${pooler.db_host}:5432/postgres`);
  url.username=`${login.role}.${BACKUP_PROJECT_REF}`;url.password=login.password;
  return validatedBackupUrl(url.toString());
 };
}

export function backupConnectionEnvironment(value){
 const url=new URL(validatedBackupUrl(value));
 return {PGHOST:url.hostname,PGPORT:'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:'system',PGCONNECT_TIMEOUT:'15'};
}
