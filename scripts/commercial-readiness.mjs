// Read-only; never print provider bodies, receipts or credentials.
import {readPlatformSettings} from '../server/platform-settings.ts';
import {commercialReadiness} from '../server/commercial-readiness.ts';
import {playSetupReady,verifyPlayCatalog} from '../server/google-play-client.ts';
try {
 const {settings}=await readPlatformSettings();let databaseReady=false,originReady=false,productsVerified=false;
 try {const origin=new URL(process.env.APP_BASE_URL||process.env.PUBLIC_SITE_URL||'');originReady=origin.protocol==='https:'&&!origin.username&&!origin.password&&origin.pathname==='/'&&!origin.search&&!origin.hash;
 if(originReady){const r=await fetch(new URL('/api/health',origin),{redirect:'error',signal:AbortSignal.timeout(10000)});const h=await r.json();databaseReady=r.ok&&h.status==='ok'&&h.database==='ready'&&h.projectRef===new URL(process.env.SUPABASE_URL).hostname.split('.')[0];}}catch{}
 const setup=playSetupReady();if(setup)try{await verifyPlayCatalog();productsVerified=true;}catch{}
 const report=commercialReadiness(settings,{databaseReady,originReady,playSetupReady:setup,productsVerified});
 console.log(JSON.stringify(report));if(!report.readyForPaidLaunch)process.exitCode=1;
}catch{console.error('Google Play yayın hazırlığı doğrulanamadı. Sunucu yapılandırmasını kontrol edin.');process.exitCode=1;}
