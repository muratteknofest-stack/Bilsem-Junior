import { SHOPIER_PLANS, shopierConfigured, shopierProduct, type ShopierSettings } from '../src/lib/shopier-config';
import { shopierGet } from './shopier-client';
import { moneyKurus } from './shopier-model';

// Return a fixed allowlist of booleans. Provider bodies and credentials must never reach logs.
export async function inspectShopierProducts(settings: ShopierSettings, fetcher: typeof fetch = fetch, token = process.env.SHOPIER_ACCESS_TOKEN) {
  if (!token || !shopierConfigured(settings)) return { configured: false, products: [] };
  const products = [];
  for (const plan of SHOPIER_PLANS) {
    const configured = shopierProduct(settings, plan.id);
    let httpStatus: number | undefined;
    let networkCode: string | undefined;
    const observedFetch: typeof fetch = async (input, init) => {
      try {
        const response = await fetcher(input, init);
        httpStatus = response.status;
        return response;
      } catch (error) {
        const code = (error as any)?.cause?.code ?? (error as any)?.code;
        if (['ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNREFUSED','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET'].includes(code)) networkCode = code;
        throw error;
      }
    };
    try {
      const p = await shopierGet('products', configured.id, observedFetch, token) as any;
      let priceMatches = false;
      try { priceMatches = p?.priceData?.currency === 'TRY' && moneyKurus(p.priceData.price) === plan.amountKurus; } catch {}
      products.push({ plan: plan.id, readable: true, idMatches: p?.id === configured.id,
        priceMatches, digital: p?.type === 'digital', urlMatches: p?.url === configured.url,
        inStock: p?.stockStatus === 'inStock' });
    } catch {
      products.push({ plan: plan.id, readable: false,
        ...(httpStatus !== undefined ? { httpStatus } : {}), ...(networkCode ? { networkCode } : {}) });
    }
  }
  return { configured: true, products };
}

// Account changes invalidate old product IDs. Inspect one documented, bounded page;
// expose only candidate package identifiers and fixed booleans, never provider text.
export async function inspectShopierPackageCandidates(fetcher: typeof fetch = fetch, token = process.env.SHOPIER_ACCESS_TOKEN) {
  if (!token) return { configured: false };
  let httpStatus: number | undefined;
  try {
    const response = await fetcher('https://api.shopier.com/v1/products?limit=50&page=1&customListing=false', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    httpStatus = response.status;
    const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const responseType = mime === 'application/json' ? 'json' : mime === 'text/html' ? 'html' : 'other';
    if (!response.ok) {
      await response.body?.cancel();
      return { configured: true, readable: false, httpStatus, responseType,
        challenge: response.headers.get('cf-mitigated') === 'challenge' };
    }
    if (responseType !== 'json') { await response.body?.cancel(); return { configured: true, readable: false, httpStatus, responseType }; }
    const reader = response.body?.getReader();
    if (!reader) return { configured: true, readable: false, httpStatus };
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.length;
      if (bytes > 256_000) { await reader.cancel(); return { configured: true, readable: false, httpStatus, oversized: true }; }
      chunks.push(value);
    }
    const rows: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!Array.isArray(rows) || rows.length > 50) return { configured: true, readable: false, httpStatus, invalidResponse: true };
    const candidates = rows.flatMap((p: any) => {
      if (!p || typeof p.id !== 'string' || !/^\d{1,20}$/.test(p.id) || typeof p.url !== 'string') return [];
      let url: URL;
      try { url = new URL(p.url); } catch { return []; }
      if (url.protocol !== 'https:' || !['shopier.com','www.shopier.com'].includes(url.hostname) || url.username || url.password
        || url.port || url.search || url.hash || !/^\/(?:[A-Za-z0-9_.-]{1,80}\/)?\d{1,20}$/.test(url.pathname)
        || url.pathname.split('/').pop() !== p.id || p.priceData?.currency !== 'TRY') return [];
      let amount: number; try { amount = moneyKurus(p.priceData.price); } catch { return []; }
      let freeShipping = false; try { freeShipping = moneyKurus(p.priceData.shippingPrice) === 0; } catch { /* Unknown shipping is not verified. */ }
      const plan = SHOPIER_PLANS.find(plan => plan.amountKurus === amount); if (!plan) return [];
      const title = typeof p.title === 'string' ? p.title.toLocaleLowerCase('tr-TR') : '';
      const durationMatches = plan.id === 'annual' ? /yıllık|yillik|12\s*ay|1\s*yıl/.test(title)
        : plan.id === 'quarterly' ? /3\s*ay|üç\s*ay/.test(title) : /aylık|aylik|1\s*ay/.test(title) && !/3\s*ay|üç\s*ay|12\s*ay/.test(title);
      return [{ plan: plan.id, productId: p.id, url: url.toString(),
        titleMatchesPlan: title.includes('zekapark') && durationMatches,
        digital: p.type === 'digital', inStock: p.stockStatus === 'inStock',
        noDiscount: p.priceData?.discount === false, freeShipping,
        noVariants: p.variants === undefined || (Array.isArray(p.variants) && p.variants.length === 0),
        noOptions: p.options === undefined || (Array.isArray(p.options) && p.options.length === 0) }];
    });
    return { configured: true, readable: true, httpStatus, scanned: rows.length, hasMore: rows.length === 50, candidates };
  } catch {
    return { configured: true, readable: false, ...(httpStatus !== undefined ? { httpStatus } : {}) };
  }
}
