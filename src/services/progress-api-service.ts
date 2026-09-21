import type { UserProfile } from '../types';
import { authenticatedFetch } from '../lib/api-client';

export type RewardClaimType = 'streak' | 'achievement' | 'daily_mission' | 'weekly_category' | 'weekly_grand';

export async function claimProgressReward(type: RewardClaimType, rewardId: string): Promise<{
  success: true;
  xpAwarded: number;
  title: string;
  profile: UserProfile;
}> {
  const response = await authenticatedFetch('/api/progress/rewards/claim', {
    method: 'POST',
    body: JSON.stringify({ type, rewardId }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || 'Ödül doğrulanamadı.');
  }
  return response.json();
}
