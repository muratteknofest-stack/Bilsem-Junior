import { z } from 'zod';
export const SHOPIER_PLANS = [
  { id: 'monthly', title: 'Başlangıç', days: 30, amountKurus: 29900 },
  { id: 'quarterly', title: 'Düzenli çalışma', days: 90, amountKurus: 79900 },
] as const;
export type ShopierPlanId = typeof SHOPIER_PLANS[number]['id'];
export function safeShopierUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['shopier.com','www.shopier.com'].includes(url.hostname)
    && !url.username && !url.password && !url.port && !url.hash && url.pathname.length > 1; } catch { return false; }
}
const id = z.string().max(80).regex(/^(?:[A-Za-z0-9_-]{1,80})?$/).default('');
const url = z.string().max(600).refine(v => !v || safeShopierUrl(v), 'Gerçek HTTPS Shopier ürün bağlantısı gerekli.').default('');
export const shopierSettingsSchema = z.object({ enabled: z.boolean().default(false), enforcePaidAccess: z.boolean().default(false),
  monthlyProductId: id, quarterlyProductId: id, monthlyUrl: url, quarterlyUrl: url }).strict()
  .default({ enabled: false, enforcePaidAccess: false, monthlyProductId: '', quarterlyProductId: '', monthlyUrl: '', quarterlyUrl: '' });
export type ShopierSettings = z.infer<typeof shopierSettingsSchema>;
export const shopierProduct = (settings: ShopierSettings, plan: ShopierPlanId) => ({
  id: plan === 'monthly' ? settings.monthlyProductId : settings.quarterlyProductId,
  url: plan === 'monthly' ? settings.monthlyUrl : settings.quarterlyUrl,
});
export function shopierConfigured(s: ShopierSettings) {
  return SHOPIER_PLANS.every(p => { const v=shopierProduct(s,p.id); return !!v.id && safeShopierUrl(v.url); })
    && s.monthlyProductId !== s.quarterlyProductId;
}
