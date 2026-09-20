import { sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { appCheckedFetch } from '../lib/api-client';
import type { UserProfile } from '../types';

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

interface RegistrationResponse {
  success?: boolean;
  error?: string;
  parentProfile?: UserProfile;
  student?: FamilyRegistrationResult['student'];
}

/**
 * Creates the parent and student as one server-controlled operation.
 *
 * There is intentionally no browser-side account-creation fallback: a partial
 * family relationship is materially worse than a visible, retryable failure.
 */
export async function registerFamilyInFirebase(
  input: FamilyRegistrationInput,
): Promise<FamilyRegistrationResult> {
  const parentEmail = input.parentEmail.trim().toLowerCase();
  const response = await appCheckedFetch('/api/register-family', {
    method: 'POST',
    body: JSON.stringify({ ...input, parentEmail }),
  });

  const payload = await response.json().catch(() => ({})) as RegistrationResponse;
  if (!response.ok) {
    throw new Error(payload.error || 'Aile hesabı şu anda oluşturulamadı. Lütfen tekrar deneyin.');
  }
  if (!payload.success || !payload.parentProfile || !payload.student) {
    throw new Error('Kayıt servisi beklenmeyen bir yanıt verdi. Lütfen tekrar deneyin.');
  }

  let verificationSent = false;
  try {
    const credential = await signInWithEmailAndPassword(auth, parentEmail, input.parentPassword);
    await sendEmailVerification(credential.user);
    verificationSent = true;
  } catch (error) {
    // Account creation has already committed on the server. A transient client
    // sign-in/mail failure must not turn a successful registration into a
    // misleading retry that would collide with the newly created account.
    console.warn('Aile hesabı oluşturuldu; doğrulama e-postası daha sonra gönderilecek.', error);
  }

  return {
    parentProfile: payload.parentProfile,
    student: payload.student,
    verificationSent,
  };
}
