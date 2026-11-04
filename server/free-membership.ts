import { createHmac } from 'node:crypto';
import { requireLearningAccess } from './membership-access';
import { GooglePlayError } from './google-play-model';
import { getServiceClient } from './supabase-admin';
import { FREE_MEMBERSHIP } from '../src/lib/membership-plan';
export async function authorizeLearningStart(studentId: string, mode: string): Promise<boolean> {
  try { await requireLearningAccess(studentId); return false; }
  catch (error) {
    if (!(error instanceof GooglePlayError) || error.status !== 403 || mode !== 'practice') throw error;
    return true;
  }
}
// Atomic and durable across devices, web, Android and concurrent Vercel workers.
export async function reserveFreePractice(studentId: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new GooglePlayError('Ücretsiz kullanım hakkı doğrulanamadı.');
  const scope = 'free-practice-v1';
  const key = createHmac('sha256', secret).update(`${scope}:${studentId}`).digest('hex');
  const { data, error } = await getServiceClient().rpc('consume_api_limit', {
    p_key: key, p_scope: scope, p_limit: FREE_MEMBERSHIP.practicesPerDay, p_seconds: 86400,
  });
  if (error || typeof data !== 'boolean') throw new GooglePlayError('Ücretsiz kullanım hakkı doğrulanamadı.');
  if (!data) throw new GooglePlayError('Bugünün iki ücretsiz kısa pratiğini kullandın. Hakların Türkiye saatiyle 03.00’te yenilenir. Günlük görevlerine ve örnek anlatımlara devam edebilirsin.', 429);
}
