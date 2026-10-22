import { getServiceClient } from './supabase-admin';
import { playConfig } from './google-play-client';
import { googlePlayAccess } from './google-play-access';
import { GooglePlayError } from './google-play-model';
import { shopierAccess } from './shopier-access';
import { shopierConfig } from './shopier-config';
import { resolvedMembershipAccess } from './membership-policy';
export async function learningAccess(studentId: string) {
  const student = await getServiceClient().from('profiles').select('linked_parent_id').eq('id',studentId).single();
  if (student.error) throw new GooglePlayError('Üyelik durumu doğrulanamadı.');
  if (!student.data?.linked_parent_id) return {active:false,expiresAt:null};
  try {
    return resolvedMembershipAccess(await Promise.allSettled([
      Promise.resolve().then(() => googlePlayAccess(student.data.linked_parent_id,studentId)),
      Promise.resolve().then(() => shopierAccess(student.data.linked_parent_id,studentId,shopierConfig())),
    ]));
  } catch { throw new GooglePlayError('Üyelik durumu şu anda doğrulanamıyor. Yeniden deneyin.',503); }
}
export async function requireLearningAccess(studentId: string) {
  if (!playConfig().enforced && process.env.SHOPIER_ENFORCE_PAID_ACCESS !== 'true') return;
  if (!(await learningAccess(studentId)).active) throw new GooglePlayError('Bu çalışma için aktif öğrenci üyeliği gerekli. Veli panelinden üyeliğinizi kontrol edin.',403);
}

