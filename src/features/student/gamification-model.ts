import type { UserProfile } from '../../types';

export type PracticeMode = 'practice' | 'adaptive';

export function comboMultiplier(streak: number): number {
  if (streak >= 10) return 2.5;
  if (streak >= 7) return 2;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.2;
  if (streak >= 2) return 1.1;
  return 1;
}

export function answerXp(mode: PracticeMode, difficulty: number, streak: number) {
  const safeDifficulty = Number.isFinite(difficulty) ? Math.min(6, Math.max(1, Math.floor(difficulty))) : 1;
  const safeStreak = Number.isFinite(streak) ? Math.max(1, Math.floor(streak)) : 1;
  const base = (mode === 'adaptive' ? 15 : 10) + safeDifficulty * 2;
  const multiplier = comboMultiplier(safeStreak);
  const milestones = mode === 'adaptive' ? [2, 3, 5, 7, 10] : [2, 3, 5, 7, 10, 15, 20];
  const comboBonus = milestones.includes(safeStreak)
    ? (mode === 'adaptive' ? 25 : 30) + safeStreak * 5 : 0;
  return { base, multiplier, comboBonus, total: Math.round(base * multiplier) + comboBonus };
}

export function safeXpAward(amount: number): number {
  return Number.isSafeInteger(Math.floor(amount)) && amount > 0 ? Math.floor(amount) : 0;
}

export interface DailyMission {
  id: 'questions' | 'focus' | 'sessions';
  title: string;
  detail: string;
  current: number;
  target: number;
  progress: number;
  completed: boolean;
}

function goal(value: number | undefined, fallback: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(maximum, Math.floor(value!))) : fallback;
}

export function dailyMissions(user: UserProfile, now = new Date()): DailyMission[] {
  const active = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  const isToday = active && active.toDateString() === now.toDateString();
  const definitions = [
    { id: 'questions' as const, title: 'Soru Avcısı', detail: 'Bugün soru çöz', current: user.todayQuestionsSolved, target: goal(user.dailyGoalQuestions, 10, 50) },
    { id: 'focus' as const, title: 'Odak Ustası', detail: 'Çalışma dakikası biriktir', current: user.todayMinutesSpent, target: goal(user.dailyGoalMinutes, 15, 120) },
    { id: 'sessions' as const, title: 'İstikrar Yıldızı', detail: 'Oturum tamamla', current: user.todaySessionsCompleted, target: goal(user.dailyGoalSessions, 2, 10) },
  ];
  return definitions.map(item => {
    const current = isToday && Number.isFinite(item.current) ? Math.max(0, Math.floor(item.current || 0)) : 0;
    return { ...item, current, progress: Math.min(100, Math.round(current / item.target * 100)), completed: current >= item.target };
  });
}

export function weeklyDuel(thisWeek: number, lastWeek: number) {
  const current = Number.isFinite(thisWeek) ? Math.max(0, Math.floor(thisWeek)) : 0;
  const previous = Number.isFinite(lastWeek) ? Math.max(0, Math.floor(lastWeek)) : 0;
  const target = previous > 0 ? previous + 1 : 10;
  return { current, previous, target, remaining: Math.max(0, target - current),
    won: current >= target, percent: Math.min(100, Math.round(current / target * 100)),
    hasPreviousWeek: previous > 0 };
}

export function weeklyLeague(questions: number) {
  if (questions >= 50) return { name: 'Altın', icon: '🥇', next: null };
  if (questions >= 25) return { name: 'Gümüş', icon: '🥈', next: 50 };
  if (questions >= 10) return { name: 'Bronz', icon: '🥉', next: 25 };
  return { name: 'Başlangıç', icon: '✨', next: 10 };
}

