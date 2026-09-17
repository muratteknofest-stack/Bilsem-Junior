import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { safeStorage } from '../../lib/storage';
import { STORAGE_KEYS, USER_PROGRESS_KEYS, createEmptyMasteries } from './shared';
import { ExamResult, SkillMastery } from '../../types';

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function clearUserProgress() {
  USER_PROGRESS_KEYS.forEach((key) => safeStorage.removeItem(key));
}

export async function persistUserStateToFirebase() {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const values = Object.fromEntries(
    USER_PROGRESS_KEYS.map((key) => [key, safeStorage.getItem(key)]).filter(([, value]) => value !== null),
  );
  await setDoc(
    doc(db, 'users', currentUser.uid, 'private', 'state'),
    { values, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function scheduleProgressPersist() {
  if (!auth.currentUser) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistUserStateToFirebase().catch((error) => {
      console.error('Kullanıcı ilerlemesi senkronize edilemedi.', error);
    });
  }, 400);
}

export function setProgressItem(key: (typeof USER_PROGRESS_KEYS)[number], value: string) {
  safeStorage.setItem(key, value);
  scheduleProgressPersist();
}

export function removeProgressItem(key: (typeof USER_PROGRESS_KEYS)[number]) {
  safeStorage.removeItem(key);
  scheduleProgressPersist();
}

export async function hydrateUserStateFromFirebase(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const snapshot = await getDoc(doc(db, 'users', currentUser.uid, 'private', 'state'));
  clearUserProgress();
  const values = snapshot.data()?.values;
  if (values && typeof values === 'object') {
    USER_PROGRESS_KEYS.forEach((key) => {
      const value = (values as Record<string, unknown>)[key];
      if (typeof value === 'string') safeStorage.setItem(key, value);
    });
  }
}

export async function loadRemoteProgressForUser(userId: string): Promise<{
  masteries: SkillMastery[];
  weeklyQuestions: unknown | null;
  examResults: ExamResult[];
}> {
  const snapshot = await getDoc(doc(db, 'users', userId, 'private', 'state'));
  const values = (snapshot.data()?.values || {}) as Record<string, unknown>;
  const parse = <T>(key: string, fallback: T): T => {
    const raw = values[key];
    if (typeof raw !== 'string') return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };
  return {
    masteries: parse(STORAGE_KEYS.MASTERY, createEmptyMasteries()),
    weeklyQuestions: parse<unknown | null>(STORAGE_KEYS.WEEKLY_QUESTIONS, null),
    examResults: parse(STORAGE_KEYS.EXAM_RESULTS, []),
  };
}
