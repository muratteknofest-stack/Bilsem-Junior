// Read-only deployment diagnostic. Never activates sales or grants student access.
import { readPlatformSettings } from '../server/platform-settings.ts';
import { inspectShopierProducts, inspectShopierPackageCandidates } from '../server/shopier-diagnostics.ts';

if (process.env.VERCEL_ENV === 'production' && process.env.SHOPIER_ACCESS_TOKEN) {
  try {
    const { settings } = await readPlatformSettings();
    const report = await inspectShopierProducts(settings.shopier);
    console.log('SHOPIER_CONNECTION ' + JSON.stringify(report));
    if (!report.configured || report.products.some(product => !product.readable)) {
      console.log('SHOPIER_PACKAGE_CANDIDATES ' + JSON.stringify(await inspectShopierPackageCandidates()));
    }
  } catch {
    console.warn('SHOPIER_CONNECTION settings-unavailable');
  }
} else {
  console.log('SHOPIER_CONNECTION skipped: production credential not configured');
}
