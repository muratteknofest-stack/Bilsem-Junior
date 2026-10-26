import type { Achievement, UserProfile, SkillMastery, MistakeItem } from '../src/types';
import { INITIAL_ACHIEVEMENTS, STREAK_MILESTONES } from '../src/services/modules/shared';
import { LearningError } from './learning-model';
import { isAvailableCategory } from '../src/features/student/available-categories';
import { z } from 'zod';
import { WEEKLY_GRAND_REWARD_ID, weeklyGrandRewardKey } from '../src/lib/weekly-grand-reward';

export const rewardClaimSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.enum(['badge', 'streak', 'mission', 'weekly']), id: z.string().min(1).max(80) }).strict(),
  z.object({ kind: z.literal('grand'), id: z.literal(WEEKLY_GRAND_REWARD_ID) }).strict(),
]);

export interface RewardFacts { answered: number; correctCategories: Record<string, number>; hardCorrect: number; reviewToday: number; exams: number; perfect: number; weekend: number; }
export interface RewardProgress { masteries: SkillMastery[]; mistakes: MistakeItem[]; categories: { day?: string; weekStart?: string; counts?: Record<string, number>; todayCounts?: Record<string, number> }; }
export const WEEKLY_TARGETS: Record<string, { count: number; xp: number }> = { pattern: { count: 8, xp: 120 }, matrix: { count: 8, xp: 150 }, spatial: { count: 6, xp: 140 }, attention: { count: 10, xp: 160 }, logic: { count: 7, xp: 130 }, visual_perception: { count: 8, xp: 110 }, numerical: { count: 6, xp: 130 } };
export function rewardDates(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(now);
  const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return { day, week: date.toISOString().slice(0, 10) };
}
export function eligibleReward(kind: string, id: string, user: UserProfile, facts: RewardFacts, progress: RewardProgress, now = new Date()): { key: string; xp: number; badge: Achievement | null; streakDay: number | null } {
  if (!rewardClaimSchema.safeParse({ kind, id }).success) throw new LearningError('Ödül isteği geçersiz.', 400);
  const { day, week } = rewardDates(now);
  let eligible = false, xp = 0, badge: Achievement | null = null, key = `${kind}:${id}`, streakDay: number | null = null;
  const correct = (category: string) => facts.correctCategories[category] || 0;
  const mastery = (category: string) => progress.masteries.find(m => m.category === category)?.mastery || 0;
  if (kind === 'streak' || kind === 'badge' && id.startsWith('streak_')) {
    const milestone = STREAK_MILESTONES.find(m => m.day === Number(kind === 'streak' ? id : id.slice(7)));
    if (milestone) { eligible = facts.answered > 0 && user.streak >= milestone.day; xp = milestone.xpReward; streakDay = milestone.day; key = `badge:streak_${milestone.day}`; badge = INITIAL_ACHIEVEMENTS.find(b => b.id === `streak_${milestone.day}`)!; }
  } else if (kind === 'badge') {
    badge = INITIAL_ACHIEVEMENTS.find(b => b.id === id) || null;
    xp = badge?.rewardXP || 0;
    const countTargets: Record<string, number> = { first_step: 1, questions_10: 10, questions_25: 25, questions_50: 50, questions_100: 100, questions_250: 250 };
    eligible = id in countTargets ? facts.answered >= countTargets[id] :
      id === 'weekend_warrior' ? facts.weekend >= 2 : id === 'error_hunter' ? user.resolvedMistakesCount! >= 1 :
      id === 'mistakes_solved_5' ? user.resolvedMistakesCount! >= 5 : id === 'clean_notebook' ? progress.mistakes.length > 0 && progress.mistakes.every(m => m.resolved) :
      id === 'pattern_master' ? correct('pattern') >= 10 : id === 'spatial_hero' ? correct('spatial') >= 10 :
      id === 'matrix_master' ? correct('matrix') > 0 && mastery('matrix') >= 70 : id === 'eagle_eyes' ? correct('attention') > 0 && mastery('attention') >= 80 :
      id === 'brain_power' ? facts.hardCorrect >= 5 : id === 'exam_finisher' ? facts.exams > 0 : id === 'perfectionist' ? facts.perfect > 0 : false;
  } else if (kind === 'mission') {
    key = `mission:${day}:${id}`;
    const counts = progress.categories.day === day ? progress.categories.todayCounts || {} : {};
    eligible = id === 'm1' ? Object.values(counts).reduce((n, v) => n + v, 0) >= 5 : id === 'm2' ? (counts.matrix || 0) >= 2 : id === 'm3' ? facts.reviewToday > 0 : false;
    xp = ({ m1: 30, m2: 40, m3: 50 } as Record<string, number>)[id] || 0;
  } else if (kind === 'weekly' || kind === 'grand') {
    const counts = progress.categories.weekStart === week ? progress.categories.counts || {} : {};
    if (kind === 'weekly' && isAvailableCategory(id) && WEEKLY_TARGETS[id]) { eligible = (counts[id] || 0) >= WEEKLY_TARGETS[id].count; xp = WEEKLY_TARGETS[id].xp; }
    if (kind === 'grand') { eligible = Object.entries(WEEKLY_TARGETS).filter(([c, t]) => (counts[c] || 0) >= t.count).length >= 6; xp = 500; }
    key = kind === 'grand' ? weeklyGrandRewardKey(week) : `weekly:${week}:${id}`;
  }
  if (!eligible || !xp) throw new LearningError('Bu ödül için gereken doğrulanmış çalışma henüz tamamlanmadı.');
  return { key, xp, badge, streakDay };
}
