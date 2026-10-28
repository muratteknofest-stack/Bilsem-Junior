// Change this date whenever the registration disclosures change, even if the
// operator's saved settings revision remains unchanged.
export const POLICY_CONTENT_VERSION = '2026-10-28';
export const currentPolicyVersion = (revision: number) => `${POLICY_CONTENT_VERSION}.${revision}`;
export const POLICY_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}\.\d{1,10}$/;
export const isPolicyVersion = (value: unknown): value is string => typeof value === 'string' && POLICY_VERSION_PATTERN.test(value);
