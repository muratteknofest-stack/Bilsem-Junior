import { Router } from 'express';
import { z } from 'zod';
import {
  getAdminAuth,
  getAdminDb,
  requireAppCheck,
  normalizeStudentCode,
} from '../security';
import { accountSecurityLimiter } from '../rate-limiters';

const authRoutes = Router();

const strongPassword = z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
  message: 'Şifre en az bir harf ve bir rakam içermelidir.',
});

const registerFamilySchema = z.object({
  parentEmail: z.string().email('Geçerli bir veli e-posta adresi giriniz.').toLowerCase().trim(),
  parentPassword: strongPassword,
  parentPhone: z.string().optional(),
  studentName: z.string().min(2, 'Öğrenci adı en az 2 karakter olmalıdır.').max(50).trim(),
  studentPassword: strongPassword,
  grade: z.number().int().min(1).max(4),
  examFocus: z.string().default('bilsem'),
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
  } = parsed.data;

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  const now = Date.now();

  let createdParentUser: { uid: string } | null = null;
  let createdStudentUser: { uid: string } | null = null;

  try {
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
      phoneNumber: parentPhone || undefined,
      emailVerified: false,
      displayName: `Veli (${studentName})`,
    });

    let studentCode = '';
    let studentEmail = '';
    const baseCode = normalizeStudentCode(studentName);
    
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
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
        acceptedAt: now,
        kvkkVersion: '2026.1',
        termsVersion: '2026.1',
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
      consent: {
        actorRole: 'parent',
        acceptedAt: now,
        kvkkVersion: '2026.1',
        termsVersion: '2026.1',
      },
      createdAt: now,
      updatedAt: now,
    };

    const batch = adminDb.batch();
    batch.set(adminDb.doc(`users/${createdStudentUser.uid}`), studentProfile);
    batch.set(adminDb.doc(`users/${createdParentUser.uid}`), parentProfile);
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
      error: error?.message || 'Aile hesabı oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.',
    });
  }
});

export default authRoutes;
