import { Router } from 'express';
import { z } from 'zod';
import { createLockedAchievements, STORAGE_KEYS, STREAK_MILESTONES } from '../../src/services/modules/shared';
import type { Achievement, CognitiveCategory, MistakeItem, SkillMastery, UserProfile } from '../../src/types';
import { progressLimiter } from '../rate-limiters';
import { activityRetentionExpiresAt } from '../retention';
import {
  getAdminDb,
  requireAppCheck,
  requireFirebaseAuth,
  requireProfileRole,
  type AuthenticatedRequest,
} from '../security';

const progressRoutes = Router();
const guards = [requireFirebaseAuth, requireAppCheck, progressLimiter, requireProfileRole('student')] as const;
const claimSchema = z.object({
  type: z.enum(['streak', 'achievement', 'daily_mission', 'weekly_category', 'weekly_grand']),
  rewardId: z.string().min(1).max(160),
}).strict();

const weeklyTargets: Partial<Record<CognitiveCategory, { target: number; xp: number; title: string }>> = {
  pattern: { target: 8, xp: 120, title: 'Örüntü Şifre Çözücü' },
  matrix: { target: 8, xp: 150, title: 'Matris Zirve Muhafızı' },
  spatial: { target: 6, xp: 140, title: '3B Uzamsal Gezgin' },
  attention: { target: 10, xp: 160, title: 'Kartal Bakışlı Odak' },
  logic: { target: 7, xp: 130, title: 'Bilişsel Mantık Dehası' },
  memory: { target: 6, xp: 120, title: 'Çelik Bellek Ustası' },
  visual_perception: { target: 8, xp: 110, title: 'Görsel Algı Radarı' },
  numerical: { target: 6, xp: 130, title: 'Sayısal Virtüöz' },
};

