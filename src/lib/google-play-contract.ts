// The store supplies all prices. Calendar periods are not converted to fixed days.
export const PLAY_PLANS = [
  { id: 'monthly', title: 'Aylık', period: 'P1M', renewal: 'her ay' },
  { id: 'quarterly', title: '3 aylık', period: 'P3M', renewal: '3 ayda bir' },
  { id: 'annual', title: 'Yıllık', period: 'P1Y', renewal: 'her yıl' },
] as const;
export type PlayPlanId = typeof PLAY_PLANS[number]['id'];
export interface PlayAccess { active: boolean; expiresAt: string | null; state?: string; autoRenewing?: boolean; }
export interface PlayOffer { basePlanId: PlayPlanId; price: string; period: string; }
export interface PlayPurchase { token: string; state: 'purchased' | 'pending'; accountId: string | null; profileId: string | null; }
