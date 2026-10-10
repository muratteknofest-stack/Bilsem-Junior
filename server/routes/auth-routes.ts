import { assertPasswordNotCompromised, PasswordPolicyError } from '../password-policy';
import { changeOwnPassword } from '../password-change';
import { logServerFailure } from '../safe-log';
import { sharedRateLimit } from '../shared-rate-limit';
import { Router } from 'express';
import { z } from 'zod';
import { randomInt } from 'node:crypto';
import {
  getAdminAuth,
  getAdminDb,
  normalizeStudentCode,
  requireSupabaseAuth, requireVerifiedEmail, requireProfileRole,
} from '../security';
import { accountSecurityLimiter } from '../rate-limiters';
import { KVKK_POLICY_VERSION, TERMS_POLICY_VERSION } from '../../src/lib/account-policy';
import { getServiceClient } from '../supabase-admin';

const authRoutes = Router();

function isDuplicateEmail(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  return candidate?.code === 'email_exists' ||
    /already registered|already been registered|already exists/i.test(candidate?.message ?? '');
}

const strongPassword = z.string().min(8).max(128)
  .regex(/[A-Za-zğüşıöçĞÜŞİÖÇ]/, 'Şifre en az bir harf içermelidir.')
  .regex(/\d/, 'Şifre en az bir rakam içermelidir.');

export const registerFamilySchema = z.object({
  parentEmail: z.string().trim().toLowerCase().email('Geçerli bir veli e-posta adresi giriniz.'),
  parentPassword: strongPassword,
  parentPhone: z.string().trim().max(30).optional().refine(value => !value || /^(?:\+90|0)?5\d{9}$/.test(value.replace(/[\s()-]/g, '')), 'Geçerli bir cep telefonu numarası giriniz.'),
  studentName: z.string().trim().min(2, 'Öğrenci adı en az 2 karakter olmalıdır.').max(50),
  studentPassword: strongPassword,
  grade: z.number().int().min(1).max(4),
  examFocus: z.string().trim().min(1).max(100),
  consentAccepted: z.literal(true),
  termsAccepted: z.literal(true),
  guardianConfirmed: z.literal(true),
}).strict().refine(value => value.parentPassword !== value.studentPassword, {
  message: 'Veli ve öğrenci şifreleri farklı olmalıdır.', path: ['studentPassword'],
});

export const registerStudentSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: strongPassword,
  studentName: z.string().trim().min(2).max(50),
  grade: z.number().int().min(1).max(4),
  examFocus: z.string().trim().min(1).max(100),
  consentAccepted: z.literal(true),
}).strict();

authRoutes.post('/register-student', accountSecurityLimiter, (_req, res) => {
  return res.status(410).json({ error: 'Yeni öğrenci hesabı veli kaydı üzerinden açılır.', code: 'FAMILY_REGISTRATION_REQUIRED' });
});

authRoutes.post('/register-family', accountSecurityLimiter, sharedRateLimit('family-registration', 6, 3600), async (req, res) => {
  const parsed = registerFamilySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Kayıt bilgileri geçersiz.' });
  }

  const {
    parentEmail,
    parentPassword,
    parentPhone,
    studentName,
    studentPassword,
    grade,
    examFocus,
  } = parsed.data;

  const now = Date.now();

  let createdParentUser: { uid: string } | null = null;
  let createdStudentUser: { uid: string } | null = null;

  try {
    await Promise.all([assertPasswordNotCompromised(parentPassword), assertPasswordNotCompromised(studentPassword)]);
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    createdParentUser = await adminAuth.createUser({
      email: parentEmail,
      password: parentPassword,
      phoneNumber: parentPhone || undefined,
      emailVerified: false,
      displayName: `Veli (${studentName})`,
    });

    let studentCode = '';
    let studentEmail = '';
    const baseCode = normalizeStudentCode(studentName);
    
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomSuffix = randomInt(1000, 10000);
      studentCode = `${baseCode}${randomSuffix}`;
      studentEmail = `${studentCode.toLowerCase()}@zekapark.com`;
      try {
        createdStudentUser = await adminAuth.createUser({
          email: studentEmail,
          password: studentPassword,
          emailVerified: false,
          displayName: studentName,
        });
        break;
      } catch (error) {
        if (!isDuplicateEmail(error)) throw error;
      }
    }
    if (!createdStudentUser) throw new Error('Benzersiz öğrenci kodu üretilemedi. Lütfen tekrar deneyiniz.');

    const studentProfile = {
      id: createdStudentUser.uid,
      email: studentEmail,
      name: studentName,
      role: 'student',
      studentCode,
      grade,
      avatar: '🦊',
      level: 1,
      xp: 0,
      streak: 0,
      lastActiveDate: new Date(now).toISOString(),
      dailyGoalMinutes: 15,
      todayMinutesSpent: 0,
      soundEnabled: true,
      linkedParentId: createdParentUser.uid,
      examFocus,
      recoveryEmail: parentEmail,
      consent: {
        actorRole: 'parent',
        acceptedAt: now,
        kvkkVersion: KVKK_POLICY_VERSION,
        privacyAcknowledged: true,
        termsAccepted: true,
        guardianConfirmed: true,
        termsVersion: TERMS_POLICY_VERSION,
      },
      createdAt: now,
      updatedAt: now,
    };

    const parentProfile = {
      id: createdParentUser.uid,
      email: parentEmail,
      name: `Veli (${studentName})`,
      role: 'parent',
      linkedStudentIds: [createdStudentUser.uid],
      avatar: '🦉',
      parentPhone: parentPhone || undefined,
      consent: {
        actorRole: 'parent',
        acceptedAt: now,
        kvkkVersion: KVKK_POLICY_VERSION,
        privacyAcknowledged: true,
        termsAccepted: true,
        guardianConfirmed: true,
        termsVersion: TERMS_POLICY_VERSION,
      },
      createdAt: now,
      updatedAt: now,
    };

    const batch = adminDb.batch();
    batch.set(adminDb.doc(`users/${createdStudentUser.uid}`), studentProfile);
    batch.set(adminDb.doc(`users/${createdParentUser.uid}`), parentProfile);
    await batch.commit();
    const { error: mailError } = await getServiceClient().auth.resend({
      type: 'signup', email: parentEmail,
    });
    if (mailError) throw mailError;

    return res.status(201).json({
      success: true,
      parentProfile,
      student: {
        id: createdStudentUser.uid,
        code: studentCode,
        email: studentEmail,
      },
    });
  } catch (error: any) {
    if (!(error instanceof PasswordPolicyError)) logServerFailure('Family registration failed', error);

    for (const created of [createdStudentUser, createdParentUser]) {
      if (!created) continue;
      await getAdminDb().doc(`users/${created.uid}`).delete().catch(() => undefined);
      await getAdminAuth().deleteUser(created.uid).catch(() => undefined);
    }

    if (error instanceof PasswordPolicyError) return res.status(error.status).json({ error: error.message, code: error.code });
    if (isDuplicateEmail(error)) return res.status(409).json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' });
    return res.status(503).json({
      error: 'Aile hesabı veya doğrulama e-postası oluşturulamadı. Lütfen tekrar deneyin.',
    });
  }
});

authRoutes.post('/auth/change-password', requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('parent', 'admin'), accountSecurityLimiter, sharedRateLimit('own-password-change', 6, 3600), changeOwnPassword);

export default authRoutes;


