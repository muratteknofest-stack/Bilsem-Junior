import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { PLAY_PLANS } from '../src/lib/google-play-contract';
export class GooglePlayError extends Error { constructor(message: string, public status = 503) { super(message); } }
export const playTokenSchema = z.string().min(8).max(4096).regex(/^[A-Za-z0-9_.~+/=:-]+$/);
export const tokenHash = (token: string) => createHash('sha256').update(playTokenSchema.parse(token)).digest('hex');
export function playBindings(parent: string, student: string, secret = process.env.GOOGLE_PLAY_BINDING_SECRET || '') {
  if (secret.length < 32) throw new GooglePlayError('Google Play hesap bağlantısı henüz yapılandırılmadı.');
  const hash = (scope: string, id: string) => createHmac('sha256', secret).update(`zekapark:play:v1:${scope}:${z.uuid().parse(id)}`).digest('hex');
  return { accountId: hash('parent', parent), profileId: hash('student', student) };
}
function key(value = process.env.GOOGLE_PLAY_TOKEN_KEY || '') {
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new GooglePlayError('Google Play kayıt koruması henüz yapılandırılmadı.');
  return Buffer.from(value, 'hex');
}
export function encryptPlayToken(token: string, keyValue?: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(keyValue), iv);
  cipher.setAAD(Buffer.from(tokenHash(token)));
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('hex'), cipher.getAuthTag().toString('hex'), data.toString('hex')].join('.');
}
export function decryptPlayToken(value: string, hash: string, keyValue?: string) {
  try {
    if (!/^[a-f0-9]{64}$/.test(hash) || !/^v1\.[a-f0-9]{24}\.[a-f0-9]{32}\.[a-f0-9]{16,8192}$/.test(value)) throw Error();
    const [, iv, tag, data] = value.split('.'), decipher = createDecipheriv('aes-256-gcm', key(keyValue), Buffer.from(iv, 'hex'));
    decipher.setAAD(Buffer.from(hash)); decipher.setAuthTag(Buffer.from(tag, 'hex'));
    const token = Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
    if (tokenHash(token) !== hash) throw Error();
    return token;
  } catch { throw new GooglePlayError('Abonelik kaydı doğrulanamadı.'); }
}
const equal = (a: string | undefined, b: string) => !!a && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const states = z.enum(['SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_PAUSED','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_CANCELED','SUBSCRIPTION_STATE_EXPIRED','SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED']);
const payload = z.object({
  kind: z.literal('androidpublisher#subscriptionPurchaseV2'), subscriptionState: states,
  acknowledgementState: z.enum(['ACKNOWLEDGEMENT_STATE_PENDING','ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED']),
  externalAccountIdentifiers: z.object({ obfuscatedExternalAccountId: z.string(), obfuscatedExternalProfileId: z.string() }),
  lineItems: z.array(z.object({ productId: z.string(), expiryTime: z.iso.datetime({ offset: true }).optional(),
    offerDetails: z.object({ basePlanId: z.enum(['monthly','quarterly','annual']) }),
    autoRenewingPlan: z.object({ autoRenewEnabled: z.boolean() }).optional(), prepaidPlan: z.unknown().optional(),
  })).length(1),
  linkedPurchaseToken: playTokenSchema.optional(), testPurchase: z.object({}).optional(),
});
export function verifiedPlaySubscription(raw: unknown, expected: { productId: string; accountId: string; profileId: string; allowTest: boolean; requireTest?: boolean }, now = Date.now()) {
  const result = payload.safeParse(raw);
  if (!result.success) throw new GooglePlayError('Google Play abonelik bilgisi doğrulanamadı.', 409);
  const p = result.data, item = p.lineItems[0];
  if (!equal(p.externalAccountIdentifiers.obfuscatedExternalAccountId, expected.accountId) || !equal(p.externalAccountIdentifiers.obfuscatedExternalProfileId, expected.profileId))
    throw new GooglePlayError('Bu abonelik başka bir veli veya öğrenciye ait.', 409);
  if (item.productId !== expected.productId || !PLAY_PLANS.some(x => x.id === item.offerDetails.basePlanId) || item.prepaidPlan !== undefined || !item.autoRenewingPlan)
    throw new GooglePlayError('Google Play abonelik ürünü eşleşmedi.', 409);
  if (p.testPurchase && !expected.allowTest) throw new GooglePlayError('Test satın alımı üretim erişimi açamaz.', 409);
  if (expected.requireTest && !p.testPurchase) throw new GooglePlayError('Lisans test hesabı yalnızca Google Play test satın alımlarını doğrulayabilir.', 409);
  const expiresAt = item.expiryTime ? new Date(item.expiryTime).toISOString() : null;
  const active = ['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED'].includes(p.subscriptionState) && !!expiresAt && Date.parse(expiresAt) > now;
  return { active, expiresAt, state: p.subscriptionState, productId: item.productId, basePlanId: item.offerDetails.basePlanId,
    autoRenewing: item.autoRenewingPlan.autoRenewEnabled, acknowledgementState: p.acknowledgementState,
    linkedTokenHash: p.linkedPurchaseToken ? tokenHash(p.linkedPurchaseToken) : null, testPurchase: !!p.testPurchase };
}