function parseStored<T>(values: Record<string, unknown>, key: string, fallback: T): T {
  const raw = values[key];
  if (typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function dayInIstanbul(value = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);
}

function weekInIstanbul(value = new Date()): string {
  const date = new Date(`${dayInIstanbul(value)}T00:00:00Z`);
  const dayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function achievementEligible(
  achievement: Achievement,
  profile: UserProfile,
  masteries: SkillMastery[],
  mistakes: MistakeItem[],
): boolean {
  const streakTarget = achievement.id.match(/^streak_(3|5|7|14|30)$/)?.[1];
  if (streakTarget) return profile.streak >= Number(streakTarget);
  const questionTarget = achievement.id === 'first_step'
    ? 1
    : Number(achievement.id.match(/^questions_(10|25|50|100|250)$/)?.[1] || 0);
  if (questionTarget) return Number(profile.totalQuestionsSolved || 0) >= questionTarget;
  if (achievement.id === 'error_hunter') return Number(profile.resolvedMistakesCount || 0) >= 1;
  if (achievement.id === 'mistakes_solved_5') return Number(profile.resolvedMistakesCount || 0) >= 5;
  if (achievement.id === 'clean_notebook') return mistakes.length > 0 && mistakes.every((item) => item.resolved);
  if (achievement.id === 'pattern_master') return Number(masteries.find((item) => item.category === 'pattern')?.correctCount || 0) >= 10;
  if (achievement.id === 'matrix_master') return Number(masteries.find((item) => item.category === 'matrix')?.mastery || 0) >= 70;
  if (achievement.id === 'spatial_hero') return Number(masteries.find((item) => item.category === 'spatial')?.correctCount || 0) >= 10;
  if (achievement.id === 'eagle_eyes') return Number(masteries.find((item) => item.category === 'attention')?.mastery || 0) >= 80;
  if (achievement.id === 'brain_power') return Number(profile.hardCorrectCount || 0) >= 5;
  if (achievement.id === 'exam_finisher') return Number(profile.completedExamCount || 0) >= 1;
  if (achievement.id === 'perfectionist') return Number(profile.perfectSessionCount || 0) >= 1;
  if (achievement.id === 'weekend_warrior') {
    return Boolean(profile.weeklyStreakHistory?.[5] && profile.weeklyStreakHistory?.[6]);
  }
  return false;
}

function rewardFor(
  type: z.infer<typeof claimSchema>['type'],
  rewardId: string,
  profile: UserProfile,
  values: Record<string, unknown>,
): { claimKey: string; xp: number; title: string; streakDay?: number } | null {
  const today = dayInIstanbul();
  const weekId = weekInIstanbul();
  const masteries = parseStored<SkillMastery[]>(values, STORAGE_KEYS.MASTERY, []);
  const mistakes = parseStored<MistakeItem[]>(values, STORAGE_KEYS.MISTAKES, []);

  if (type === 'streak') {
    const day = Number(rewardId);
    const milestone = STREAK_MILESTONES.find((item) => item.day === day);
    if (!milestone || profile.streak < day) return null;
    return { claimKey: `streak:${day}`, xp: milestone.xpReward, title: milestone.title, streakDay: day };
  }

  if (type === 'achievement') {
    const achievement = createLockedAchievements().find((item) => item.id === rewardId);
    if (!achievement || !achievementEligible(achievement, profile, masteries, mistakes)) return null;
    return {
      claimKey: `achievement:${achievement.id}`,
      xp: Math.max(0, Number(achievement.rewardXP || 0)),
      title: achievement.title,
    };
  }

  if (type === 'daily_mission') {
    if (profile.lastPracticeDay !== today) return null;
    const missions: Record<string, { eligible: boolean; xp: number; title: string }> = {
      m1: { eligible: Number(profile.todayQuestionsSolved || 0) >= 5, xp: 30, title: 'Bugün 5 soru' },
      m2: { eligible: Number(profile.todayCategoryQuestions?.matrix || 0) >= 2, xp: 40, title: 'Matris görevi' },
      m3: { eligible: Number(profile.todayMistakesResolved || 0) >= 1, xp: 50, title: 'Hata telafisi' },
    };
    const mission = missions[rewardId];
    if (!mission?.eligible) return null;
    return { claimKey: `daily:${today}:${rewardId}`, xp: mission.xp, title: mission.title };
  }

  if (profile.progressWeekId !== weekId) return null;
  if (type === 'weekly_category') {
    const match = rewardId.match(/^challenge-(\d{4}-W\d{2})-([a-z_]+)$/);
    const category = match?.[2] as CognitiveCategory | undefined;
    const config = category ? weeklyTargets[category] : undefined;
    if (!match || match[1] !== weekId || !category || !config) return null;
    if (Number(profile.weeklyCategoryQuestions?.[category] || 0) < config.target) return null;
    return { claimKey: `weekly:${weekId}:${category}`, xp: config.xp, title: config.title };
  }

  const completedCategories = Object.entries(weeklyTargets)
    .filter(([category, config]) => Number(profile.weeklyCategoryQuestions?.[category as CognitiveCategory] || 0) >= config!.target)
    .length;
  if (type === 'weekly_grand' && rewardId === `grand-challenge-${weekId}` && completedCategories >= 6) {
    return { claimKey: `weekly:${weekId}:grand`, xp: 500, title: 'BİLSEM Haftalık Grand Şampiyon' };
  }
  return null;
}

progressRoutes.post('/progress/rewards/claim', ...guards, async (req: AuthenticatedRequest, res) => {
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) return res.status(400).json({ error: 'Ödül talebi geçersiz.' });
  try {
    const db = getAdminDb();
    const userRef = db.doc(`users/${req.authUser.uid}`);
    const stateRef = db.doc(`users/${req.authUser.uid}/private/state`);
    const result = await db.runTransaction(async (transaction) => {
      const [userSnapshot, stateSnapshot] = await Promise.all([
        transaction.get(userRef), transaction.get(stateRef),
      ]);
      const profile = userSnapshot.data() as UserProfile | undefined;
      if (!profile || profile.role !== 'student') throw new Error('STUDENT_NOT_FOUND');
      const state = stateSnapshot.data() || {};
      const values = { ...((state.values || {}) as Record<string, unknown>) };
      const reward = rewardFor(parsed.data.type, parsed.data.rewardId, profile, values);
      if (!reward) throw new Error('REWARD_NOT_EARNED');
      const claims = Array.isArray(state.serverRewardClaims) ? [...state.serverRewardClaims] as string[] : [];
      if (claims.includes(reward.claimKey)) throw new Error('REWARD_ALREADY_CLAIMED');

      const now = Date.now();
      const xp = Math.max(0, Number(profile.xp || 0)) + reward.xp;
      const profileUpdate: Partial<UserProfile> = { xp, level: Math.floor(xp / 250) + 1, updatedAt: now };
      if (reward.streakDay) {
        profileUpdate.claimedStreakDays = [...new Set([...(profile.claimedStreakDays || []), reward.streakDay])];
        if (STREAK_MILESTONES.find((item) => item.day === reward.streakDay)?.rewardType === 'shield') {
          profileUpdate.streakFreezeCount = Number(profile.streakFreezeCount || 0) + 1;
        }
      }

      transaction.update(userRef, profileUpdate);
      transaction.set(stateRef, {
        serverRewardClaims: [...claims, reward.claimKey].slice(-1000),
        updatedAt: now,
      }, { merge: true });
      transaction.create(db.collection('progressEvents').doc(), {
        userId: req.authUser!.uid,
        type: 'reward_claimed',
        rewardType: parsed.data.type,
        rewardId: parsed.data.rewardId,
        claimKey: reward.claimKey,
        xpAwarded: reward.xp,
        occurredAt: now,
        expiresAt: activityRetentionExpiresAt(now),
      });
      return { success: true, xpAwarded: reward.xp, title: reward.title, profile: { ...profile, ...profileUpdate } };
    });
    return res.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'REWARD_ALREADY_CLAIMED') return res.status(409).json({ error: 'Bu ödül daha önce alındı.' });
    if (code === 'REWARD_NOT_EARNED') return res.status(403).json({ error: 'Bu ödül için doğrulanmış ilerleme henüz yeterli değil.' });
    if (code === 'STUDENT_NOT_FOUND') return res.status(404).json({ error: 'Öğrenci profili bulunamadı.' });
    console.error('[Progress] reward claim failed:', error);
    return res.status(500).json({ error: 'Ödül güvenli biçimde verilemedi.' });
  }
});

export default progressRoutes;
