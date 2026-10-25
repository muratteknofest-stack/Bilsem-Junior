import type { RegistrationDraft, RegistrationErrors, RegistrationStep } from './registration-draft';

export const compactRegistrationPages: ReadonlyArray<{
  title: string; step: RegistrationStep; fields: ReadonlyArray<keyof RegistrationDraft>;
}> = [
  { title: 'Veli e-postası', step: 0, fields: ['parentEmail'] },
  { title: 'Veli şifresi', step: 0, fields: ['password', 'passwordConfirmation'] },
  { title: 'Öğrencini tanıyalım', step: 1, fields: ['studentName', 'grade'] },
  { title: 'Öğrenci şifresi', step: 1, fields: ['studentPassword', 'studentPasswordConfirmation'] },
  { title: 'Kontrol ve onay', step: 2, fields: ['kvkkConsent', 'termsAccepted', 'guardianConfirmed'] },
];

export function compactPageErrors(errors: RegistrationErrors, page: number): RegistrationErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) =>
    compactRegistrationPages[page].fields.includes(key as keyof RegistrationDraft)));
}

export function firstInvalidCompactPage(errors: RegistrationErrors) {
  const page = compactRegistrationPages.findIndex(item => item.fields.some(key => errors[key]));
  return page < 0 ? compactRegistrationPages.length - 1 : page;
}
