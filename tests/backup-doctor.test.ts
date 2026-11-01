import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import {resolve} from 'node:path';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {connect as netConnect,createServer,type Socket} from 'node:net';
import {createSecureContext,TLSSocket,type SecureContext} from 'node:tls';
import {parse} from 'yaml';
import {
  DOCTOR_FORMAT,classifyProbeError,doctorSummary,nextActionFor,postgresToolVersions,
  probeTls,providerStatusStage,runBackupDoctor,
} from '../scripts/backup-doctor.mjs';
import {BACKUP_STATUS_FORMAT,statusFrom,statusSummary} from '../scripts/backup-status.mjs';

const token='sbp_'+'a'.repeat(40),key=randomBytes(32).toString('base64');
const poolerHost='aws-1-eu-central-1.pooler.supabase.com';
const env={BACKUP_ENCRYPTION_KEY:key,SUPABASE_ACCESS_TOKEN:token};
const tools=async()=>[{tool:'pg_dump',ok:true},{tool:'pg_dumpall',ok:true},{tool:'psql',ok:true}];
const okProbe=async()=>({ok:true,code:'OK'});

function managementFetcher({poolerStatus=200,loginStatus=200}={}){
 const calls:string[]=[];
 const fetcher=async(input:RequestInfo|URL,options?:RequestInit)=>{
  const url=String(input);calls.push(url);
  assert.ok(url.startsWith('https://api.supabase.com/v1/projects/vtcsoqohkiagbwatlabk/'));
  assert.equal(options?.redirect,'error');
  if(url.endsWith('/config/database/pooler')){
   if(poolerStatus!==200)return new Response('fixture-secret-body',{status:poolerStatus,headers:{'content-type':'application/json'}});
   return Response.json([{identifier:'vtcsoqohkiagbwatlabk',database_type:'PRIMARY',db_name:'postgres',db_host:poolerHost,db_port:6543}]);
  }
  assert.ok(url.endsWith('/cli/login-role'));
  if(loginStatus!==200)return new Response('fixture-secret-body',{status:loginStatus,headers:{'content-type':'application/json'}});
  return Response.json({role:'cli_login_postgres',password:'fixture-private-password',ttl_seconds:600});
 };
 return {fetcher,calls};
}

test('provider and probe failures map to fixed operator codes, never to raw messages',()=>{
 assert.equal(providerStatusStage('provider_api',401).code,'TOKEN_PERMISSION');
 assert.equal(providerStatusStage('provider_api',403).code,'TOKEN_PERMISSION');
 assert.equal(providerStatusStage('provider_api',404).code,'ENDPOINT_UNAVAILABLE');
 assert.equal(providerStatusStage('provider_api',429).code,'RATE_LIMIT');
 assert.equal(providerStatusStage('provider_api',503).code,'PROVIDER_ERROR');
 assert.equal(providerStatusStage('provider_api',418).code,'PROVIDER_REJECTED');
 for(const [code,expected] of [
  ['CERT_HAS_EXPIRED','TLS_CERTIFICATE'],['SELF_SIGNED_CERT_IN_CHAIN','TLS_CERTIFICATE'],
  ['ERR_TLS_CERT_ALTNAME_INVALID','TLS_HOSTNAME'],['ENOTFOUND','DNS'],['EAI_AGAIN','DNS'],
  ['ETIMEDOUT','TIMEOUT'],['ECONNREFUSED','CONNECTION_REFUSED'],['ERR_SSL_WRONG_VERSION_NUMBER','TLS_HANDSHAKE'],
  ['ECONNRESET','CONNECTION'],
 ])assert.equal(classifyProbeError(Object.assign(Error('private-host private-password'),{code})),expected,code);
 assert.equal(classifyProbeError(Object.assign(Error('x'),{name:'AbortError'})),'TIMEOUT');
 assert.match(nextActionFor('TOKEN_PERMISSION'),/database/);
 assert.match(nextActionFor('TLS_CERTIFICATE'),/TLS doğrulaması gevşetilmemeli/);
 assert.equal(nextActionFor('UNLISTED'),nextActionFor('UNKNOWN'));
});

const sslRequest=Buffer.from([0,0,0,8,4,210,22,47]);
type ProbeServerMode='upgrade'|'refuse'|'stuffed'|'invalid'|'silent'|'close';

