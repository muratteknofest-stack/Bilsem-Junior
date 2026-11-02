import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

/**
 * One sanitized status record per backup run, produced even when the run
 * fails. It replaces "no files were found" with the stage that blocked the
 * backup and the recovery evidence that does or does not exist.
 */

export const BACKUP_STATUS_FORMAT='bilsem-backup-status-v1';

async function readJson(path){
 if(!path)return null;
 try{return JSON.parse(await readFile(path,'utf8'));}catch{return null;}
}

/** @param {{doctor:Record<string,unknown>|null,verification:Record<string,unknown>|null,storageVerification?:Record<string,unknown>|null,storageRequired?:boolean,runId?:string|null,workflow?:string|null,now?:Date}} input */
export function statusFrom({doctor,verification,storageVerification=null,storageRequired=false,runId=null,workflow=null,now=new Date()}){
 const stages=Array.isArray(doctor?.stages)?doctor.stages:[];
 const failed=stages.filter(row=>row.status==='fail');
 const verified=verification?.verified===true&&verification?.isolated===true&&Number.isFinite(Date.parse(verification?.checkedAt||''));
 const storageVerified=storageVerification?.verified===true&&storageVerification?.isolated===true&&storageVerification?.productionSource===true;
 const outcome=verified&&(!storageRequired||storageVerified)?'verified':failed.length||doctor?.conclusion==='blocked'?'blocked':'incomplete';
 const gaps=[];
 if(!verified)gaps.push('İzole geri yükleme doğrulaması bu çalışmada başarıyla tamamlanmadı.');
 if(storageRequired&&!storageVerified)gaps.push('Ayrı Storage dosya arşivinin izole geri yükleme kanıtı bu çalışmada tamamlanmadı.');
 for(const row of failed)gaps.push(`${row.stage}: ${row.code}`);
 if(!doctor&&!verified)gaps.push('Yedek tanı raporu üretilemedi.');
 return {
  format:BACKUP_STATUS_FORMAT,
  runId:runId||null,
  workflow:workflow||null,
  recordedAt:now.toISOString(),
  outcome,
  databaseVerified:verified,
  storageRequired,
  storageVerified,
  projectRef:doctor?.projectRef||null,
  mode:doctor?.mode||null,
  doctorConclusion:doctor?.conclusion||null,
  stages:stages.map(({stage,status,code})=>({stage,status,code})),
  verification:verified?{
   checkedAt:verification.checkedAt,
   isolated:true,
   archiveCreatedAt:verification.archiveCreatedAt||null,
   archiveExpiresAt:verification.archiveExpiresAt||null,
   durationMs:Number.isFinite(verification.durationMs)?verification.durationMs:null,
   keyFingerprint:typeof verification.keyFingerprint==='string'?verification.keyFingerprint.slice(0,16):null,
  }:null,
  storageVerification:storageVerified?{checkedAt:storageVerification.checkedAt,buckets:storageVerification.buckets,objects:storageVerification.objects,bytes:storageVerification.bytes,projectConfigRestoreVerified:storageVerification.projectConfigRestoreVerified===true}:null,
  nextActions:[...new Set(stages.filter(row=>row.status==='fail').map(row=>row.code))],
  gaps,
  secretsIncluded:false,
 };
}

export function statusSummary(status){
 return `### Bilsem Junior yedek çalışması\n\n`+
  `Sonuç: **${status.outcome}** · Çalışma: ${status.runId||'bilinmiyor'} · ${status.recordedAt}\n\n`+
  (status.gaps.length?`**Eksikler**\n${status.gaps.map(gap=>`- ${gap}`).join('\n')}\n\n`:'')+
  (status.stages.length?`| Aşama | Sonuç |\n|---|---|\n${status.stages.map(row=>`| ${row.stage} | ${row.status} |`).join('\n')}\n\n`:'')+
  `Anahtar, parola veya bağlantı adresi bu kayda yazılmaz.\n`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
 const status=statusFrom({
  doctor:await readJson(value('--doctor')),
  verification:await readJson(value('--verification')),
  storageVerification:await readJson(value('--storage-verification')),
  storageRequired:args.includes('--storage-required'),
  runId:value('--run-id')||process.env.GITHUB_RUN_ID,
  workflow:process.env.GITHUB_WORKFLOW||null,
 });
 const output=value('--output')||'backup-status.json';
 await writeFile(output,JSON.stringify(status,null,2)+'\n',{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,statusSummary(status));
 console.log(statusSummary(status));
 if(status.outcome!=='verified')process.exitCode=1;
}
