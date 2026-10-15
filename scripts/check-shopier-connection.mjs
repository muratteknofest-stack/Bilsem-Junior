// Read-only deployment diagnostic. Never activates sales or grants student access.
import { readPlatformSettings } from '../server/platform-settings.ts';
import { inspectShopierProducts } from '../server/shopier-diagnostics.ts';

if (process.env.VERCEL_ENV === 'production' && process.env.SHOPIER_ACCESS_TOKEN) {
  try {
    const { settings } = await readPlatformSettings();
    console.log('SHOPIER_CONNECTION ' + JSON.stringify(await inspectShopierProducts(settings.shopier)));
  } catch {
    console.warn('SHOPIER_CONNECTION settings-unavailable');
  }
} else {
  console.log('SHOPIER_CONNECTION skipped: production credential not configured');
}