async function postgresProbeServer(mode:ProbeServerMode,context:SecureContext){
 const sockets=new Set<Socket>();
 const requests:Buffer[]=[];
 let applicationBytes=0;
 const server=createServer(socket=>{
  sockets.add(socket);socket.on('error',()=>{});
  socket.once('close',()=>sockets.delete(socket));
  if(mode==='close'){socket.end();return;}
  if(mode==='silent')return;
  let request=Buffer.alloc(0);
  const initial=(chunk:Buffer)=>{
   request=Buffer.concat([request,chunk]);
   if(request.length<8)return;
   requests.push(request);socket.removeListener('data',initial);
   if(!request.equals(sslRequest)){socket.destroy();return;}
   if(mode==='refuse'){socket.end('N');return;}
   if(mode==='stuffed'){socket.end('Sunexpected-bytes');return;}
   if(mode==='invalid'){socket.end('E');return;}
   socket.write('S');
   const secured=new TLSSocket(socket,{isServer:true,secureContext:context});
   sockets.add(secured);secured.on('error',()=>{});
   secured.once('close',()=>sockets.delete(secured));
   secured.on('data',(chunk:Buffer)=>{applicationBytes+=chunk.length;});
  };
  socket.on('data',initial);
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();assert.ok(address&&typeof address!=='string');
 return {
  port:address.port,requests,get applicationBytes(){return applicationBytes;},
  // Route the loopback fixture without changing the hostname checked by TLS.
  tcpConnect:((options:{port:number})=>netConnect({host:'127.0.0.1',port:options.port})) as typeof netConnect,
  close:async()=>{for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));},
 };
}

