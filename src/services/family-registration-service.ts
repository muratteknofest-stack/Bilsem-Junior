import { apiFetch } from '../lib/api-fetch';
import type { UserProfile } from '../types';
import { apiUrl } from '../lib/api-url';
import { z } from 'zod';

export interface FamilyRegistrationInput {
  parentEmail: string;
  parentPassword: string;
  parentPhone?: string;
  studentName: string;
  studentPassword: string;
  grade: number;
  examFocus: string;
  consentAccepted: boolean;
  termsAccepted: boolean;
  guardianConfirmed: boolean;
  policyVersion: string;
}
export interface FamilyRegistrationResult {
  parentProfile: UserProfile;
  student: { id: string; code: string; email: string };
  verificationSent: boolean;
}

export class FamilyRegistrationError extends Error {
  constructor(message: string, public code = 'REQUEST_FAILED', public status = 0) { super(message); this.name = 'FamilyRegistrationError'; }
}
const resultSchema = z.object({
  success: z.literal(true),
  parentProfile: z.object({ id: z.string().uuid(), role: z.literal('parent') }).passthrough(),
  student: z.object({ id: z.string().uuid(), code: z.string().regex(/^[A-Z0-9]{5,16}$/), email: z.string().email() }),
  verificationSent: z.boolean(),
});

async function publicRequest(path: string, body: unknown) {
  let response: Response;
  try { response = await apiFetch(apiUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }); }
  catch { throw new FamilyRegistrationError(path === '/api/register-family' ? 'Sunucu yanıtı alınamadı. Bağlantınızı kontrol edin. Kayıt gönderdiyseniz yeniden kayıt açmadan önce veli e-postanızla giriş yapmayı deneyin.' : 'Sunucu yanıtı alınamadı. Bağlantınızı kontrol edip yeniden deneyin.', 'NETWORK_ERROR'); }
  const value = await response.json().catch(() => ({}));
  const result = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  if (!response.ok) throw new FamilyRegistrationError(typeof result.error === 'string' ? result.error : 'İstek tamamlanamadı. Bir süre sonra tekrar deneyin.', typeof result.code === 'string' ? result.code : 'REQUEST_FAILED', response.status);
  return result;
}

export async function registerFamilyInSupabase(input: FamilyRegistrationInput): Promise<FamilyRegistrationResult> {
  const parsed = resultSchema.safeParse(await publicRequest('/api/register-family', input));
  if (!parsed.success) throw new FamilyRegistrationError('Kayıt sonucu doğrulanamadı. Yeniden kayıt açmadan önce veli e-postanızla giriş yapmayı deneyin.', 'INVALID_RESPONSE');
  return { parentProfile: parsed.data.parentProfile as unknown as UserProfile, student: parsed.data.student, verificationSent: parsed.data.verificationSent };
}

export async function resendFamilyConfirmation(email: string): Promise<string> {
  const result = await publicRequest('/api/auth/resend-confirmation', { email: email.trim().toLowerCase() });
  if (result.success !== true || typeof result.message !== 'string') throw new FamilyRegistrationError('E-posta isteği doğrulanamadı. Bir süre sonra tekrar deneyin.', 'INVALID_RESPONSE');
  return result.message;
}


