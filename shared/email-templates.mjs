/**
 * The six Supabase Auth templates that must be delivered to a real inbox
 * before e-mail acceptance can be claimed. Kept in one place so the release
 * gate, the acceptance tool and the template files cannot drift apart.
 */
export const EMAIL_TEMPLATE_IDS = Object.freeze([
  'confirm-sign-up',
  'invite-user',
  'magic-link-or-otp',
  'change-email-address',
  'reset-password',
  'reauthentication',
]);

/** @param {readonly string[]} delivered @returns {string[]} */
export function missingEmailTemplates(delivered){
  const seen=new Set((Array.isArray(delivered)?delivered:[]).map(value=>String(value)));
  return EMAIL_TEMPLATE_IDS.filter(id=>!seen.has(id));
}

/** @param {readonly string[]} delivered @returns {string[]} */
export function unknownEmailTemplates(delivered){
  const known=new Set(EMAIL_TEMPLATE_IDS);
  return [...new Set((Array.isArray(delivered)?delivered:[]).map(value=>String(value)))].filter(id=>!known.has(id));
}
