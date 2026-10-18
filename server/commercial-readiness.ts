import {releaseBlockers,type PlatformSettings} from '../src/lib/platform-settings';
export function commercialReadiness(settings:PlatformSettings,checks:{databaseReady:boolean;originReady:boolean;playSetupReady:boolean;productsVerified:boolean}) {
 const blockers=releaseBlockers(settings);
 if(!checks.databaseReady)blockers.push('Üretim veritabanı bağlantısı');
 if(!checks.originReady)blockers.push('Gerçek HTTPS uygulama adresi');
 if(!checks.playSetupReady)blockers.push('Google Play sunucu, hesap bağlantısı ve bildirim yapılandırması');
 if(!checks.productsVerified)blockers.push('Google Play abonelik ürünü ve üç temel planın doğrulaması');
 return {readyForPaidLaunch:blockers.length===0,registrationOpen:settings.release.registrationEnabled,paidSalesEnabled:process.env.GOOGLE_PLAY_BILLING_ENABLED==='true',paidAccessEnforced:process.env.GOOGLE_PLAY_ENFORCE_PAID_ACCESS==='true',blockers};
}
