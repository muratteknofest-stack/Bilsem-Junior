import type { SkillMastery, WeeklyQuestionProgressData } from "../../types";

export interface CognitiveRadarPoint {
  category: string;
  fullName: string;
  mastery: number;
  accuracy: number;
  fullMark: number;
}

export function sortSkillMasteriesByScore(masteries: SkillMastery[] = []): SkillMastery[] {
  return [...masteries].sort((a, b) => (b.mastery || 0) - (a.mastery || 0));
}

export function buildCognitiveRadarData(masteries: SkillMastery[] = []): CognitiveRadarPoint[] {
  return masteries.map((m) => ({
    category: (m.categoryName || "").split(" ")[0],
    fullName: m.categoryName || "",
    mastery: m.mastery || 0,
    accuracy: m.accuracy || 0,
    fullMark: 100,
  }));
}

export function buildMomentumSeries(weeklyData: WeeklyQuestionProgressData | null): Array<{ date: string; score: number }> {
  return (weeklyData?.dailyStats || []).map((day) => ({
    date: day.shortDay,
    score: day.thisWeek,
  }));
}

export function calculateDailyGoalProgressPct(todayMinutesSpent?: number, dailyGoalMinutes?: number): number {
  const targetMins = dailyGoalMinutes || 15;
  const spentMins = todayMinutesSpent || 0;
  return Math.min(100, Math.round((spentMins / targetMins) * 100));
}
