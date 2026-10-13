import { ProgressOutbox } from '../../lib/progress-outbox';
import { doc, getDoc } from '../../lib/supabase-data';
import { db, auth } from '../../lib/platform';
import { safeStorage } from '../../lib/storage';
import { STORAGE_KEYS, USER_PROGRESS_KEYS, CLIENT_PROGRESS_KEYS, createEmptyMasteries } from './shared';
import { supabase } from '../../lib/supabase';
import { ExamResult, SkillMastery } from '../../types';

const outbox = new ProgressOutbox(safeStorage, CLIENT_PROGRESS_KEYS);
type SyncStatus = 'saved' | 'pending' | 'syncing' | 'error';
let syncStatus: SyncStatus = 'saved';
const listeners = new Set<() => void>();
export const getProgressSyncStatus = () => activeUserId && outbox.isVolatile(activeUserId) ? 'volatile' : syncStatus;
export const subscribeProgressSync = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function setSyncStatus(next: SyncStatus) { syncStatus = next; listeners.forEach(listener => listener()); }
let activeUserId: string | null = null;
let retries = 0;
let hydrationRevision = 0;
let writeRevision = 0;
const localWrites = new Map<string, number>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const flights = new Map<string, Promise<void>>();

export function clearUserProgress() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  activeUserId = null;
  hydrationRevision++;
  localWrites.clear();
  retries = 0;
  setSyncStatus('saved');
  // Account-scoped unsent patches survive logout/reload and never hydrate another account.
  USER_PROGRESS_KEYS.forEach(key => safeStorage.removeItem(key));
}

export async function persistUserStateToSupabase(): Promise<void> {
  const user = auth.currentUser;
  const userId = user?.uid;
  if (!user || !userId) return;
  activeUserId = userId;
  const existing = flights.get(userId);
  if (existing) { await existing; return; }
  const sent = outbox.read(userId);
  if (!Object.keys(sent).length) { setSyncStatus('saved'); return; }
  setSyncStatus('syncing');
  const flight = (async () => {
    const token = await user.getIdToken();
    if (auth.currentUser?.uid !== userId) throw new Error('Hesap değişti.');
    const { error } = await supabase.rpc('patch_user_progress', { p_patch: ProgressOutbox.toPatch(sent) }).setHeader('Authorization', `Bearer ${token}`);
    if (error) throw error;
    outbox.acknowledge(userId, sent);
  })();
  flights.set(userId, flight);
  try {
    await flight;
    if (auth.currentUser?.uid === userId && activeUserId === userId) {
      retries = 0;
      setSyncStatus(Object.keys(outbox.read(userId)).length ? 'pending' : 'saved');
      if (syncStatus === 'pending') scheduleProgressPersist();
    }
  } catch (error) {
    if (auth.currentUser?.uid === userId && activeUserId === userId) {
      setSyncStatus('error');
      if (retries < 5) scheduleProgressPersist(Math.min(30_000, 1000 * 2 ** retries++));
    }
    throw error;
  } finally { flights.delete(userId); }
}

export function scheduleProgressPersist(delay = 400) {
  if (!auth.currentUser) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistUserStateToSupabase().catch(() => { /* Visible status and durable queue retain the failure. */ });
  }, delay);
}
export function setProgressItem(key: (typeof USER_PROGRESS_KEYS)[number], value: string) {
  safeStorage.setItem(key, value);
  queueProgressItem(key, value);
}
export function removeProgressItem(key: (typeof USER_PROGRESS_KEYS)[number]) {
  safeStorage.removeItem(key);
  queueProgressItem(key, null);
}
function queueProgressItem(key: string, value: string | null) {
  const userId = auth.currentUser?.uid;
  if (!userId || !(CLIENT_PROGRESS_KEYS as readonly string[]).includes(key)) return;
  activeUserId = userId;
  outbox.enqueue(userId, key, value);
  localWrites.set(userId + ':' + key, ++writeRevision);
  retries = 0;
  setSyncStatus('pending');
  scheduleProgressPersist();
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { retries = 0; scheduleProgressPersist(0); });
}
export async function hydrateUserStateFromSupabase(options: { signal?: AbortSignal } = {}): Promise<void> {
  if (options.signal?.aborted) return;
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  activeUserId = userId;
  const revision = ++hydrationRevision;
  const startedAtWrite = writeRevision;
  try {
    await flights.get(userId)?.catch(() => undefined);
    const snapshot = await getDoc(doc(db, 'users', userId, 'private', 'state'));
    if (options.signal?.aborted || auth.currentUser?.uid !== userId || activeUserId !== userId || revision !== hydrationRevision) return;
    const values = snapshot.data()?.values || {};
    const pending = outbox.patch(userId);
    // Read the queue after the request: edits made while loading take precedence.
    USER_PROGRESS_KEYS.forEach(key => {
      if ((localWrites.get(userId + ':' + key) || 0) > startedAtWrite) return;
      const value = Object.hasOwn(pending, key) ? pending[key] : values[key];
      if (typeof value === 'string') safeStorage.setItem(key, value);
      else safeStorage.removeItem(key);
    });
    if (Object.keys(pending).length) { setSyncStatus('pending'); scheduleProgressPersist(); }
    else setSyncStatus('saved');
  } catch {
    if (options.signal?.aborted || auth.currentUser?.uid !== userId || activeUserId !== userId || revision !== hydrationRevision) return;
    for (const [key, value] of Object.entries(outbox.patch(userId))) {
      if (value === null) safeStorage.removeItem(key); else safeStorage.setItem(key, value);
    }
    // A progress read outage must not sign out an otherwise authenticated user.
    setSyncStatus('error');
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


