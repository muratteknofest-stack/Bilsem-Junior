import { authenticatedFetch } from '../lib/api-client';

export interface BillingStatus {
  enabled: boolean;
  plan: string;
  status: string;
  currentPeriodEnd: number | null;
}

async function readError(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  throw new Error(payload.error || fallback);
}

let pendingCheckoutRequestId: string | null = null;

export async function getBillingStatus(): Promise<BillingStatus> {
  const response = await authenticatedFetch('/api/billing/status');
  if (!response.ok) return readError(response, 'Abonelik durumu alınamadı.');
  return response.json();
}

export async function createCheckout(): Promise<string> {
  const requestId = pendingCheckoutRequestId || crypto.randomUUID();
  pendingCheckoutRequestId = requestId;
  const response = await authenticatedFetch('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan: 'family-premium', requestId }),
  });
  if (!response.ok) {
    if (response.status < 500) pendingCheckoutRequestId = null;
    return readError(response, 'Güvenli ödeme sayfası açılamadı.');
  }
  const payload = await response.json() as { checkoutUrl?: string };
  if (!payload.checkoutUrl) throw new Error('Ödeme bağlantısı alınamadı.');
  pendingCheckoutRequestId = null;
  return payload.checkoutUrl;
}

export async function createBillingPortal(): Promise<string> {
  const response = await authenticatedFetch('/api/billing/portal', { method: 'POST', body: '{}' });
  if (!response.ok) return readError(response, 'Abonelik yönetimi açılamadı.');
  const payload = await response.json() as { portalUrl?: string };
  if (!payload.portalUrl) throw new Error('Abonelik yönetim bağlantısı alınamadı.');
  return payload.portalUrl;
}

export function openTrustedBillingUrl(rawUrl: string): void {
  const url = new URL(rawUrl);
  const trusted = url.protocol === 'https:' && (
    url.hostname === 'checkout.stripe.com' || url.hostname === 'billing.stripe.com'
  );
  if (!trusted) throw new Error('Ödeme sağlayıcısı güvenli bağlantı doğrulamasını geçemedi.');
  window.location.assign(url.toString());
}
