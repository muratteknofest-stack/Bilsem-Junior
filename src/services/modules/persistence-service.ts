import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { safeStorage } from '../../lib/storage';
import { STORAGE_KEYS, USER_PROGRESS_KEYS, createEmptyMasteries } from './shared';
import { ExamResult, MistakeItem, SkillMastery } from '../../types';

export function clearUserProgress() {
  USER_PROGRESS_KEYS.forEach((key) => safeStorage.removeItem(key));
}

export async function persistUserStateToFirebase() {
  // Progress is server-authoritative. Local storage is a disposable UI cache;
  // browser clients are intentionally not allowed to persist scores or XP.
}

export function scheduleProgressPersist() {
  // Kept as a compatibility no-op while remaining practice surfaces are moved
  // to trusted scoring endpoints.
}

export function setProgressItem(key: (typeof USER_PROGRESS_KEYS)[number], value: string) {
  safeStorage.setItem(key, value);
  scheduleProgressPersist();
}

export function removeProgressItem(key: (typeof USER_PROGRESS_KEYS)[number]) {
  safeStorage.removeItem(key);
  scheduleProgressPersist();
}

export function cacheAuthoritativeProgress(input: { masteries?: SkillMastery[]; mistakes?: MistakeItem[] }) {
  if (input.masteries) safeStorage.setItem(STORAGE_KEYS.MASTERY, JSON.stringify(input.masteries));
  if (input.mistakes) {
    const safeMistakes = input.mistakes.map(({ questionSeed: _seed, cachedQuestion: _question, ...mistake }) => mistake);
    safeStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(safeMistakes));
  }
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
      if (typeof value !== 'string') return;
      if (key === STORAGE_KEYS.MISTAKES) {
        try {
          const parsed = JSON.parse(value) as MistakeItem[];
          const safeMistakes = Array.isArray(parsed)
            ? parsed.map(({ questionSeed: _seed, cachedQuestion: _question, ...mistake }) => mistake)
            : [];
          safeStorage.setItem(key, JSON.stringify(safeMistakes));
          return;
        } catch {
          safeStorage.setItem(key, JSON.stringify([]));
          return;
        }
      }
      safeStorage.setItem(key, value);
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
