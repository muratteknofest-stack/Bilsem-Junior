export const WEEKLY_GRAND_REWARD_ID = 'grand';

export const weeklyGrandRewardPrefix = (weekStart: string) => `grand:${weekStart}:`;
export const weeklyGrandRewardKey = (weekStart: string) => `${weeklyGrandRewardPrefix(weekStart)}${WEEKLY_GRAND_REWARD_ID}`;

/** Older releases accepted arbitrary suffixes; they still represent this week's one reward. */
export function hasWeeklyGrandRewardClaim(claims: readonly string[], weekStart: string): boolean {
  return claims.some(key => typeof key === 'string' && key.startsWith(weeklyGrandRewardPrefix(weekStart)));
}
