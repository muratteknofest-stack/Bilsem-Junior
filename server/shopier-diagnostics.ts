import { SHOPIER_PLANS, shopierConfigured, shopierProduct, type ShopierSettings } from '../src/lib/shopier-config';
import { shopierGet } from './shopier-client';
import { moneyKurus } from './shopier-model';

// Return a fixed allowlist of booleans. Provider bodies and credentials must never reach logs.
export async function inspectShopierProducts(settings: ShopierSettings, fetcher: typeof fetch = fetch, token = process.env.SHOPIER_ACCESS_TOKEN) {
  if (!token || !shopierConfigured(settings)) return { configured: false, products: [] };
  const products = [];
  for (const plan of SHOPIER_PLANS) {
    const configured = shopierProduct(settings, plan.id);
    try {
      const p = await shopierGet('products', configured.id, fetcher, token) as any;
      let priceMatches = false;
      try { priceMatches = p?.priceData?.currency === 'TRY' && moneyKurus(p.priceData.price) === plan.amountKurus; } catch {}
      products.push({ plan: plan.id, readable: true, idMatches: p?.id === configured.id,
        priceMatches, digital: p?.type === 'digital', urlMatches: p?.url === configured.url,
        inStock: p?.stockStatus === 'inStock' });
    } catch {
      products.push({ plan: plan.id, readable: false });
    }
  }
  return { configured: true, products };
}
