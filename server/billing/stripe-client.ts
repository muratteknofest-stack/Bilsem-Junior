import { createHmac, timingSafeEqual } from 'node:crypto';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} yapılandırılmadı.`);
  return value;
}

export function billingEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED?.trim().toLowerCase() === 'true';
}

export async function stripePost(
  path: string,
  values: Record<string, string>,
  options: { idempotencyKey?: string } = {},
): Promise<any> {
  const secretKey = required('STRIPE_SECRET_KEY');
  const response = await fetch(`https://api.stripe.com/v1/${path.replace(/^\//, '')}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    },
    body: new URLSearchParams(values),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error?.message === 'string' ? payload.error.message : `Stripe HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export async function stripeDelete(path: string, options: { ignoreNotFound?: boolean } = {}): Promise<any> {
  const secretKey = required('STRIPE_SECRET_KEY');
  const response = await fetch(`https://api.stripe.com/v1/${path.replace(/^\//, '')}`, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}` },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 404 && options.ignoreNotFound) return { deleted: true, alreadyAbsent: true };
  if (!response.ok) {
    const message = typeof payload?.error?.message === 'string' ? payload.error.message : `Stripe HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export function verifyStripeWebhook(rawBody: Buffer, signatureHeader: string | undefined): void {
  const webhookSecret = required('STRIPE_WEBHOOK_SECRET');
  if (!signatureHeader) throw new Error('WEBHOOK_SIGNATURE_MISSING');
  const parts = signatureHeader.split(',').map((part) => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) throw new Error('WEBHOOK_SIGNATURE_INVALID');
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error('WEBHOOK_SIGNATURE_EXPIRED');
  const expected = createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const valid = signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const actual = Buffer.from(signature, 'hex');
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  });
  if (!valid) throw new Error('WEBHOOK_SIGNATURE_INVALID');
}
