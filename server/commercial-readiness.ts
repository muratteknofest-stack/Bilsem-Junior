import {releaseBlockers,type PlatformSettings} from '../src/lib/platform-settings';
import {shopierConfigured} from '../src/lib/shopier-config';

export function commercialReadiness(settings:PlatformSettings,checks:{databaseReady:boolean;originReady:boolean;shopierTokenReady:boolean;productsVerified:boolean}){
 const blockers=releaseBlockers(settings);
 if(!checks.databaseReady)blockers.push('Üretim veritabanı bağlantısı');
 if(!checks.originReady)blockers.push('Gerçek HTTPS uygulama adresi');
 if(!shopierConfigured(settings.shopier))blockers.push('İki gerçek Shopier ürün numarası ve HTTPS ürün bağlantısı');
 if(!checks.shopierTokenReady)blockers.push('Sunucuda Shopier erişim anahtarı');
 if(!checks.productsVerified)blockers.push('Shopier ürünlerinin fiyat ve dijital teslimat doğrulaması');
 return {readyForPaidLaunch:blockers.length===0,registrationOpen:settings.release.registrationEnabled,paidSalesEnabled:settings.shopier.enabled,paidAccessEnforced:settings.shopier.enforcePaidAccess,blockers};
}
