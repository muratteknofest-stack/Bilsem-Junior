import { getServiceClient } from './supabase-admin';
import { playConfig } from './google-play-client';
import { googlePlayAccess } from './google-play-access';
import { GooglePlayError } from './google-play-model';
export async function learningAccess(studentId: string) {
  const student = await getServiceClient().from('profiles').select('linked_parent_id').eq('id',studentId).single();
  if (student.error) throw new GooglePlayError('Üyelik durumu doğrulanamadı.');
  if (!student.data?.linked_parent_id) return {active:false,expiresAt:null};
  return googlePlayAccess(student.data.linked_parent_id,studentId);
}
export async function requireLearningAccess(studentId: string) {
  if (!playConfig().enforced) return;
  if (!(await learningAccess(studentId)).active) throw new GooglePlayError('Bu çalışma için Google Play üzerinden aktif öğrenci aboneliği gerekli.',403);
}
