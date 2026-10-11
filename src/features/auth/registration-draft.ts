import { registerParentSchema } from '../../lib/validations';

export interface RegistrationDraft {
  parentEmail: string;
  password: string;
  passwordConfirmation: string;
  studentName: string;
  grade: number;
  studentPassword: string;
  studentPasswordConfirmation: string;
  kvkkConsent: boolean;
  termsAccepted: boolean;
  guardianConfirmed: boolean;
}
export type RegistrationStep = 0 | 1 | 2;
export type RegistrationErrors = Partial<Record<keyof RegistrationDraft, string>>;
const stepFields: Array<Array<keyof RegistrationDraft>> = [
  ['parentEmail', 'password', 'passwordConfirmation'],
  ['studentName', 'grade', 'studentPassword', 'studentPasswordConfirmation'],
  ['kvkkConsent', 'termsAccepted', 'guardianConfirmed'],
];
export function validateRegistrationDraft(draft: RegistrationDraft, step?: RegistrationStep): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const parsed = registerParentSchema.safeParse({ ...draft, examFocus: 'Genel Zihinsel Yetenek' });
  if (!parsed.success) for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof RegistrationDraft;
    if (stepFields.flat().includes(key) && !errors[key]) errors[key] = issue.message;
  }
  if (!draft.passwordConfirmation) errors.passwordConfirmation = 'Veli şifrenizi tekrar girin.';
  else if (draft.password !== draft.passwordConfirmation) errors.passwordConfirmation = 'Veli şifreleri eşleşmiyor.';
  if (!draft.studentPasswordConfirmation) errors.studentPasswordConfirmation = 'Öğrenci şifrenizi tekrar girin.';
  else if (draft.studentPassword !== draft.studentPasswordConfirmation) errors.studentPasswordConfirmation = 'Öğrenci şifreleri eşleşmiyor.';
  // Consent fields are intentionally unfinished before the review step; Zod can skip
  // object refinements when literals are invalid, so check distinct passwords here too.
  if (draft.password && draft.password === draft.studentPassword) errors.studentPassword = 'Veli ve öğrenci şifreleri farklı olmalıdır.';
  return step === undefined ? errors : Object.fromEntries(Object.entries(errors).filter(([key]) => stepFields[step].includes(key as keyof RegistrationDraft)));
}
export function firstInvalidRegistrationStep(errors: RegistrationErrors): RegistrationStep {
  const first = stepFields.findIndex(keys => keys.some(key => errors[key]));
  return (first < 0 ? 2 : first) as RegistrationStep;
}
