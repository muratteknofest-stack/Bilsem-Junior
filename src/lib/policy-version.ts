// Change this date whenever the registration disclosures change, even if the
// operator's saved settings revision remains unchanged.
export const POLICY_CONTENT_VERSION = '2026-10-28';
export const currentPolicyVersion = (revision: number) => `${POLICY_CONTENT_VERSION}.${revision}`;
