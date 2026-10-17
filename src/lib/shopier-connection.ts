import { SHOPIER_PLANS, type ShopierPlanId } from './shopier-config';

export interface ShopierPackageCandidate {
  plan: ShopierPlanId; productId: string; url: string; titleMatchesPlan: boolean;
  digital: boolean; inStock: boolean; noDiscount: boolean; freeShipping: boolean; noVariants: boolean; noOptions: boolean;
}
/** Never guess between two packages or auto-fill an incompatible product. */
export function selectShopierPackageCandidates(candidates: ShopierPackageCandidate[]) {
  const selected: ShopierPackageCandidate[] = [];
  const unresolved: ShopierPlanId[] = [];
  for (const plan of SHOPIER_PLANS) {
    const eligible = candidates.filter(candidate => candidate.plan === plan.id && candidate.titleMatchesPlan && candidate.digital && candidate.inStock && candidate.noDiscount && candidate.freeShipping && candidate.noVariants && candidate.noOptions);
    const unique = [...new Map(eligible.map(candidate => [candidate.productId, candidate])).values()];
    if (unique.length === 1) selected.push(unique[0]);
    else unresolved.push(plan.id);
  }
  return { selected, unresolved };
}
export function shopierConnectionMessage(report: { configured?: boolean; readable?: boolean; httpStatus?: number; challenge?: boolean }) {
  if (!report.configured) return 'Sunucuda Shopier erişim anahtarı tanımlı değil. Anahtarı Vercel proje ayarlarına ekleyin; bu ekrana yazmayın.';
  if (report.httpStatus === 401) return 'Shopier anahtarı doğrulamadı (401). Anahtarın güncel hesabınıza ait olduğunu ve iptal edilmediğini kontrol edin; gerekiyorsa Vercel’de yenileyip yeniden dağıtın.';
  if (report.httpStatus === 403) return report.challenge ? 'Shopier erişim doğrulaması istiyor (403). Bağlantı engeli çözülmeden satış doğrulanamaz.' : 'Shopier erişimi reddetti (403). Ürün ve sipariş okuma izinlerini kontrol edin.';
  if (!report.readable) return 'Shopier yanıtı doğrulanamadı. Bağlantıyı yeniden deneyin; satış doğrulanana kadar kapalı kalır.';
  return 'Shopier ürün bağlantısı yanıt veriyor. Üç paketin fiyatını ve ürün eşleşmesini kontrol edin.';
}
