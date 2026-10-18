import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { GooglePlayError, playTokenSchema } from './google-play-model';
import { PLAY_PLANS } from '../src/lib/google-play-contract';
const credentialsSchema = z.object({ type: z.literal('service_account'), client_email: z.string().email().endsWith('.iam.gserviceaccount.com'), private_key: z.string().startsWith('-----BEGIN PRIVATE KEY-----') });
export function playConfig() {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.zekapark.app';
  const productId = process.env.GOOGLE_PLAY_PRODUCT_ID || 'zekapark_uyelik';
  if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(packageName) || !/^[a-z0-9][a-z0-9_.]{0,39}$/.test(productId)) throw new GooglePlayError('Google Play ürün ayarları geçersiz.');
  return { packageName, productId, enabled: process.env.GOOGLE_PLAY_BILLING_ENABLED === 'true', enforced: process.env.GOOGLE_PLAY_ENFORCE_PAID_ACCESS === 'true', allowTest: process.env.GOOGLE_PLAY_ALLOW_TEST_PURCHASES === 'true' };
}
export function playSetupReady() {
  try {
    credentialsSchema.parse(JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || ''));
    if ((process.env.GOOGLE_PLAY_BINDING_SECRET || '').length < 32 || !/^[a-fA-F0-9]{64}$/.test(process.env.GOOGLE_PLAY_TOKEN_KEY || '')) return false;
    const audience = new URL(process.env.GOOGLE_PLAY_RTDN_AUDIENCE || '');
    if (audience.protocol !== 'https:' || audience.username || audience.password || audience.search || audience.hash || audience.pathname !== '/api/google-play/notifications' || ['localhost','127.0.0.1','[::1]'].includes(audience.hostname)) return false;
    return z.string().email().endsWith('.iam.gserviceaccount.com').safeParse(process.env.GOOGLE_PLAY_RTDN_EMAIL).success;
  } catch { return false; }
}
let auth: GoogleAuth | undefined, credentialVersion: string | undefined;
async function accessToken() {
  const value = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  try {
    if (!value) throw Error();
    if (!auth || credentialVersion !== value) {
      auth = new GoogleAuth({ credentials: credentialsSchema.parse(JSON.parse(value)), scopes: ['https://www.googleapis.com/auth/androidpublisher'], clientOptions: { transporterOptions: { timeout: 8000, retry: false } } });
      credentialVersion = value;
    }
    const result = await auth.getAccessToken(); if (!result) throw Error(); return result;
  } catch { throw new GooglePlayError('Google Play doğrulama servisi henüz kullanılamıyor.'); }
}
export async function playRequest(token: string, action: 'get' | 'acknowledge', request: typeof fetch = fetch, bearer?: string) {
  const config = playConfig(); playTokenSchema.parse(token);
  const path = action === 'get' ? `purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}` : `purchases/subscriptions/${encodeURIComponent(config.productId)}/tokens/${encodeURIComponent(token)}:acknowledge`;
  try {
    const response = await request(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${config.packageName}/${path}`, {
      method: action === 'get' ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${bearer || await accessToken()}`, 'Content-Type': 'application/json' }, ...(action === 'acknowledge' ? { body: '{}' } : {}),
    });
    if (!response.ok) throw new GooglePlayError('Google Play aboneliği şu anda doğrulanamıyor.', response.status === 404 || response.status === 410 ? 409 : 503);
    if (action === 'acknowledge') return null;
    if (Number(response.headers.get('content-length')) > 256000) throw Error();
    const reader = response.body?.getReader(); if (!reader) throw Error();
    let size = 0; const chunks: Uint8Array[] = [];
    try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 256000) throw Error(); chunks.push(value); } }
    finally { await reader.cancel().catch(() => {}); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) { if (error instanceof GooglePlayError) throw error; throw new GooglePlayError('Google Play isteği tamamlanamadı. Yeniden deneyin.'); }
}
const oidc = new OAuth2Client();
export async function verifyPlayPush(authorization: string | undefined) {
  const audience = process.env.GOOGLE_PLAY_RTDN_AUDIENCE, email = process.env.GOOGLE_PLAY_RTDN_EMAIL;
  if (!audience || !email || !authorization?.startsWith('Bearer ') || authorization.length > 16000) throw new GooglePlayError('Bildirim kimliği doğrulanamadı.', 401);
  try {
    const ticket = await oidc.verifyIdToken({ idToken: authorization.slice(7), audience });
    const p = ticket.getPayload();
    if (!p || p.email !== email || p.email_verified !== true || !['accounts.google.com','https://accounts.google.com'].includes(p.iss)) throw Error();
  } catch { throw new GooglePlayError('Bildirim kimliği doğrulanamadı.', 401); }
}

export function verifiedPlayCatalog(raw: unknown, config = playConfig()) {
  const parsed = z.object({ packageName: z.string(), productId: z.string(), basePlans: z.array(z.object({
    basePlanId: z.string(), state: z.string(), autoRenewingBasePlanType: z.object({ billingPeriodDuration: z.string() }).optional(),
  })).max(100) }).safeParse(raw);
  if (!parsed.success || parsed.data.packageName !== config.packageName || parsed.data.productId !== config.productId
      || !PLAY_PLANS.every(plan => parsed.data.basePlans.some(base => base.basePlanId === plan.id && base.state === 'ACTIVE' && base.autoRenewingBasePlanType?.billingPeriodDuration === plan.period)))
    throw new GooglePlayError('Google Play ürünü ve üç etkin abonelik dönemi eşleşmedi.',409);
  return true;
}
export async function verifyPlayCatalog(request: typeof fetch = fetch, bearer?: string) {
  const config = playConfig();
  try {
    const response = await request(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${config.packageName}/subscriptions/${encodeURIComponent(config.productId)}`, {
      headers: { Authorization: `Bearer ${bearer || await accessToken()}`, Accept: 'application/json' },
      redirect:'error', signal:AbortSignal.timeout(10000),
    });
    if (!response.ok) { await response.body?.cancel(); throw new GooglePlayError('Google Play ürün kataloğu okunamadı. Uygulama ve hizmet hesabı izinlerini kontrol edin.'); }
    const reader=response.body?.getReader();if(!reader)throw Error();
    const chunks:Uint8Array[]=[];let size=0;
    try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>256000)throw Error();chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
    return verifiedPlayCatalog(JSON.parse(Buffer.concat(chunks).toString('utf8')),config);
  } catch(error) {if(error instanceof GooglePlayError)throw error;throw new GooglePlayError('Google Play ürün kataloğu doğrulanamadı.');}
}
