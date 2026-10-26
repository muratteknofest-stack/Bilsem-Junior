import { getServiceClient } from './supabase-admin';
import { playConfig } from './google-play-client';
import { googlePlayAccess } from './google-play-access';
import { GooglePlayError } from './google-play-model';
import { isLicenseTestFamily, licenseTestStudentId } from './google-play-license-test';
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
  const enforced = playConfig().enforced;
  if (!enforced && licenseTestStudentId() !== studentId) return;
  const parentId = await linkedParentId(studentId);
  if (!enforced && (!parentId || !isLicenseTestFamily(parentId, studentId))) return;
  if (!parentId || !(await googlePlayAccess(parentId,studentId)).active)
    throw new GooglePlayError('Bu çalışma için Google Play üzerinden aktif öğrenci aboneliği gerekli.',403);
}
