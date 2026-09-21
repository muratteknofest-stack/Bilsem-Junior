import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { safeStorage } from '../../lib/storage';
import { STORAGE_KEYS } from './shared';
import { UserProfile, UserRole } from '../../types';
import { clearUserProgress } from './persistence-service';

export function syncUserFromFirebase(profile: UserProfile | null) {
  if (profile) {
    safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(profile));
    safeStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
  } else {
    safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    safeStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
}

export async function _updateFirebaseProfile(updates: Partial<UserProfile>) {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'users', auth.currentUser.uid);
    const browserMutableFields = new Set<keyof UserProfile>([
      'name', 'grade', 'avatar', 'dailyGoalMinutes', 'dailyGoalQuestions',
      'dailyGoalSessions', 'soundEnabled', 'reminderConfig', 'featuredBadgeIds',
    ]);
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key, value]) => (
        value !== undefined && browserMutableFields.has(key as keyof UserProfile)
      )),
    );
    if (Object.keys(definedUpdates).length === 0) return;
    await updateDoc(ref, { ...definedUpdates, updatedAt: Date.now() });
  } catch (e) {
    console.error('Failed to update firebase', e);
  }
}

export function getCurrentUser(): UserProfile {
  const raw = safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (raw) {
    try {
      let parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error('Invalid profile');
      if (!parsed.claimedStreakDays) parsed.claimedStreakDays = [];
      if (parsed.streakFreezeCount === undefined) parsed.streakFreezeCount = 0;
      if (parsed.longestStreak === undefined) parsed.longestStreak = parsed.streak || 0;
      if (parsed.totalQuestionsSolved === undefined) parsed.totalQuestionsSolved = 0;
      if (parsed.resolvedMistakesCount === undefined) parsed.resolvedMistakesCount = 0;
      if (parsed.dailyGoalQuestions === undefined) parsed.dailyGoalQuestions = 10;
      if (parsed.todayQuestionsSolved === undefined) parsed.todayQuestionsSolved = 0;
      if (parsed.dailyGoalSessions === undefined) parsed.dailyGoalSessions = 2;
      if (parsed.todaySessionsCompleted === undefined) parsed.todaySessionsCompleted = 0;
      if (!parsed.weeklyStreakHistory) parsed.weeklyStreakHistory = [false, false, false, false, false, false, false];
      return parsed;
    } catch {}
  }
  return {
    id: 'guest', name: 'Misafir', role: 'student', avatar: '🦊', grade: 1,
    level: 1, xp: 0, streak: 0, lastActiveDate: '', dailyGoalMinutes: 15,
    todayMinutesSpent: 0, soundEnabled: true, totalQuestionsSolved: 0,
    todayQuestionsSolved: 0, dailyGoalQuestions: 10, dailyGoalSessions: 2,
    todaySessionsCompleted: 0,
  };
}

export function setCurrentUser(user: UserProfile) {
  safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  const {
    avatar, dailyGoalMinutes, dailyGoalQuestions, dailyGoalSessions, soundEnabled,
    featuredBadgeIds, reminderConfig,
  } = user;
  void _updateFirebaseProfile({
    avatar, dailyGoalMinutes, dailyGoalQuestions, dailyGoalSessions, soundEnabled,
    featuredBadgeIds, reminderConfig,
  });
}

export function isAuthenticated(): boolean {
  const current = getCurrentUser();
  return auth.currentUser !== null
    && current.id === auth.currentUser.uid
    && safeStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true';
}

export function loginAs(role: UserRole, customUser?: UserProfile): UserProfile {
  if (!customUser || customUser.role !== role) {
    throw new Error('Kimliği doğrulanmamış yerel oturum engellendi.');
  }
  if (customUser.id !== auth.currentUser?.uid) {
    throw new Error('Kimliği doğrulanmamış yerel oturum engellendi.');
  }
  const previous = safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (previous) {
    try {
      if ((JSON.parse(previous) as UserProfile).id !== customUser.id) clearUserProgress();
    } catch { clearUserProgress(); }
  }
  const user = customUser;
  safeStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
  setCurrentUser(user);
  return user;
}

export function logout(): void {
  safeStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  clearUserProgress();
}

export function addXP(amount: number): { newXP: number; newLevel: number; leveledUp: boolean } {
  const user = getCurrentUser();
  // XP is awarded only by trusted scoring and reward endpoints. Keep this
  // compatibility function side-effect free so legacy UI cannot mint progress.
  void amount;
  return { newXP: user.xp, newLevel: user.level, leveledUp: false };
}
