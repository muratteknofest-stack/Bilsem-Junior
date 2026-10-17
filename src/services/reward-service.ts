import { safeStorage } from '../lib/storage';
import type { Achievement } from '../types';
import { authenticatedFetch } from '../lib/api-client';
import { auth, db } from '../lib/platform';
import { doc, getDoc } from '../lib/supabase-data';
import { syncUserFromSupabase, getCurrentUser } from './modules/profile-service';
import { hydrateUserStateFromSupabase } from './modules/persistence-service';
import type { UserProfile } from '../types';
export async function claimServerReward(kind: string, id: string) {
  const userId = auth.currentUser?.uid;
  const response = await authenticatedFetch('/api/learning/rewards/claim', { method: 'POST', body: JSON.stringify({ kind, id }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Ödül kaydedilemedi. Yeniden dene.');
  if (auth.currentUser?.uid !== userId) throw new Error('Hesap değişti.');
  const profile = await getDoc(doc(db, 'users', userId!));
  if (auth.currentUser?.uid !== userId) throw new Error('Hesap değişti.');
  if (profile.exists()) syncUserFromSupabase(profile.data() as UserProfile);
  await hydrateUserStateFromSupabase();
  return { success: result.xpAwarded > 0, xpAwarded: Number(result.xpAwarded) || 0, user: getCurrentUser() };
}

export async function refreshServerRewards(signal?: AbortSignal): Promise<{ badges: Achievement[]; reviewToday: number }> {
  const userId = auth.currentUser?.uid;
  const response = await authenticatedFetch('/api/learning/rewards', { signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Rozetler yüklenemedi.');
  if (signal?.aborted || auth.currentUser?.uid !== userId) throw new Error('Yenileme iptal edildi veya hesap değişti.');
  safeStorage.setItem('yapyap_achievements', JSON.stringify(result.badges));
  return result;
}
