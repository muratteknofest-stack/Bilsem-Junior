export interface MembershipAccess { active: boolean; expiresAt: string | null; }

// An unavailable provider cannot invalidate an independently verified active purchase.
// If none is active, propagate verification failures instead of inventing access.
export function resolvedMembershipAccess(results: PromiseSettledResult<MembershipAccess>[]): MembershipAccess {
  const active = results.flatMap(result => result.status === 'fulfilled' && result.value.active ? [result.value] : []);
  if (active.length) return active.reduce((best, value) => Date.parse(value.expiresAt || '') > Date.parse(best.expiresAt || '') ? value : best);
  const failure = results.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  return { active: false, expiresAt: null };
}
