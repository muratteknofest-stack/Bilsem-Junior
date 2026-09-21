import { Achievement, UserProfile } from '../../types';
import { STORAGE_KEYS, INITIAL_ACHIEVEMENTS, createLockedAchievements } from './shared';
import { safeStorage } from '../../lib/storage';
import { setProgressItem } from './persistence-service';
import { getCurrentUser, setCurrentUser, addXP } from './profile-service';
import { getMistakes } from './mistake-service';
import { getSkillMasteries } from './mastery-service';

export function getAchievements(): Achievement[] {
  const raw = safeStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
  if (raw) {
    try {
      const stored: Achievement[] = JSON.parse(raw);
      let changed = false;
      const lockedDefinitions = createLockedAchievements();
      lockedDefinitions.forEach((initAch) => {
        const exists = stored.find((s) => s.id === initAch.id);
        if (!exists) {
          stored.push({ ...initAch });
          changed = true;
        } else {
          if (exists.tier !== initAch.tier && initAch.tier) { exists.tier = initAch.tier; changed = true; }
          if (exists.rarityLabel !== initAch.rarityLabel && initAch.rarityLabel) { exists.rarityLabel = initAch.rarityLabel; changed = true; }
          if (exists.pedagogyNote !== initAch.pedagogyNote && initAch.pedagogyNote) { exists.pedagogyNote = initAch.pedagogyNote; changed = true; }
          if (exists.criteriaLabel !== initAch.criteriaLabel && initAch.criteriaLabel) { exists.criteriaLabel = initAch.criteriaLabel; changed = true; }
          if (exists.rewardXP === undefined && initAch.rewardXP) { exists.rewardXP = initAch.rewardXP; changed = true; }
          if (exists.badgeIcon === undefined && initAch.badgeIcon) { exists.badgeIcon = initAch.badgeIcon; changed = true; }
          if (exists.title !== initAch.title) { exists.title = initAch.title; changed = true; }
          if (exists.description !== initAch.description) { exists.description = initAch.description; changed = true; }
        }
      });
      if (changed) setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(stored));
      return stored;
    } catch {}
  }
  const initial = createLockedAchievements();
  setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(initial));
  return initial;
}

export function unlockAchievement(id: string): Achievement | null {
  const items = getAchievements();
  const idx = items.findIndex((a) => a.id === id);
  if (idx !== -1 && !items[idx].unlocked) {
    items[idx].unlocked = true;
    items[idx].unlockedAt = new Date().toISOString().split('T')[0];
    items[idx].progress = items[idx].maxProgress;
    if (items[idx].rewardXP && !items[idx].rewardClaimed) {
      items[idx].rewardClaimed = true;
      addXP(items[idx].rewardXP);
    }
    setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(items));
    return items[idx];
  }
  return null;
}

export function claimBadgeReward(id: string): { success: boolean; xpAwarded: number; achievement: Achievement | null; user: UserProfile } {
  const items = getAchievements();
  const idx = items.findIndex((a) => a.id === id);
  if (idx !== -1 && items[idx].unlocked && !items[idx].rewardClaimed) {
    items[idx].rewardClaimed = true;
    const xp = items[idx].rewardXP || 50;
    addXP(xp);
    setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(items));
    return { success: true, xpAwarded: xp, achievement: items[idx], user: getCurrentUser() };
  }
  return { success: false, xpAwarded: 0, achievement: items[idx] || null, user: getCurrentUser() };
}

export function equipBadge(badgeId: string): { success: boolean; user: UserProfile; message?: string } {
  const user = getCurrentUser();
  const achievements = getAchievements();
  const badge = achievements.find((a) => a.id === badgeId);

  if (!badge || !badge.unlocked) return { success: false, user, message: 'Bu rozet henüz kazanılmadı.' };

  const currentFeatured = [...(user.featuredBadgeIds || [])];
  if (currentFeatured.includes(badgeId)) return { success: true, user };

  if (currentFeatured.length >= 3) currentFeatured.shift();
  currentFeatured.push(badgeId);

  user.featuredBadgeIds = currentFeatured;
  setCurrentUser(user);
  return { success: true, user };
}

