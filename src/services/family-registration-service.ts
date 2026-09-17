import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { deleteDoc, doc, initializeFirestore, setDoc } from 'firebase/firestore';
import { auth, databaseId, db, firebaseConfig } from '../lib/firebase';
import { UserProfile } from '../types';
import { createStudentCode } from '../lib/account-identifiers';
import { createConsentRecord } from '../lib/account-policy';

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

const randomDigits = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
};

export async function registerFamilyInFirebase(
  input: FamilyRegistrationInput,
): Promise<FamilyRegistrationResult> {
  const parentEmail = input.parentEmail.trim().toLowerCase();
  const now = Date.now();

  // ── 1. Öncelikli Yol: Güvenli Sunucu Tarafı Atomik Kayıt (Server-Side Atomic Registration) ──
  try {
    const res = await fetch('/api/register-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.parentProfile && data.student) {
        // Automatically sign in parent on client to establish session
        const credential = await signInWithEmailAndPassword(auth, parentEmail, input.parentPassword);
        let verificationSent = false;
        try {
          await sendEmailVerification(credential.user);
          verificationSent = true;
        } catch {
          verificationSent = false;
        }

        return {
          parentProfile: data.parentProfile,
          student: data.student,
          verificationSent,
        };
      }
    } else if (res.status === 400 || res.status === 409) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Kayıt işlemi gerçekleştirilemedi.');
    }
    // If 404 or 5xx, fall through to client-side fallback
  } catch (err: any) {
    // If it's a validation or conflict error, bubble it up immediately
    if (err.message && (err.message.includes('kayıtlı bir hesap') || err.message.includes('Geçerli bir'))) {
      throw err;
    }
    console.warn('[FamilyRegistration] Sunucu API yanıt vermedi, güvenli istemci yedeği kullanılıyor...', err);
  }

  // ── 2. Yedek Yol: İstemci Tarafı (Client-Side Fallback) ──
  const secondaryApp = initializeApp(firebaseConfig, `family-registration-${now}-${randomDigits()}`);
  const studentAuth = getAuth(secondaryApp);
  const studentDb = databaseId
    ? initializeFirestore(secondaryApp, {}, databaseId)
    : initializeFirestore(secondaryApp, {});

  let parentUserCreated = false;
  let studentUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>['user'] | null = null;
  let studentProfileCreated = false;
  let parentProfileCreated = false;

  try {
    const parentCredential = await createUserWithEmailAndPassword(
      auth,
      parentEmail,
      input.parentPassword,
    );
    parentUserCreated = true;

    let studentCode = '';
    let studentEmail = '';
    let lastCollision: unknown;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      studentCode = createStudentCode(input.studentName);
      studentEmail = `${studentCode.toLowerCase()}@zekapark.com`;
      try {
        const studentCredential = await createUserWithEmailAndPassword(
          studentAuth,
          studentEmail,
          input.studentPassword,
        );
        studentUser = studentCredential.user;
        break;
      } catch (error: any) {
        if (error?.code !== 'auth/email-already-in-use') throw error;
        lastCollision = error;
      }
    }
    if (!studentUser) throw lastCollision || new Error('Öğrenci giriş kodu oluşturulamadı.');

    const studentProfile: UserProfile = {
      id: studentUser.uid,
      email: studentEmail,
      name: input.studentName.trim(),
      role: 'student',
      studentCode,
      grade: input.grade,
      avatar: '🦊',
      level: 1,
      xp: 0,
      streak: 0,
      lastActiveDate: new Date(now).toISOString(),
      dailyGoalMinutes: 15,
      todayMinutesSpent: 0,
      soundEnabled: true,
      linkedParentId: parentCredential.user.uid,
      examFocus: input.examFocus,
      recoveryEmail: parentEmail,
      consent: createConsentRecord('parent', now),
      createdAt: now,
      updatedAt: now,
      totalPoints: 0,
      totalQuestionsSolved: 0,
      resolvedMistakesCount: 0,
    };

    await setDoc(doc(studentDb, 'users', studentUser.uid), {
      ...studentProfile,
      examFocus: input.examFocus,
    });
    studentProfileCreated = true;

    const parentProfile: UserProfile = {
      id: parentCredential.user.uid,
      email: parentEmail,
      name: parentEmail.split('@')[0],
      role: 'parent',
      avatar: '👨‍👩‍👧',
      level: 1,
      xp: 0,
      streak: 0,
      lastActiveDate: new Date(now).toISOString(),
      dailyGoalMinutes: 0,
      todayMinutesSpent: 0,
      soundEnabled: true,
      linkedStudentIds: [studentUser.uid],
      parentPhone: input.parentPhone || '',
      consent: createConsentRecord('parent', now),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', parentCredential.user.uid), parentProfile);
    parentProfileCreated = true;

    let verificationSent = false;
    try {
      await sendEmailVerification(parentCredential.user);
      verificationSent = true;
    } catch {
      verificationSent = false;
    }

    await signOut(studentAuth);
    return {
      parentProfile,
      student: { id: studentUser.uid, code: studentCode, email: studentEmail },
      verificationSent,
    };
  } catch (error) {
    if (studentUser) {
      if (studentProfileCreated) {
        await deleteDoc(doc(studentDb, 'users', studentUser.uid)).catch(() => undefined);
      }
      await deleteUser(studentUser).catch(() => undefined);
    }
    if (parentUserCreated && auth.currentUser) {
      if (parentProfileCreated) {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid)).catch(() => undefined);
      }
      await deleteUser(auth.currentUser).catch(() => undefined);
    }
    throw error;
  } finally {
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}
