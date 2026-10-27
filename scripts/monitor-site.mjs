import {writeFile,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
export async function monitorSite(fetcher=fetch, {expectedPaidSales}={}){
 const checks=[];
 for(const path of ['/','/blog','/konu-anlatimlari','/api/health','/api/public/platform','/api/public/membership','/bilgi/gizlilik-ve-veriler','/bilgi/abonelik-iptal-ve-iade','/api/account/export','/api/admin/platform-settings']){
  const start=performance.now();let ok=false;
  try{
   const response=await fetcher(new URL(path,'https://bilsemjunior.vercel.app'),{redirect:'manual',signal:AbortSignal.timeout(20_000)});
   const privateRoute=['/api/account/export','/api/admin/platform-settings'].includes(path);
   ok=response.status===(privateRoute?401:200)&&!response.redirected&&response.headers.get('x-content-type-options')==='nosniff';
   if(path.startsWith('/api/'))ok=ok&&response.headers.get('cache-control')==='no-store';
   if(path==='/api/health'){const data=await response.json();ok=ok&&data.status==='ok'&&data.database==='ready'&&data.projectRef==='vtcsoqohkiagbwatlabk';}
   else if(path==='/api/public/platform'){const data=await response.json();ok=ok&&typeof data.registrationOpen==='boolean'&&typeof data.policyVersion==='string';}
   else if(path==='/api/public/membership'){const data=await response.json();ok=ok&&typeof data.ready==='boolean'&&Array.isArray(data.plans)&&data.plans.length===3&&(expectedPaidSales===undefined||data.ready===expectedPaidSales);}
   else await response.arrayBuffer();
  }catch{}
  checks.push({path,ok,durationMs:Math.round(performance.now()-start)});
 }
 return {ok:checks.every(check=>check.ok),checkedAt:new Date().toISOString(),checks};
}
export function monitorSummary(report){return `### Bilsem Junior production health\n\n${report.ok?'All checks passed.':'FAILURE: investigate the failed route before marking recovery.'}\n\n| Route | Status | Duration |\n|---|---|---|\n${report.checks.map(c=>`| ${c.path} | ${c.ok?'OK':'FAILED'} | ${c.durationMs} ms |`).join('\n')}\n\nNo credentials or customer response bodies are included.\n`;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const origin=new URL(process.env.MONITOR_SITE_URL||'https://bilsemjunior.vercel.app');
 if(origin.origin!=='https://bilsemjunior.vercel.app'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error('İzleme hedefi doğrulanamadı.');
 const expected=process.env.MONITOR_EXPECT_PAID_SALES;
 if(expected!==undefined&&!['true','false'].includes(expected))throw Error('İzleme satış beklentisi true veya false olmalıdır.');
 const report=await monitorSite(fetch,{expectedPaidSales:expected===undefined?undefined:expected==='true'});
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,monitorSummary(report));
 if(process.env.MONITOR_REPORT_FILE)await writeFile(process.env.MONITOR_REPORT_FILE,JSON.stringify(report,null,2));
 console.log(report.ok?'Site, blog, API ve veritabanı sağlık kontrolleri geçti.':'Hizmet kontrolü başarısız. GitHub Actions kontrol özeti incelenmeli.');process.exitCode=report.ok?0:1;
}