export function unequipBadge(badgeId: string): { success: boolean; user: UserProfile } {
  const user = getCurrentUser();
  const currentFeatured = (user.featuredBadgeIds || []).filter((id) => id !== badgeId);
  user.featuredBadgeIds = currentFeatured;
  setCurrentUser(user);
  return { success: true, user };
}

export function syncBadgesWithProgress(): Achievement[] {
  const user = getCurrentUser();
  const achievements = getAchievements();
  const mistakes = getMistakes();
  const masteries = getSkillMasteries();
  let changed = false;

  const streak = user.streak || 0;
  const streakMap: Record<string, number> = { streak_3: 3, streak_5: 5, streak_7: 7, streak_14: 14, streak_30: 30 };
  Object.entries(streakMap).forEach(([id, target]) => {
    const b = achievements.find((a) => a.id === id);
    if (b) {
      b.progress = Math.min(b.maxProgress, streak);
      if (streak >= target && !b.unlocked) { b.unlocked = true; b.unlockedAt = new Date().toISOString().split('T')[0]; changed = true; }
    }
  });

  const qCount = user.totalQuestionsSolved || 0;
  const qMap: Record<string, number> = { first_step: 1, questions_10: 10, questions_25: 25, questions_50: 50, questions_100: 100, questions_250: 250 };
  Object.entries(qMap).forEach(([id, target]) => {
    const b = achievements.find((a) => a.id === id);
    if (b) {
      b.progress = Math.min(b.maxProgress, qCount);
      if (qCount >= target && !b.unlocked) { b.unlocked = true; b.unlockedAt = new Date().toISOString().split('T')[0]; changed = true; }
    }
  });

  const resolvedCount = user.resolvedMistakesCount || 0;
  const m5 = achievements.find((a) => a.id === 'mistakes_solved_5');
  if (m5) {
    m5.progress = Math.min(m5.maxProgress, resolvedCount);
    if (resolvedCount >= m5.maxProgress && !m5.unlocked) { m5.unlocked = true; m5.unlockedAt = new Date().toISOString().split('T')[0]; changed = true; }
  }

  const unresolvedLeft = mistakes.filter((m) => !m.resolved).length;
  if (unresolvedLeft === 0 && mistakes.length > 0) {
    const cleanB = achievements.find((a) => a.id === 'clean_notebook');
    if (cleanB && !cleanB.unlocked) { cleanB.unlocked = true; cleanB.progress = 1; cleanB.unlockedAt = new Date().toISOString().split('T')[0]; changed = true; }
  }

  const matrixMastery = masteries.find((m) => m.category === 'matrix')?.mastery || 0;
  const mmB = achievements.find((a) => a.id === 'matrix_master');
  if (mmB) {
    mmB.progress = matrixMastery;
    if (matrixMastery >= mmB.maxProgress && !mmB.unlocked) { mmB.unlocked = true; mmB.unlockedAt = new Date().toISOString().split('T')[0]; changed = true; }
  }

  const attentionMastery = masteries.find((m) => m.category === 'attention')?.mastery || 0;
  const eeB = achievements.find((a) => a.id === 'eagle_eyes');
  if (eeB) {
    eeB.progress = attentionMastery;
    if (attentionMastery >= eeB.maxProgress && !eeB.unlocked) { eeB.unlocked = true; eeB.unlockedAt = new Date().toISOString().split('T')[0]; changed = true; }
  }

  if (changed) setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  return achievements;
}

export function upsertAchievement(achievement: Achievement): void {
  const achievements = getAchievements();
  const existingIndex = achievements.findIndex((item) => item.id === achievement.id);
  if (existingIndex >= 0) achievements[existingIndex] = { ...achievements[existingIndex], ...achievement };
  else achievements.unshift(achievement);
  setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
}
