import { CognitiveCategory, UserProfile, LeaderboardPeriod, LeaderboardEntry, WeeklyQuestionProgressData, DayQuestionStats, PastWeekTrendItem, DailyStudyPlan, Achievement } from '../../types';
import { STORAGE_KEYS } from './shared';
import { safeStorage } from '../../lib/storage';
import { setProgressItem } from './persistence-service';
import { getCurrentUser, setCurrentUser, addXP } from './profile-service';
import { getSkillMasteries } from './mastery-service';
import { markPracticeForToday } from './streak-service';
import { getAchievements } from './achievement-service';

export function updateWeeklyCategoryProgress(category: CognitiveCategory, count: number = 1) {
  const raw = safeStorage.getItem(STORAGE_KEYS.WEEKLY_CATEGORIES);
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    if (!state || !Array.isArray(state.challenges)) return;
    const ch = state.challenges.find((c: any) => c.category === category);
    if (ch) {
      ch.completedQuestions = Math.min(ch.targetQuestions, (ch.completedQuestions || 0) + count);
      ch.isCompleted = ch.completedQuestions >= ch.targetQuestions;
      state.totalQuestionsCompleted = state.challenges.reduce((acc: number, c: any) => acc + (c.completedQuestions || 0), 0);
      state.completedChallengesCount = state.challenges.filter((c: any) => c.isCompleted).length;
      if (state.grandChallenge) {
        state.grandChallenge.isCompleted = state.completedChallengesCount >= (state.grandChallenge.requiredCategoriesCount || 6);
      }
      setProgressItem(STORAGE_KEYS.WEEKLY_CATEGORIES, JSON.stringify(state));
    }
  } catch {}
}

export function getWeekStartKey(date = new Date()): string {
  const monday = new Date(date);
  const dayIndex = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dayIndex);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function getDefaultWeeklyQuestionsData(user: UserProfile, todayIdx: number) {
  const thisWeek = [0, 0, 0, 0, 0, 0, 0];
  const lastWeek = [0, 0, 0, 0, 0, 0, 0];
  if (user.todayPracticed) thisWeek[todayIdx] = user.todayQuestionsSolved || 0;

  return {
    thisWeekDays: thisWeek,
    lastWeekDays: lastWeek,
    pastWeeks: [0, 0],
    weekStart: getWeekStartKey(),
  };
}

export function rollWeeklyQuestionData(data: any) {
  const currentWeekStart = getWeekStartKey();
  if (data.weekStart === currentWeekStart) return data;

  const priorWeekStart = typeof data.weekStart === 'string'
    ? new Date(`${data.weekStart}T00:00:00`).getTime()
    : Number.NaN;
  const currentWeekTime = new Date(`${currentWeekStart}T00:00:00`).getTime();
  const isImmediatelyPreviousWeek = Number.isFinite(priorWeekStart)
    && Math.round((currentWeekTime - priorWeekStart) / 86_400_000) === 7;
  const completedWeekTotal = Array.isArray(data.thisWeekDays)
    ? data.thisWeekDays.reduce((sum: number, count: unknown) => sum + (Number(count) || 0), 0)
    : 0;

  return {
    thisWeekDays: [0, 0, 0, 0, 0, 0, 0],
    lastWeekDays: isImmediatelyPreviousWeek && Array.isArray(data.thisWeekDays)
      ? [...data.thisWeekDays]
      : [0, 0, 0, 0, 0, 0, 0],
    pastWeeks: isImmediatelyPreviousWeek
      ? [data.pastWeeks?.[1] || 0, completedWeekTotal]
      : [0, 0],
    weekStart: currentWeekStart,
  };
}

