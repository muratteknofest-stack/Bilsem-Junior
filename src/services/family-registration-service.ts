import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { deleteDoc, doc, initializeFirestore, setDoc } from 'firebase/firestore';
import { auth, databaseId, db, firebaseConfig } from '../lib/firebase';
import { UserProfile } from '../types';

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

const normalizeStudentCode = (name: string) => {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);
  return normalized || 'ZEKA';
};

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
      studentCode = `${normalizeStudentCode(input.studentName)}${randomDigits()}`;
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
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', parentCredential.user.uid), {
      ...parentProfile,
      parentPhone: input.parentPhone || '',
    });
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
