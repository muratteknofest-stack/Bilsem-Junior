import { createHash, randomInt } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import {
  getAdminAuth,
  getAdminDb,
  requireAppCheck,
  normalizeStudentCode,
} from '../security';
import { accountSecurityLimiter } from '../rate-limiters';
import { KVKK_POLICY_VERSION, TERMS_POLICY_VERSION } from '../../src/lib/account-policy';

const authRoutes = Router();

const strongPassword = z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
  message: 'Şifre en az bir harf ve bir rakam içermelidir.',
});

function normalizePhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^05\d{9}$/.test(compact)) return `+90${compact.slice(1)}`;
  if (/^5\d{9}$/.test(compact)) return `+90${compact}`;
  if (/^90\d{10}$/.test(compact)) return `+${compact}`;
  return null;
}

const registerFamilySchema = z.object({
  parentEmail: z.string().email('Geçerli bir veli e-posta adresi giriniz.').toLowerCase().trim(),
  parentPassword: strongPassword,
  parentPhone: z.string().trim().min(8).max(24)
    .refine((value) => normalizePhone(value) !== null, 'Geçerli bir telefon numarası giriniz.')
    .optional(),
  studentName: z.string().min(2, 'Öğrenci adı en az 2 karakter olmalıdır.').max(50).trim(),
  studentPassword: strongPassword,
  grade: z.number().int().min(1).max(4),
  examFocus: z.string().default('bilsem'),
  guardianConsent: z.literal(true),
  requestId: z.string().uuid(),
}).strict();

authRoutes.post('/register-family', requireAppCheck, accountSecurityLimiter, async (req, res) => {
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
    guardianConsent,
    requestId,
  } = parsed.data;
  const normalizedParentPhone = parentPhone ? normalizePhone(parentPhone) : undefined;

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  const now = Date.now();
  const operationRef = adminDb.doc(`registrationOperations/family_${requestId.replace(/-/g, '')}`);
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    parentEmail,
    parentPhone: normalizedParentPhone || '',
    studentName,
    grade,
    examFocus,
    guardianConsent,
  })).digest('hex');

  let createdParentUser: { uid: string } | null = null;
  let createdStudentUser: { uid: string } | null = null;

  try {
    const previousOperation = await operationRef.get();
    if (previousOperation.exists) {
      const operation = previousOperation.data()!;
      if (operation.requestFingerprint !== requestFingerprint) {
        return res.status(409).json({ error: 'İstek kimliği farklı bir aile kaydı için kullanılmış.' });
      }
      const [parentSnapshot, studentSnapshot] = await adminDb.getAll(
        adminDb.doc(`users/${operation.parentId}`),
        adminDb.doc(`users/${operation.studentId}`),
      );
      const parentProfile = parentSnapshot.data();
      const studentProfile = studentSnapshot.data();
      if (!parentProfile || !studentProfile?.studentCode) {
        return res.status(503).json({ error: 'Aile kayıt işlemi bütünlük kontrolünü geçemedi.' });
      }
      return res.status(200).json({
        success: true,
        idempotent: true,
        parentProfile,
        student: {
          id: studentSnapshot.id,
          code: studentProfile.studentCode,
          email: studentProfile.email,
        },
      });
    }

    try {
      const existing = await adminAuth.getUserByEmail(parentEmail);
      if (existing) {
        return res.status(409).json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' });
      }
    } catch (err: any) {
      if (err.code !== 'auth/user-not-found') throw err;
    }

    createdParentUser = await adminAuth.createUser({
      email: parentEmail,
      password: parentPassword,
      emailVerified: false,
      displayName: `Veli (${studentName})`,
    });

    let studentCode = '';
    let studentEmail = '';
    const baseCode = normalizeStudentCode(studentName);
    
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomSuffix = randomInt(1000, 10_000);
      studentCode = `${baseCode}${randomSuffix}`;
      studentEmail = `${studentCode.toLowerCase()}@zekapark.com`;
      try {
        await adminAuth.getUserByEmail(studentEmail);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') break;
      }
    }

    createdStudentUser = await adminAuth.createUser({
      email: studentEmail,
      password: studentPassword,
      emailVerified: true,
      displayName: studentName,
    });

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
        guardianConfirmed: guardianConsent,
        acceptedAt: now,
        kvkkVersion: KVKK_POLICY_VERSION,
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
      level: 1,
      xp: 0,
      streak: 0,
      lastActiveDate: new Date(now).toISOString(),
      dailyGoalMinutes: 0,
      todayMinutesSpent: 0,
      soundEnabled: true,
      parentPhone: normalizedParentPhone || '',
      consent: {
        actorRole: 'parent',
        guardianConfirmed: guardianConsent,
        acceptedAt: now,
        kvkkVersion: KVKK_POLICY_VERSION,
        termsVersion: TERMS_POLICY_VERSION,
      },
      createdAt: now,
      updatedAt: now,
    };

    const batch = adminDb.batch();
    batch.set(adminDb.doc(`users/${createdStudentUser.uid}`), studentProfile);
    batch.set(adminDb.doc(`users/${createdParentUser.uid}`), parentProfile);
    batch.create(operationRef, {
      requestFingerprint,
      parentId: createdParentUser.uid,
      studentId: createdStudentUser.uid,
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60_000,
    });
    await batch.commit();

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
    console.error('[AuthRoutes] register-family error:', error);

    if (createdStudentUser) {
      await adminAuth.deleteUser(createdStudentUser.uid).catch(() => {});
    }
    if (createdParentUser) {
      await adminAuth.deleteUser(createdParentUser.uid).catch(() => {});
    }

    return res.status(500).json({
      error: 'Aile hesabı oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.',
    });
  }
});

export default authRoutes;