export function getWeeklyQuestionProgressData(passedUser?: UserProfile, remoteData?: unknown): WeeklyQuestionProgressData {
  const user = passedUser || getCurrentUser();
  const raw = remoteData ? JSON.stringify(remoteData) : safeStorage.getItem(STORAGE_KEYS.WEEKLY_QUESTIONS);
  
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;

  let data: { thisWeekDays: number[]; lastWeekDays: number[]; pastWeeks: number[]; weekStart?: string; };

  if (raw) {
    try {
      data = JSON.parse(raw);
      if (!Array.isArray(data.thisWeekDays) || data.thisWeekDays.length !== 7) {
        data = getDefaultWeeklyQuestionsData(user, todayIdx);
      }
    } catch {
      data = getDefaultWeeklyQuestionsData(user, todayIdx);
    }
  } else {
    data = getDefaultWeeklyQuestionsData(user, todayIdx);
    setProgressItem(STORAGE_KEYS.WEEKLY_QUESTIONS, JSON.stringify(data));
  }

  const rolledData = rollWeeklyQuestionData(data);
  if (rolledData !== data) {
    data = rolledData;
    if (!remoteData) setProgressItem(STORAGE_KEYS.WEEKLY_QUESTIONS, JSON.stringify(data));
  }

  const DAY_CONFIG = [
    { dayIndex: 0, dayName: 'Pazartesi', shortDay: 'Pzt' },
    { dayIndex: 1, dayName: 'Salı', shortDay: 'Sal' },
    { dayIndex: 2, dayName: 'Çarşamba', shortDay: 'Çar' },
    { dayIndex: 3, dayName: 'Perşembe', shortDay: 'Per' },
    { dayIndex: 4, dayName: 'Cuma', shortDay: 'Cum' },
    { dayIndex: 5, dayName: 'Cumartesi', shortDay: 'Cmt' },
    { dayIndex: 6, dayName: 'Pazar', shortDay: 'Paz' },
  ];

  const dailyStats: DayQuestionStats[] = DAY_CONFIG.map((d) => ({
    dayIndex: d.dayIndex,
    dayName: d.dayName,
    shortDay: d.shortDay,
    thisWeek: data.thisWeekDays[d.dayIndex] || 0,
    lastWeek: data.lastWeekDays[d.dayIndex] || 0,
    isToday: d.dayIndex === todayIdx,
  }));

  const thisWeekTotal = data.thisWeekDays.reduce((a, b) => a + b, 0);
  const lastWeekTotal = data.lastWeekDays.reduce((a, b) => a + b, 0);
  const difference = thisWeekTotal - lastWeekTotal;
  const percentChange = lastWeekTotal > 0 ? Math.round((difference / lastWeekTotal) * 100) : thisWeekTotal > 0 ? 100 : 0;
  const direction: 'up' | 'down' | 'same' = difference > 0 ? 'up' : difference < 0 ? 'down' : 'same';
  const activeDaysCount = Math.max(1, todayIdx + 1);
  const dailyAverage = Math.round((thisWeekTotal / activeDaysCount) * 10) / 10;

  let bestDay = { dayName: 'Pazartesi', shortDay: 'Pzt', count: 0 };
  dailyStats.forEach((d) => {
    if (d.thisWeek > bestDay.count) { bestDay = { dayName: d.dayName, shortDay: d.shortDay, count: d.thisWeek }; }
  });

  const weeklyTarget = 50;
  const targetCompletionRate = Math.min(100, Math.round((thisWeekTotal / weeklyTarget) * 100));

  const fourWeeksTrend: PastWeekTrendItem[] = [
    { id: 'w-1', weekLabel: '3 Hafta Önce', shortLabel: '1. Hafta', dateRange: '3 Hafta Önce', totalQuestions: data.pastWeeks?.[0] ?? 0, targetGoal: 45, isCurrentWeek: false },
    { id: 'w-2', weekLabel: '2 Hafta Önce', shortLabel: '2. Hafta', dateRange: '2 Hafta Önce', totalQuestions: data.pastWeeks?.[1] ?? 0, targetGoal: 45, isCurrentWeek: false },
    { id: 'w-3', weekLabel: 'Geçen Hafta', shortLabel: 'Geçen Hafta', dateRange: 'Geçen Hafta', totalQuestions: lastWeekTotal, targetGoal: 50, isCurrentWeek: false },
    { id: 'w-4', weekLabel: 'Bu Hafta', shortLabel: 'Bu Hafta', dateRange: 'Güncel Hafta', totalQuestions: thisWeekTotal, targetGoal: 50, isCurrentWeek: true },
  ];

  return {
    summary: { thisWeekTotal, lastWeekTotal, difference, percentChange, direction, weeklyTarget, targetCompletionRate, dailyAverage, bestDay },
    dailyStats, fourWeeksTrend,
    allTimeTotal: Math.max(user.totalQuestionsSolved || 0, thisWeekTotal),
  };
}

