import { randomInt } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { strongPasswordSchema } from '../src/lib/validations';
import { registrationOpen, type SettingsRecord } from '../src/lib/platform-settings';
import { PasswordPolicyError } from './password-policy';
import { normalizeStudentCode } from './security';

export const registerFamilySchema = z.object({
  parentEmail: z.string().trim().toLowerCase().max(254, 'E-posta adresi çok uzun.').email('Geçerli bir veli e-posta adresi giriniz.'),
  parentPassword: strongPasswordSchema,
  parentPhone: z.string().trim().max(30).optional().refine(value => !value || /^(?:\+90|0)?5\d{9}$/.test(value.replace(/[\s()-]/g, '')), 'Geçerli bir cep telefonu numarası giriniz.'),
  studentName: z.string().trim().min(2, 'Öğrencinin takma adı en az 2 karakter olmalıdır.').max(50, 'Takma ad en fazla 50 karakter olabilir.'),
  studentPassword: strongPasswordSchema,
  grade: z.number().int().min(1, 'Sınıf 1 ile 4 arasında olmalıdır.').max(4, 'Sınıf 1 ile 4 arasında olmalıdır.'),
  examFocus: z.string().trim().min(1, 'Çalışma alanı gerekli.').max(100),
  consentAccepted: z.literal(true, { error: 'Kişisel veriler aydınlatma metnini okumalısınız.' }),
  termsAccepted: z.literal(true, { error: 'Kullanım koşullarını kabul etmelisiniz.' }),
  guardianConfirmed: z.literal(true, { error: 'Velilik/yasal temsilcilik beyanı gerekli.' }),
  policyVersion: z.string().regex(/^2026-10-11\.\d+$/, 'Kayıt bilgilerini yenileyip tekrar deneyin.'),
}).strict().refine(value => value.parentPassword !== value.studentPassword, {
  message: 'Veli ve öğrenci şifreleri farklı olmalıdır.', path: ['studentPassword'],
});

export function isDuplicateEmail(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  return ['email_exists', 'user_already_exists'].includes(candidate?.code || '') ||
    /already registered|already been registered|already exists/i.test(candidate?.message ?? '');
}

type Profile = Record<string, unknown> & { id: string; role: string };
interface RegistrationDependencies {
  configuration(): Promise<SettingsRecord>;
  checkPassword(password: string): Promise<void>;
  createUser(input: { email: string; password: string; emailVerified: boolean; displayName: string; phoneNumber?: string }): Promise<{ uid: string }>;
  saveProfiles(profiles: Profile[]): Promise<void>;
  deleteUser(id: string): Promise<void>;
  sendVerification(email: string): Promise<void>;
  logFailure(context: string, error: unknown): void;
  suffix?(): number;
}

/** Auth users require compensating cleanup; both application profiles are one database write. */
export function createFamilyRegistrationHandler(deps: RegistrationDependencies) {
  return async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const parsed = registerFamilySchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || '';
      return res.status(400).json({ error: /^(?:Invalid|Too |Unrecognized|Expected)/.test(message) || !message ? 'Lütfen zorunlu kayıt alanlarını doğru biçimde doldurun.' : message, code: 'INVALID_REGISTRATION' });
    }
    const created: string[] = [];
    let committed = false;
    try {
      const configuration = await deps.configuration();
      if (!registrationOpen(configuration.settings)) return res.status(503).json({ error: 'Yeni aile kayıtları hazırlık aşamasında. Mevcut hesabınızla giriş yapabilirsiniz.', code: 'REGISTRATION_NOT_READY' });
      if (parsed.data.policyVersion !== `2026-10-11.${configuration.revision}`) return res.status(409).json({ error: 'Aydınlatma metni güncellendi. Güncel metni okuyup yeniden onaylayın.', code: 'POLICY_UPDATED' });
      const input = parsed.data;
      await Promise.all([deps.checkPassword(input.parentPassword), deps.checkPassword(input.studentPassword)]);
      const parent = await deps.createUser({ email: input.parentEmail, password: input.parentPassword, phoneNumber: input.parentPhone || undefined, emailVerified: false, displayName: `Veli (${input.studentName})` });
      created.push(parent.uid);
      let student: { uid: string } | undefined;
      let code = '', studentEmail = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        code = `${normalizeStudentCode(input.studentName)}${deps.suffix?.() ?? randomInt(1000, 10000)}`;
        studentEmail = `${code.toLowerCase()}@zekapark.com`;
        try {
          student = await deps.createUser({ email: studentEmail, password: input.studentPassword, emailVerified: false, displayName: input.studentName });
          created.push(student.uid);
          break;
        } catch (error) { if (!isDuplicateEmail(error)) throw error; }
      }
      if (!student) throw Error('Student code allocation failed');
      const now = Date.now();
      const consent = { actorRole: 'parent', acceptedAt: now, kvkkVersion: input.policyVersion, privacyAcknowledged: true, termsAccepted: true, guardianConfirmed: true, termsVersion: input.policyVersion };
      const parentProfile: Profile = { id: parent.uid, email: input.parentEmail, name: `Veli (${input.studentName})`, role: 'parent', linkedStudentIds: [student.uid], avatar: '🦉', ...(input.parentPhone ? { parentPhone: input.parentPhone } : {}), consent, createdAt: now, updatedAt: now };
      const studentProfile: Profile = { id: student.uid, email: studentEmail, name: input.studentName, role: 'student', studentCode: code, grade: input.grade, avatar: '🦊', level: 1, xp: 0, streak: 0, lastActiveDate: new Date(now).toISOString(), dailyGoalMinutes: 15, todayMinutesSpent: 0, soundEnabled: true, linkedParentId: parent.uid, examFocus: input.examFocus, recoveryEmail: input.parentEmail, consent, createdAt: now, updatedAt: now };
      await deps.saveProfiles([parentProfile, studentProfile]);
      committed = true;
      let verificationSent = false;
      try { await deps.sendVerification(input.parentEmail); verificationSent = true; }
      catch (error) { deps.logFailure('Family confirmation delivery failed', error); }
      return res.status(201).json({ success: true, parentProfile, student: { id: student.uid, code, email: studentEmail }, verificationSent });
    } catch (error) {
      if (!(error instanceof PasswordPolicyError)) deps.logFailure('Family registration failed', error);
      if (!committed) {
        for (const id of created.reverse()) {
          try { await deps.deleteUser(id); }
          catch (cleanupError) { deps.logFailure('Incomplete family cleanup failed', cleanupError); }
        }
      }
      if (error instanceof PasswordPolicyError) return res.status(error.status).json({ error: error.message, code: error.code });
      if (isDuplicateEmail(error)) return res.status(409).json({ error: 'Bu e-posta ile yeni hesap oluşturulamadı. Mevcut hesabınıza giriş yapın veya şifrenizi sıfırlayın.', code: 'ACCOUNT_EXISTS' });
      return res.status(503).json({ error: 'Kayıt tamamlanamadı. Bir süre sonra tekrar deneyin.', code: 'REGISTRATION_UNAVAILABLE' });
    }
  };
}
