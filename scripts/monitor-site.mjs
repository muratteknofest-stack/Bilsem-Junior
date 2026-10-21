import {writeFile,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
export async function monitorSite(fetcher=fetch){
 const checks=[];
 for(const path of ['/','/blog','/api/health','/api/public/platform']){
  const start=performance.now();let ok=false;
  try{
   const response=await fetcher(new URL(path,'https://zekapark.vercel.app'),{redirect:'manual',signal:AbortSignal.timeout(20_000)});
   ok=response.status===200&&!response.redirected&&response.headers.get('x-content-type-options')==='nosniff';
   if(path.startsWith('/api/'))ok=ok&&response.headers.get('cache-control')==='no-store';
   if(path==='/api/health'){const data=await response.json();ok=ok&&data.status==='ok'&&data.database==='ready'&&data.projectRef==='vtcsoqohkiagbwatlabk';}
   else if(path==='/api/public/platform'){const data=await response.json();ok=ok&&typeof data.registrationOpen==='boolean'&&typeof data.policyVersion==='string';}
   else await response.arrayBuffer();
  }catch{}
  checks.push({path,ok,durationMs:Math.round(performance.now()-start)});
 }
 return {ok:checks.every(check=>check.ok),checkedAt:new Date().toISOString(),checks};
}
export function monitorSummary(report){return `### ZekaPark production health\n\n${report.ok?'All checks passed.':'FAILURE: investigate the failed route before marking recovery.'}\n\n| Route | Status | Duration |\n|---|---|---|\n${report.checks.map(c=>`| ${c.path} | ${c.ok?'OK':'FAILED'} | ${c.durationMs} ms |`).join('\n')}\n\nNo credentials or customer response bodies are included.\n`;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const origin=new URL(process.env.MONITOR_SITE_URL||'https://zekapark.vercel.app');
 if(origin.origin!=='https://zekapark.vercel.app'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error('İzleme hedefi doğrulanamadı.');
 const report=await monitorSite();
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,monitorSummary(report));
 if(process.env.MONITOR_REPORT_FILE)await writeFile(process.env.MONITOR_REPORT_FILE,JSON.stringify(report,null,2));
 console.log(report.ok?'Site, blog, API ve veritabanı sağlık kontrolleri geçti.':'Hizmet kontrolü başarısız. GitHub Actions kontrol özeti incelenmeli.');process.exitCode=report.ok?0:1;
}
