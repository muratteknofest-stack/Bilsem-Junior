import { getServiceClient } from './supabase-admin';
import { studentAccessPolicy } from './paid-access-policy';
import { googlePlayAccess } from './google-play-access';
import { GooglePlayError } from './google-play-model';
import { isLicenseTestFamily, licenseTestStudentId, licenseTestLegalReady } from './google-play-license-test';
import { readPlatformSettings } from './platform-settings';
import { paidSalesReady } from './google-play-sales';
import { playSetupReady } from './google-play-client';
import { membershipRequiredMessage } from './membership-message';
async function linkedParentId(studentId: string): Promise<string | null> {
  const student = await getServiceClient().from('profiles').select('linked_parent_id').eq('id',studentId).single();
  if (student.error) throw new GooglePlayError('Üyelik durumu doğrulanamadı.');
  return student.data?.linked_parent_id || null;
}
async function directSubscription(studentId: string) {
  try {
    const direct = await getServiceClient()
      .from('google_play_subscriptions')
      .select('subscription_state,expires_at,auto_renewing')
      .eq('student_id', studentId)
      .eq('subscription_state', 'SUBSCRIPTION_STATE_ACTIVE')
      .order('verified_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (direct.data && direct.data.subscription_state === 'SUBSCRIPTION_STATE_ACTIVE' && direct.data.expires_at && Date.parse(direct.data.expires_at) > Date.now()) {
      return { active: true, expiresAt: direct.data.expires_at, state: direct.data.subscription_state, autoRenewing: direct.data.auto_renewing };
    }
  } catch {
    // A failed direct lookup never grants or revokes access.
  }
  return null;
}
export async function learningAccess(studentId: string) {
  const parentId = await linkedParentId(studentId);
  if (!parentId) return (await directSubscription(studentId)) || {active:false,expiresAt:null};
  const family = await googlePlayAccess(parentId,studentId);
  if (family?.active) return family;
  // Admin-assigned or directly stored subscriptions are consulted only when the family has none.
  return (await directSubscription(studentId)) || family;
}
export async function requireLearningAccess(studentId: string) {
  const policy = await studentAccessPolicy(studentId);
  if (policy.lifetime) return;
  const enforced = policy.requiresSubscription;
  if (!enforced && licenseTestStudentId() !== studentId) return;
  const parentId = await linkedParentId(studentId);
  if (!enforced && (!parentId || !isLicenseTestFamily(parentId, studentId))) return;
  const access = parentId ? await googlePlayAccess(parentId,studentId) : null;
  if (access?.active) return;
  if ((await directSubscription(studentId))?.active) return;
  // Determine the explanation only after denying access. A sales outage must
  // neither grant premium content nor revoke an already verified entitlement.
  let ready: boolean | null = null;
  try {
    const { settings } = await readPlatformSettings();
    ready = parentId && isLicenseTestFamily(parentId, studentId)
      ? playSetupReady() && licenseTestLegalReady(settings) : paidSalesReady(settings);
  } catch {
    // Sales metadata is optional for explaining an already denied entitlement.
    // Missing metadata must not change that denial or claim sales are closed.
  }
  throw new GooglePlayError(membershipRequiredMessage(ready, access?.state),403);
}
