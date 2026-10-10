import type { UserProfile } from '../types';

export const KVKK_POLICY_VERSION = '2026-10-10';
export const TERMS_POLICY_VERSION = '2026-10-10';

export function createConsentRecord(
  actorRole: 'student' | 'parent',
  acceptedAt = Date.now(),
): NonNullable<UserProfile['consent']> {
  return {
    acceptedAt,
    actorRole,
    kvkkVersion: KVKK_POLICY_VERSION,
    termsVersion: TERMS_POLICY_VERSION,
  };
}


