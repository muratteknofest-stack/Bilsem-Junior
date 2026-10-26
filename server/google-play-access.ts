import { z } from 'zod';
import { getServiceClient } from './supabase-admin';
import { assertBillingFamily } from './billing-family';
import { playConfig, playRequest } from './google-play-client';
import { GooglePlayError, decryptPlayToken, encryptPlayToken, playBindings, tokenHash, verifiedPlaySubscription } from './google-play-model';
import type { PlayAccess } from '../src/lib/google-play-contract';
import { isLicenseTestFamily } from './google-play-license-test';
export async function verifyAndSavePlay(parentId: string, studentId: string, token: string) {
  await assertBillingFamily(parentId, studentId);
  const config = playConfig(), binding = playBindings(parentId, studentId), observedAt = new Date().toISOString();
  const prepared = await getServiceClient().from('google_play_purchase_bindings').select('parent_id,student_id')
    .eq('account_hash', binding.accountId).eq('profile_hash', binding.profileId).maybeSingle();
  if (prepared.error) throw new GooglePlayError('Satın alma hesap bağlantısı doğrulanamadı.');
  if (prepared.data?.parent_id !== parentId || prepared.data.student_id !== studentId) throw new GooglePlayError('Bu hesap için hazırlanmış satın alma bağlantısı bulunamadı.', 409);
  const licenseTest = isLicenseTestFamily(parentId, studentId);
  const proof = verifiedPlaySubscription(await playRequest(token, 'get'), {
    ...binding, productId: config.productId, allowTest: config.allowTest || licenseTest, requireTest: licenseTest,
  });
  // Google, not the client, determines expiry and state. Retrying never adds days.
  const saved = await getServiceClient().rpc('record_google_play_subscription', {
    p_hash: tokenHash(token), p_parent: parentId, p_student: studentId, p_token: encryptPlayToken(token), p_package: config.packageName,
    p_product: proof.productId, p_plan: proof.basePlanId, p_state: proof.state, p_expiry: proof.expiresAt,
    p_renewing: proof.autoRenewing, p_ack: proof.acknowledgementState, p_linked: proof.linkedTokenHash, p_verified: observedAt, p_test: proof.testPurchase,
  });
  if (saved.error?.code === '40001') throw new GooglePlayError('Satın alım bağlantısı değişti veya eşzamanlı doğrulama sürüyor. Yeniden deneyin.', 409);
  if (saved.error?.code === '42501') throw new GooglePlayError('Öğrenci bağlantısı doğrulanamadı.', 403);
  if (saved.error || saved.data !== tokenHash(token)) throw new GooglePlayError('Abonelik kaydedilemedi. Satın alımları geri yükleyerek tekrar deneyin.');
  // Acknowledge only after the durable, ownership-checked grant. Failure remains retryable.
  if (proof.active && proof.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') await playRequest(token, 'acknowledge');
  return { active: proof.active, expiresAt: proof.expiresAt, state: proof.state, autoRenewing: proof.autoRenewing } satisfies PlayAccess;
}
export async function googlePlayAccess(parentId: string, studentId: string): Promise<PlayAccess> {
  await assertBillingFamily(parentId, studentId);
  const config = playConfig(), licenseTest = isLicenseTestFamily(parentId, studentId);
  const query = getServiceClient().from('google_play_subscriptions').select('token_hash,token_ciphertext,package_name,product_id')
    .eq('parent_id', parentId).eq('student_id', studentId).not('subscription_state', 'in', '(SUBSCRIPTION_STATE_EXPIRED,SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED)').order('verified_at', { ascending: false }).limit(21);
  if (licenseTest) query.eq('test_purchase', true);
  else if (!config.allowTest) query.eq('test_purchase', false);
  const result = await query;
  if (result.error || !result.data || result.data.length > 20) throw new GooglePlayError('Abonelik kayıtları doğrulanamadı.');
  let active: PlayAccess | null = null, failure = false;
  const inactive: PlayAccess[] = [];
  for (let i = 0; i < result.data.length; i += 3) {
    await Promise.all(result.data.slice(i, i + 3).map(async (row, offset) => {
      try {
        if (row.package_name !== config.packageName || row.product_id !== config.productId) throw new GooglePlayError('Abonelik ürün ayarları değişmiş.');
        const access = await verifyAndSavePlay(parentId, studentId, decryptPlayToken(row.token_ciphertext, row.token_hash));
        if (access.active && (!active || Date.parse(access.expiresAt!) > Date.parse(active.expiresAt!))) active = access;
        // Keep Google's verified reason for a blocked subscription. Parallel replies
        // must not let an older expired token hide the newest paused/on-hold state.
        if (!access.active) inactive[i + offset] = access;
      } catch (error) { if (!(error instanceof GooglePlayError) || error.status !== 409) failure = true; }
    }));
  }
  if (active) return active;
  if (failure) throw new GooglePlayError('Abonelik durumu şu anda doğrulanamıyor. Yeniden deneyin.');
  return inactive.find(Boolean) || { active: false, expiresAt: null };
}
export async function handlePlayNotification(token: string) {
  const result = await getServiceClient().from('google_play_subscriptions').select('parent_id,student_id').eq('token_hash', tokenHash(token)).maybeSingle();
  if (result.error) throw new GooglePlayError('Bildirim kaydı yüklenemedi.');
  if (result.data) {
    if (result.data.parent_id && result.data.student_id) await verifyAndSavePlay(result.data.parent_id, result.data.student_id, token);
    return; // Deleted-account tombstones cannot be re-claimed.
  }
  // Recovery requires an authenticated prepare persisted BEFORE the purchase, plus
  // identities obtained from Google itself; never trust an RTDN body's status.
  const raw = await playRequest(token, 'get');
  const ids = z.object({ externalAccountIdentifiers: z.object({ obfuscatedExternalAccountId: z.string().regex(/^[a-f0-9]{64}$/), obfuscatedExternalProfileId: z.string().regex(/^[a-f0-9]{64}$/) }) }).safeParse(raw);
  if (!ids.success) return;
  const binding = await getServiceClient().from('google_play_purchase_bindings').select('parent_id,student_id')
    .eq('account_hash', ids.data.externalAccountIdentifiers.obfuscatedExternalAccountId).eq('profile_hash', ids.data.externalAccountIdentifiers.obfuscatedExternalProfileId).maybeSingle();
  if (binding.error) throw new GooglePlayError('Bildirim hesap bağlantısı yüklenemedi.');
  if (binding.data) await verifyAndSavePlay(binding.data.parent_id, binding.data.student_id, token);
}

