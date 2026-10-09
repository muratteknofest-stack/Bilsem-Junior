import { doc, updateDoc } from '../../lib/supabase-data';
import { db, auth } from '../../lib/platform';
import { safeStorage } from '../../lib/storage';
import { STORAGE_KEYS } from './shared';
import { UserProfile, UserRole } from '../../types';
import { clearUserProgress } from './persistence-service';
import { safeXpAward } from '../../features/student/gamification-model';

export function syncUserFromSupabase(profile: UserProfile | null) {
  if (profile) {
    safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(profile));
    safeStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
  } else {
    safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    safeStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
}

export async function _updateSupabaseProfile(updates: Partial<UserProfile>) {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'users', auth.currentUser.uid);
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );
    await updateDoc(ref, { ...definedUpdates, updatedAt: Date.now() });
  } catch (e) {
    console.error('Supabase profil güncellemesi başarısız:', e);
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
      if (Number.isFinite(parsed.xp)) parsed.totalPoints = Math.max(0, Math.floor(parsed.xp));
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
    level: 1, xp: 0, totalPoints: 0, streak: 0, lastActiveDate: '', dailyGoalMinutes: 15,
    todayMinutesSpent: 0, soundEnabled: true, totalQuestionsSolved: 0,
    todayQuestionsSolved: 0, dailyGoalQuestions: 10, dailyGoalSessions: 2,
    todaySessionsCompleted: 0,
  };
}

export function setCurrentUser(user: UserProfile) {
  safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  const {
    avatar, level, xp, totalPoints, streak, longestStreak, lastActiveDate, todayPracticed,
    streakFreezeCount, claimedStreakDays, weeklyStreakHistory, dailyGoalMinutes,
    todayMinutesSpent, dailyGoalQuestions, todayQuestionsSolved, dailyGoalSessions,
    todaySessionsCompleted, soundEnabled, totalQuestionsSolved, resolvedMistakesCount,
    featuredBadgeIds, reminderConfig,
  } = user;
  void _updateSupabaseProfile({
    avatar, level, xp, totalPoints, streak, longestStreak, lastActiveDate, todayPracticed,
    streakFreezeCount, claimedStreakDays, weeklyStreakHistory, dailyGoalMinutes,
    todayMinutesSpent, dailyGoalQuestions, todayQuestionsSolved, dailyGoalSessions,
    todaySessionsCompleted, soundEnabled, totalQuestionsSolved, resolvedMistakesCount,
    featuredBadgeIds, reminderConfig,
  });
}

export function isAuthenticated(): boolean {
  const current = getCurrentUser();
  if (current?.id?.startsWith('demo_') && safeStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true') {
    return true;
  }
  return auth.currentUser !== null && safeStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true';
}

export function loginAs(role: UserRole, customUser?: UserProfile): UserProfile {
  if (!customUser) {
    throw new Error('Kimliği doğrulanmamış yerel oturum engellendi.');
  }

  if (!customUser.id?.startsWith('demo_') && role !== customUser.role) {
    throw new Error('Hesap rolü profil ile eşleşmiyor.');
  }
  const user: UserProfile = {
    ...customUser,
    role: role,
  };

  if (
    user.id !== auth.currentUser?.uid && 
    !user.id?.startsWith('demo_')
  ) {
    throw new Error('Kimliği doğrulanmamış yerel oturum engellendi.');
  }

  const previous = safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (previous) {
    try {
      if ((JSON.parse(previous) as UserProfile).id !== user.id) clearUserProgress();
    } catch { clearUserProgress(); }
  }

  safeStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
  setCurrentUser(user);
  return user;
}

export function switchActiveRole(newRole: UserRole): UserProfile {
  const current = getCurrentUser();
  if (!current.id?.startsWith('demo_')) throw new Error('Gerçek hesap rolü değiştirilemez.');
  const updatedUser: UserProfile = {
    ...current,
    role: newRole,
  };
  safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  return updatedUser;
}

export function logout(): void {
  safeStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  clearUserProgress();
}

export function addXP(amount: number): { newXP: number; newLevel: number; leveledUp: boolean } {
  const user = getCurrentUser();
  const currentXP = Number.isFinite(user.xp) ? Math.max(0, Math.floor(user.xp)) : 0;
  const oldLevel = Math.floor(currentXP / 250) + 1;
  const newXP = Math.min(Number.MAX_SAFE_INTEGER, currentXP + safeXpAward(amount));
  const newLevel = Math.floor(newXP / 250) + 1;
  if (newXP !== currentXP || user.totalPoints !== newXP || user.level !== newLevel) {
    user.xp = newXP;
    user.totalPoints = newXP;
    user.level = newLevel;
    setCurrentUser(user);
  }
  return { newXP, newLevel, leveledUp: newLevel > oldLevel };
}

