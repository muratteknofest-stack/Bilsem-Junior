import type { UserProfile } from '../types';
import { apiUrl } from '../lib/api-client';

export interface FamilyRegistrationInput {
  parentEmail: string;
  parentPassword: string;
  parentPhone?: string;
  studentName: string;
  studentPassword: string;
  grade: number;
  examFocus: string;
}
export interface FamilyRegistrationResult {
  parentProfile: UserProfile;
  student: { id: string; code: string; email: string };
  verificationSent: boolean;
}

export async function registerFamilyInSupabase(input: FamilyRegistrationInput): Promise<FamilyRegistrationResult> {
  const response = await fetch(apiUrl('/api/register-family'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || 'Aile hesabı oluşturulamadı.');
  return { parentProfile: result.parentProfile, student: result.student, verificationSent: true };
}