export function incrementWeeklyQuestionCount() {
  try {
    const now = new Date();
    const todayIdx = (now.getDay() + 6) % 7;
    const raw = safeStorage.getItem(STORAGE_KEYS.WEEKLY_QUESTIONS);
    let data: any;
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = getDefaultWeeklyQuestionsData(getCurrentUser(), todayIdx); }
    } else {
      data = getDefaultWeeklyQuestionsData(getCurrentUser(), todayIdx);
    }
    if (!Array.isArray(data.thisWeekDays) || data.thisWeekDays.length !== 7) {
      data.thisWeekDays = [0, 0, 0, 0, 0, 0, 0];
    }
    data = rollWeeklyQuestionData(data);
    data.thisWeekDays[todayIdx] = (data.thisWeekDays[todayIdx] || 0) + 1;
    setProgressItem(STORAGE_KEYS.WEEKLY_QUESTIONS, JSON.stringify(data));
  } catch {}
}

export function recordQuestionSolved(isCorrect: boolean = true, category?: CognitiveCategory): {
  user: UserProfile;
  newlyUnlocked: Achievement[];
  totalSolved: number;
} {
  const user = getCurrentUser();
  markPracticeForToday(user, 0);
  user.totalQuestionsSolved = (user.totalQuestionsSolved || 0) + 1;
  user.todayQuestionsSolved = (user.todayQuestionsSolved || 0) + 1;
  setCurrentUser(user);

  if (category) updateWeeklyCategoryProgress(category, 1);

  const newlyUnlocked: Achievement[] = [];
  const achievements = getAchievements();
  const qCount = user.totalQuestionsSolved;

  const checkMilestone = (id: string, target: number) => {
    const item = achievements.find((a) => a.id === id);
    if (item) {
      item.progress = Math.min(target, qCount);
      if (qCount >= target && !item.unlocked) {
        item.unlocked = true;
        item.unlockedAt = new Date().toISOString().split('T')[0];
        if (item.rewardXP) {
          addXP(item.rewardXP);
          item.rewardClaimed = true;
        }
        newlyUnlocked.push(item);
      }
    }
  };

  checkMilestone('first_step', 1);
  checkMilestone('questions_10', 10);
  checkMilestone('questions_25', 25);
  checkMilestone('questions_50', 50);
  checkMilestone('questions_100', 100);

  setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  incrementWeeklyQuestionCount();

  return { user: getCurrentUser(), newlyUnlocked, totalSolved: user.totalQuestionsSolved };
}

export function getDailyPlan(): DailyStudyPlan {
  const user = getCurrentUser();
  const masteries = getSkillMasteries();
  const sorted = [...masteries].sort((a, b) => a.mastery - b.mastery);
  const weak1 = sorted[0]?.category || 'matrix';
  const weak2 = sorted[1]?.category || 'pattern';
  const other = sorted[2]?.category || 'spatial';

  return {
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
    targetQuestions: user.dailyGoalQuestions || 10,
    estimatedMinutes: user.dailyGoalMinutes || 15,
    completedQuestions: user.todayQuestionsSolved ?? 0,
    targetCategories: [
      { category: weak1, count: 4 },
      { category: weak2, count: 3 },
      { category: other, count: 3 },
    ],
  };
}

export function updateDailyGoal(questions?: number, minutes?: number, sessions?: number): UserProfile {
  const user = getCurrentUser();
  if (questions !== undefined) user.dailyGoalQuestions = questions;
  if (minutes !== undefined) user.dailyGoalMinutes = minutes;
  if (sessions !== undefined) user.dailyGoalSessions = sessions;
  setCurrentUser(user);
  return user;
}

export function getLeaderboard(period: LeaderboardPeriod = 'daily', gradeFilter: number | 'all' = 'all'): LeaderboardEntry[] {
  const user = getCurrentUser();
  if (gradeFilter !== 'all' && user.grade !== gradeFilter) return [];
  return [{
    id: user.id,
    // No competitive rank is asserted until results are calculated from
    // server-authoritative events. Zero means "not ranked" to legacy callers.
    rank: 0,
    anonymousAlias: `${user.name} (Sen)`,
    avatar: user.avatar || '🦊',
    grade: user.grade ?? 1,
    isCurrentUser: true,
    xpEarned: period === 'daily' ? 0 : user.xp,
    questionsSolved: period === 'daily' ? (user.todayQuestionsSolved || 0) : (user.totalQuestionsSolved || 0),
    minutesSpent: user.todayMinutesSpent || 0,
    streak: user.streak || 0,
    accuracy: 0,
    clapsCount: 0,
  }];
}
