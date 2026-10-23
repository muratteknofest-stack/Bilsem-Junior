// Read-only diagnostic. Run in the server environment; never print provider errors or secrets.
import { playConfig, playSetupIssues, verifyPlayCatalog } from '../server/google-play-client';

const expectedPackage = 'com.quantumtech.bilsemjunior';
try {
  const config = playConfig();
  const issues = playSetupIssues();
  if (config.packageName !== expectedPackage) issues.push('GOOGLE_PLAY_PACKAGE_NAME');
  let catalogVerified = false;
  if (!issues.length) {
    try { await verifyPlayCatalog(); catalogVerified = true; }
    catch { issues.push('PLAY_CONSOLE_SERVICE_ACCOUNT_ACCESS_OR_ACTIVE_BASE_PLANS'); }
  }
  console.log(JSON.stringify({
    expectedPackage, productId: config.productId, catalogVerified,
    configurationReady: issues.length === 0, issues,
    salesEnabled: config.enabled, paidAccessEnforced: config.enforced,
    storePublished: process.env.GOOGLE_PLAY_STORE_PUBLISHED === 'true',
    rtdnDelivery: 'not_checked', realPurchase: 'not_checked',
  }, null, 2));
  if (issues.length) process.exitCode = 1;
} catch {
  console.error('Google Play paket/ürün yapılandırması geçersiz. Sunucu ayarlarını kontrol edin.');
  process.exitCode = 1;
}
