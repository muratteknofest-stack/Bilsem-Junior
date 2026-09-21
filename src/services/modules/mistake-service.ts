import { BaseQuestion, MistakeItem, Achievement, UserProfile } from '../../types';
import { STORAGE_KEYS } from './shared';
import { safeStorage } from '../../lib/storage';
import { setProgressItem } from './persistence-service';
import { getCurrentUser, setCurrentUser, addXP } from './profile-service';
import { getAchievements, unlockAchievement } from './achievement-service';

export function getMistakes(): MistakeItem[] {
  const raw = safeStorage.getItem(STORAGE_KEYS.MISTAKES);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  setProgressItem(STORAGE_KEYS.MISTAKES, JSON.stringify([]));
  return [];
}

export function addMistake(question: BaseQuestion) {
  // Compatibility no-op. Mistakes are created by the scoring API, which stores
  // the complete question in a server-only vault and returns redacted metadata.
  void question;
}

export function resolveMistake(mistakeId: string): {
  success: boolean;
  unresolvedCount: number;
  newlyUnlocked: Achievement[];
} {
  const mistakes = getMistakes();
  const idx = mistakes.findIndex((m) => m.id === mistakeId);
  const newlyUnlocked: Achievement[] = [];

  if (idx !== -1) {
    mistakes[idx].resolved = true;
    mistakes[idx].resolvedAt = new Date().toLocaleDateString('tr-TR');
    setProgressItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));

    const user = getCurrentUser();
    user.resolvedMistakesCount = (user.resolvedMistakesCount || 0) + 1;
    setCurrentUser(user);

    // Trigger achievement: Hata Avcısı
    const ach1 = unlockAchievement('error_hunter');
    if (ach1) newlyUnlocked.push(ach1);

    // Trigger achievement: Kusursuz Zihin (5 hata)
    const achievements = getAchievements();
    const item5 = achievements.find((a) => a.id === 'mistakes_solved_5');
    if (item5) {
      item5.progress = Math.min(item5.maxProgress, user.resolvedMistakesCount);
      if (user.resolvedMistakesCount >= item5.maxProgress && !item5.unlocked) {
        item5.unlocked = true;
        item5.unlockedAt = new Date().toISOString().split('T')[0];
        if (item5.rewardXP) addXP(item5.rewardXP);
        newlyUnlocked.push(item5);
      }
      setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    }

    // Trigger achievement: Tertemiz Defter (if 0 unresolved mistakes remain)
    const unresolvedLeft = mistakes.filter((m) => !m.resolved).length;
    if (unresolvedLeft === 0) {
      const cleanAch = unlockAchievement('clean_notebook');
      if (cleanAch) newlyUnlocked.push(cleanAch);
    }

    return { success: true, unresolvedCount: unresolvedLeft, newlyUnlocked };
  }
  return { success: false, unresolvedCount: mistakes.filter((m) => !m.resolved).length, newlyUnlocked };
}

export function clearAllMistakes(): {
  unresolvedCount: number;
  newlyUnlocked: Achievement[];
  user: UserProfile;
} {
  const mistakes = getMistakes();
  mistakes.forEach((m) => {
    m.resolved = true;
    m.resolvedAt = new Date().toLocaleDateString('tr-TR');
  });
  setProgressItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));

  const newlyUnlocked: Achievement[] = [];
  const a1 = unlockAchievement('clean_notebook');
  if (a1) newlyUnlocked.push(a1);
  const a2 = unlockAchievement('error_hunter');
  if (a2) newlyUnlocked.push(a2);

  return { unresolvedCount: 0, newlyUnlocked, user: getCurrentUser() };
}
