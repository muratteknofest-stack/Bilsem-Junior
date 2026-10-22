import { shopierSettingsSchema } from '../src/lib/shopier-config';

// Payment credentials and product configuration are deployment settings, never browser inputs.
export function shopierConfig() {
  return shopierSettingsSchema.parse({
    enabled: process.env.SHOPIER_ENABLED === 'true',
    enforcePaidAccess: process.env.SHOPIER_ENFORCE_PAID_ACCESS === 'true',
    monthlyProductId: process.env.SHOPIER_MONTHLY_PRODUCT_ID || '',
    quarterlyProductId: process.env.SHOPIER_QUARTERLY_PRODUCT_ID || '',
    annualProductId: process.env.SHOPIER_ANNUAL_PRODUCT_ID || '',
    monthlyUrl: process.env.SHOPIER_MONTHLY_URL || '',
    quarterlyUrl: process.env.SHOPIER_QUARTERLY_URL || '',
    annualUrl: process.env.SHOPIER_ANNUAL_URL || '',
  });
}
