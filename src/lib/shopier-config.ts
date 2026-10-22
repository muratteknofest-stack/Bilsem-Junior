import { z } from 'zod';
export const SHOPIER_PLANS = [
  { id: 'monthly', title: 'Aylık paket', days: 30, amountKurus: 29900 },
  { id: 'quarterly', title: '3 aylık paket', days: 90, amountKurus: 69900 },
  { id: 'annual', title: 'Yıllık paket', days: 365, amountKurus: 149900 },
] as const;
export type ShopierPlanId = typeof SHOPIER_PLANS[number]['id'];
export const SHOPIER_PRODUCT_FIELDS = {
  monthly: { id: 'monthlyProductId', url: 'monthlyUrl' },
  quarterly: { id: 'quarterlyProductId', url: 'quarterlyUrl' },
  annual: { id: 'annualProductId', url: 'annualUrl' },
} as const;
export function shopierReceiptPrice(plan: ShopierPlanId, amountKurus: number) {
  return SHOPIER_PLANS.some(p => p.id === plan && p.amountKurus === amountKurus)
    || (plan === 'quarterly' && amountKurus === 79900);
}
export function safeShopierUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['shopier.com','www.shopier.com'].includes(url.hostname)
    && !url.username && !url.password && !url.port && !url.hash && url.pathname.length > 1; } catch { return false; }
}
const id = z.string().max(80).regex(/^(?:[A-Za-z0-9_-]{1,80})?$/).default('');
const url = z.string().max(600).refine(v => !v || safeShopierUrl(v), 'Gerçek HTTPS Shopier ürün bağlantısı gerekli.').default('');
export const shopierSettingsSchema = z.object({ enabled: z.boolean().default(false), enforcePaidAccess: z.boolean().default(false),
  monthlyProductId: id, quarterlyProductId: id, annualProductId: id, monthlyUrl: url, quarterlyUrl: url, annualUrl: url }).strict()
  .default({ enabled: false, enforcePaidAccess: false, monthlyProductId: '', quarterlyProductId: '', annualProductId: '', monthlyUrl: '', quarterlyUrl: '', annualUrl: '' });
export type ShopierSettings = z.infer<typeof shopierSettingsSchema>;
export const shopierProduct = (settings: ShopierSettings, plan: ShopierPlanId) => ({
  id: settings[SHOPIER_PRODUCT_FIELDS[plan].id],
  url: settings[SHOPIER_PRODUCT_FIELDS[plan].url],
});
export function shopierConfigured(s: ShopierSettings) {
  return SHOPIER_PLANS.every(p => { const v=shopierProduct(s,p.id); return !!v.id && safeShopierUrl(v.url); })
    && new Set(SHOPIER_PLANS.map(p => shopierProduct(s,p.id).id)).size === SHOPIER_PLANS.length
    && new Set(SHOPIER_PLANS.map(p => shopierProduct(s,p.id).url)).size === SHOPIER_PLANS.length;
}

