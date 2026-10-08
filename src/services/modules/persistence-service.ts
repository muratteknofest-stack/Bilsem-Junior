import { doc, getDoc } from '../../lib/supabase-data';
import { db, auth } from '../../lib/platform';
import { safeStorage } from '../../lib/storage';
import { STORAGE_KEYS, USER_PROGRESS_KEYS, createEmptyMasteries } from './shared';
import { supabase } from '../../lib/supabase';
import { ExamResult, SkillMastery } from '../../types';

const pendingProgress = new Map<string, string | null>();
let pendingUserId: string | null = null;
let persistInFlight: Promise<void> | null = null;

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function clearUserProgress() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  pendingProgress.clear();
  pendingUserId = null;
  USER_PROGRESS_KEYS.forEach((key) => safeStorage.removeItem(key));
}

export async function persistUserStateToSupabase() {
  const currentUser = auth.currentUser;
  if (!currentUser || pendingUserId !== currentUser.uid) return;
  if (persistInFlight) {
    await persistInFlight;
    if (pendingProgress.size) return persistUserStateToSupabase();
    return;
  }
  if (!pendingProgress.size) return;
  const patch = Object.fromEntries(pendingProgress);
  pendingProgress.clear();
  const userId = currentUser.uid;
  persistInFlight = (async () => {
    try {
      const { error } = await supabase.rpc('patch_user_progress', { p_patch: patch });
      if (error) throw error;
    } catch (error) {
      if (pendingUserId === userId) {
        for (const [key, value] of Object.entries(patch)) {
          if (!pendingProgress.has(key)) pendingProgress.set(key, value as string | null);
        }
      }
      throw error;
    }
  })();
  try { await persistInFlight; } finally { persistInFlight = null; }
  if (pendingProgress.size) scheduleProgressPersist();
}

export function scheduleProgressPersist() {
  if (!auth.currentUser) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistUserStateToSupabase().catch((error) => {
      console.error('Kullanıcı ilerlemesi senkronize edilemedi.', error);
    });
  }, 400);
}

export function setProgressItem(key: (typeof USER_PROGRESS_KEYS)[number], value: string) {
  safeStorage.setItem(key, value);
  queueProgressItem(key, value);
  scheduleProgressPersist();
}

export function removeProgressItem(key: (typeof USER_PROGRESS_KEYS)[number]) {
  safeStorage.removeItem(key);
  queueProgressItem(key, null);
  scheduleProgressPersist();
}

function queueProgressItem(key: string, value: string | null) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  if (pendingUserId !== userId) pendingProgress.clear();
  pendingUserId = userId;
  pendingProgress.set(key, value);
}

export async function hydrateUserStateFromSupabase(): Promise<void> {
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