test('PostgreSQL TLS probe negotiates SSLRequest and rejects unsafe or incomplete connections',async t=>{
 const dir=await mkdtemp(resolve(tmpdir(),'bilsem-pg-tls-test-'));
 try{
  const keyPath=resolve(dir,'key.pem'),certPath=resolve(dir,'cert.pem');
  const generated=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1',
   '-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost',
   '-keyout',keyPath,'-out',certPath],{stdio:'ignore'});
  assert.equal(generated.status,0,'OpenSSL must create an ephemeral local TLS fixture');
  const cert=await readFile(certPath),key=await readFile(keyPath);
  const context=createSecureContext({cert,key});
  await t.test('trusted TLS starts only after the exact PostgreSQL SSLRequest and sends no credentials',async()=>{
   const fixture=await postgresProbeServer('upgrade',context);
   try{
    const result=await probeTls({host:'localhost',port:fixture.port,ca:cert,tcpConnect:fixture.tcpConnect,timeoutMs:3000});
    assert.deepEqual(result,{ok:true,code:'OK'});
    assert.deepEqual(fixture.requests,[sslRequest]);
    assert.equal(fixture.applicationBytes,0);
   }finally{await fixture.close();}
  });
  await t.test('untrusted certificates and incorrect hostnames remain rejected',async()=>{
   for(const [host,ca,code] of [['localhost',undefined,'TLS_CERTIFICATE'],['mismatch.invalid',cert,'TLS_HOSTNAME']] as const){
    const fixture=await postgresProbeServer('upgrade',context);
    try{assert.deepEqual(await probeTls({host,port:fixture.port,ca,tcpConnect:fixture.tcpConnect,timeoutMs:3000}),{ok:false,code});}
    finally{await fixture.close();}
   }
  });
  await t.test('SSL refusal, injected bytes and invalid responses never fall back to plaintext',async()=>{
   for(const [mode,code] of [['refuse','TLS_UNSUPPORTED'],['stuffed','TLS_PROTOCOL'],['invalid','TLS_PROTOCOL']] as const){
    const fixture=await postgresProbeServer(mode,context);
    try{
     assert.deepEqual(await probeTls({host:'localhost',port:fixture.port,ca:cert,tcpConnect:fixture.tcpConnect,timeoutMs:1000}),{ok:false,code});
     assert.deepEqual(fixture.requests,[sslRequest]);
    }finally{await fixture.close();}
   }
  });
  await t.test('silent peers time out and closed peers fail without waiting for the deadline',async()=>{
   for(const [mode,code] of [['silent','TIMEOUT'],['close','CONNECTION']] as const){
    const fixture=await postgresProbeServer(mode,context);
    try{assert.deepEqual(await probeTls({host:'localhost',port:fixture.port,ca:cert,tcpConnect:fixture.tcpConnect,timeoutMs:100}),{ok:false,code});}
    finally{await fixture.close();}
   }
   assert.deepEqual(await probeTls({host:'fixture.invalid',tcpConnect:()=>{throw Object.assign(Error('private'),{code:'ENOTFOUND'});}}),{ok:false,code:'DNS'});
  });
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('a fully configured token pipeline is reported ready, with no secret or host in the report',async()=>{
 const {fetcher}=managementFetcher();
 const report=await runBackupDoctor({env,fetcher,tools,probe:okProbe});
 assert.equal(report.format,DOCTOR_FORMAT);
 assert.equal(report.conclusion,'ready');
 assert.equal(report.mode,'token');
 assert.ok(report.stages.every((row:any)=>row.status==='pass'));
 assert.deepEqual(report.nextActions,[]);
 const serialized=JSON.stringify(report);
 for(const secret of [token,key,'fixture-private-password',poolerHost,'api.supabase.com'])
  assert.ok(!serialized.includes(secret),`Report must not contain ${secret}`);
 assert.match(doctorSummary(report),/PASS/);
 assert.match(doctorSummary(report),/gizli değer|anahtar, parola/i);
});

test('missing scopes, provider outages and identity failures name the stage that blocked the backup',async()=>{
 const denied=await runBackupDoctor({env,fetcher:managementFetcher({poolerStatus:401}).fetcher,tools,probe:okProbe});
 assert.equal(denied.conclusion,'blocked');
 assert.equal(denied.stages.find((row:any)=>row.stage==='provider_api').code,'TOKEN_PERMISSION');
 assert.ok(denied.nextActions.some((action:any)=>/database/.test(action)));
 assert.ok(!JSON.stringify(denied).includes('fixture-secret-body'));

 const loginDenied=await runBackupDoctor({env,fetcher:managementFetcher({loginStatus:403}).fetcher,tools,probe:okProbe});
 assert.equal(loginDenied.stages.find((row:any)=>row.stage==='login_role').code,'TOKEN_PERMISSION');

 const offlineProvider=await runBackupDoctor({env,fetcher:async()=>{throw Object.assign(Error('private-host'),{code:'ENOTFOUND'});},tools,probe:okProbe});
 assert.equal(offlineProvider.stages.find((row:any)=>row.stage==='provider_api').code,'PROVIDER_UNREACHABLE');
 assert.ok(!JSON.stringify(offlineProvider).includes('private-host'));

 const badIdentity=await runBackupDoctor({env,fetcher:async(input:RequestInfo|URL)=>{
  const url=String(input);
  if(url.endsWith('/pooler'))return Response.json([{identifier:'vtcsoqohkiagbwatlabk',database_type:'PRIMARY',db_name:'postgres',db_host:poolerHost}]);
  return Response.json({role:'postgres',password:'fixture-private-password',ttl_seconds:600});
 },tools,probe:okProbe});
 assert.equal(badIdentity.stages.find((row:any)=>row.stage==='login_role').code,'LOGIN_IDENTITY');
 assert.ok(!JSON.stringify(badIdentity).includes('fixture-private-password'));
});

test('TLS and tool failures block the run instead of being treated as success',async()=>{
 const tlsFailure=await runBackupDoctor({env,fetcher:managementFetcher().fetcher,tools,probe:async()=>({ok:false,code:'TLS_CERTIFICATE'})});
 assert.equal(tlsFailure.conclusion,'blocked');
 assert.equal(tlsFailure.stages.find((row:any)=>row.stage==='database_tls').code,'TLS_CERTIFICATE');

 const oldTools=await runBackupDoctor({env,fetcher:managementFetcher().fetcher,tools:async()=>[{tool:'pg_dump',ok:false},{tool:'pg_dumpall',ok:true},{tool:'psql',ok:true}],probe:okProbe});
 assert.equal(oldTools.stages.find((row:any)=>row.stage==='postgres_tools').code,'POSTGRES_TOOLS');
});

test('an unconfigured or offline doctor is partial, never reported as ready',async()=>{
 const missing=await runBackupDoctor({env:{},fetcher:managementFetcher().fetcher,tools,probe:okProbe});
 assert.equal(missing.conclusion,'blocked');
 assert.equal(missing.stages.find((row:any)=>row.stage==='environment').code,'CONFIGURATION');
 assert.match(String(missing.stages.find((row:any)=>row.stage==='environment').detail),/SUPABASE_DB_URL/);

 const offline=await runBackupDoctor({env,fetcher:managementFetcher().fetcher,tools,probe:okProbe,offline:true});
 assert.equal(offline.conclusion,'partial');
 assert.ok(offline.stages.filter((row:any)=>row.stage!=='environment'&&row.stage!=='certificate_bundle').every((row:any)=>row.status==='skip'));
});

test('postgres tool detection requires version 17 and tolerates missing binaries',async()=>{
 const fake=(output:string,code=0)=>(()=>{const child:any=new EventEmitter();child.stdout=new EventEmitter();
  setImmediate(()=>{child.stdout.emit('data',Buffer.from(output));child.emit('close',code);});return child;}) as never;
 const versions=await postgresToolVersions({spawnImpl:fake('pg_dump (PostgreSQL) 17.6')});
 assert.ok(versions.every((row:any)=>row.ok));
 const sixteen=await postgresToolVersions({spawnImpl:fake('pg_dump (PostgreSQL) 16.4')});
 assert.ok(sixteen.every((row:any)=>!row.ok));
});

test('the backup status record distinguishes verified recovery from a blocked run',()=>{
 const doctor={projectRef:'vtcsoqohkiagbwatlabk',mode:'token',conclusion:'blocked',stages:[
  {stage:'environment',status:'pass',code:'OK',detail:'ok'},
  {stage:'provider_api',status:'fail',code:'TOKEN_PERMISSION',detail:'anahtar kapsamı yetersiz'},
 ]};
 const blocked=statusFrom({doctor,verification:null,runId:'123',workflow:'Encrypted database backup',now:new Date('2026-11-01T00:00:00Z')});
 assert.equal(blocked.format,BACKUP_STATUS_FORMAT);
 assert.equal(blocked.outcome,'blocked');
 assert.equal(blocked.verification,null);
 assert.ok(blocked.gaps.some(gap=>/provider_api/.test(gap)));
 assert.ok(!JSON.stringify(blocked).includes('anahtar kapsamı yetersiz'),'Stage details stay out of the status artifact');

 const verified=statusFrom({doctor:{...doctor,conclusion:'ready',stages:[]},verification:{
  verified:true,isolated:true,checkedAt:'2026-11-01T00:10:00Z',durationMs:1234,keyFingerprint:'abcdef0123456789',
  archiveCreatedAt:'2026-11-01T00:00:00Z',archiveExpiresAt:'2026-12-01T00:00:00Z',
 },runId:'124',workflow:'Encrypted database backup',now:new Date('2026-11-01T00:20:00Z')});
 assert.equal(verified.outcome,'verified');
 assert.deepEqual(verified.gaps,[]);
 assert.equal(verified.verification!.durationMs,1234);
 assert.equal(verified.verification!.keyFingerprint,'abcdef0123456789');
 assert.match(statusSummary(verified),/verified/);
 assert.match(statusSummary(blocked),/Eksikler/);

 const claimedButNotIsolated=statusFrom({doctor:null,verification:{verified:true,isolated:false,checkedAt:'2026-11-01T00:10:00Z'},runId:null,workflow:null});
 assert.notEqual(claimedButNotIsolated.outcome,'verified');
});

test('the backup workflow diagnoses first, publishes evidence on failure and never fails on a missing artifact',()=>{
 const workflow=parse(readFileSync(resolve('.github/workflows/backup.yml'),'utf8'));
 const job=Object.values(workflow.jobs)[0] as {steps:Array<{name?:string;run?:string;if?:string;uses?:string;with?:Record<string,unknown>;env?:Record<string,string>}>};
 const named=(name:string)=>job.steps.find(step=>step.name===name);
 const doctor=named('Diagnose backup pipeline without exposing values');
 assert.ok(doctor?.run?.includes('scripts/backup-doctor.mjs'));
 const createIndex=job.steps.findIndex(step=>step.name==='Create and encrypt backup');
 assert.ok(job.steps.indexOf(doctor!)<createIndex,'Diagnosis must run before the dump');
 assert.match(JSON.stringify(doctor?.env),/secrets\.SUPABASE_ACCESS_TOKEN/);

 const status=named('Publish sanitized backup status');
 assert.equal(status?.if,'always()');
 assert.equal((status as Record<string,unknown>|undefined)?.['continue-on-error'],true);
 assert.match(status?.run||'',/backup-status\.mjs/);

 const evidence=named('Retain encrypted archive');
 assert.equal(evidence?.if,'always()');
 assert.equal((evidence?.with as Record<string,unknown>)['if-no-files-found'],'ignore');
 assert.match(JSON.stringify(evidence),/backup-status\.json/);
 assert.match(JSON.stringify(evidence),/backup-doctor\.json/);
 assert.ok(!job.steps.some(step=>(step.with as Record<string,unknown>|undefined)?.['if-no-files-found']==='error'),'A failed backup must not also fail on artifact discovery');
});
