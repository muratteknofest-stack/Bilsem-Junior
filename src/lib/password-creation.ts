import { strongPasswordSchema } from './validations';

export function passwordPairError(password: string, confirmation: string): string | null {
  const parsed = strongPasswordSchema.safeParse(password);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (password !== confirmation) return 'Şifreler birbiriyle eşleşmiyor.';
  return null;
}

/** Fourteen uniform random characters (84 bits), with a letter and digit guaranteed. */
export function suggestPassword(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return 'Z' + Array.from(bytes, byte => alphabet[byte & 63]).join('') + '7';
}
