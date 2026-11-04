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
export async function learningAccess(studentId: string) {
  const parentId = await linkedParentId(studentId);
  if (!parentId) return {active:false,expiresAt:null};
  return googlePlayAccess(parentId,studentId);
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
