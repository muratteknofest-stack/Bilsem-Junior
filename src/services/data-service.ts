import {
  UserProfile, UserRole, CognitiveCategory, DifficultyLevel, SkillMastery, MistakeItem,
  Achievement, DailyStudyPlan, ExamResult, BaseQuestion, StreakMilestone, StudyReminderConfig,
  LeaderboardEntry, LeaderboardPeriod, WeeklyQuestionProgressData
} from '../types';
import { reminderService } from './reminder-service';

import {
  STREAK_MILESTONES, STORAGE_KEYS, USER_PROGRESS_KEYS, INITIAL_SKILL_MASTERIES,
  INITIAL_ACHIEVEMENTS, INITIAL_MISSIONS, INITIAL_MISTAKES,
  createEmptyMasteries, createLockedAchievements
} from './modules/shared';

import {
  clearUserProgress, persistUserStateToFirebase, scheduleProgressPersist,
  setProgressItem, removeProgressItem, hydrateUserStateFromFirebase, loadRemoteProgressForUser
} from './modules/persistence-service';

import {
  syncUserFromFirebase, _updateFirebaseProfile, getCurrentUser,
  setCurrentUser, isAuthenticated, loginAs, logout, addXP, switchActiveRole
} from './modules/profile-service';

import {
  markPracticeForToday, getStreakMilestones, recordPracticeSession,
  claimStreakReward, useStreakFreeze
} from './modules/streak-service';

import {
  getSkillMasteries, updateSkillMastery
} from './modules/mastery-service';

import {
  getMistakes, addMistake, resolveMistake, clearAllMistakes
} from './modules/mistake-service';

import {
  getAchievements, unlockAchievement, claimBadgeReward, equipBadge,
  unequipBadge, syncBadgesWithProgress, upsertAchievement
} from './modules/achievement-service';

import {
  getExamResults, saveExamResult, getActiveExam, saveActiveExam, clearActiveExam
} from './modules/exam-service';

import {
  updateWeeklyCategoryProgress, getWeeklyQuestionProgressData, getDefaultWeeklyQuestionsData,
  getWeekStartKey, rollWeeklyQuestionData, incrementWeeklyQuestionCount,
  recordQuestionSolved, getDailyPlan, updateDailyGoal, getLeaderboard
} from './modules/weekly-progress-service';

export {
  STREAK_MILESTONES, STORAGE_KEYS, USER_PROGRESS_KEYS, INITIAL_SKILL_MASTERIES,
  INITIAL_ACHIEVEMENTS, INITIAL_MISSIONS, INITIAL_MISTAKES,
  createEmptyMasteries, createLockedAchievements, switchActiveRole
};

class ZekaParkDataService {
  // Persistence
  private clearUserProgress() { return clearUserProgress(); }
  private scheduleProgressPersist() { return scheduleProgressPersist(); }
  private setProgressItem(key: (typeof USER_PROGRESS_KEYS)[number], value: string) { return setProgressItem(key, value); }
  private removeProgressItem(key: (typeof USER_PROGRESS_KEYS)[number]) { return removeProgressItem(key); }
  private async persistUserStateToFirebase() { return persistUserStateToFirebase(); }
  async hydrateUserStateFromFirebase(): Promise<void> { return hydrateUserStateFromFirebase(); }
  async loadRemoteProgressForUser(userId: string) { return loadRemoteProgressForUser(userId); }

  // Profile
  syncUserFromFirebase(profile: UserProfile | null) { return syncUserFromFirebase(profile); }
  async _updateFirebaseProfile(updates: Partial<UserProfile>) { return _updateFirebaseProfile(updates); }
  getCurrentUser(): UserProfile { return getCurrentUser(); }
  setCurrentUser(user: UserProfile) { return setCurrentUser(user); }
  isAuthenticated(): boolean { return isAuthenticated(); }
  loginAs(role: UserRole, customUser?: UserProfile): UserProfile { return loginAs(role, customUser); }
  switchRole(role: UserRole): UserProfile { return switchActiveRole(role); }
  logout(): void { return logout(); }
  addXP(amount: number) { return addXP(amount); }

  // Streak
  private markPracticeForToday(user: UserProfile, minutesSpent: number): boolean { return markPracticeForToday(user, minutesSpent); }
  getStreakMilestones(): StreakMilestone[] { return getStreakMilestones(); }
  recordPracticeSession(minutesSpent = 2) { return recordPracticeSession(minutesSpent); }
  claimStreakReward(day: number) { return claimStreakReward(day); }
  useStreakFreeze() { return useStreakFreeze(); }

  // Mastery
  getSkillMasteries(): SkillMastery[] { return getSkillMasteries(); }
  updateSkillMastery(category: CognitiveCategory, isCorrect: boolean, difficulty: DifficultyLevel) { return updateSkillMastery(category, isCorrect, difficulty); }

  // Mistakes
  getMistakes(): MistakeItem[] { return getMistakes(); }
  addMistake(question: BaseQuestion) { return addMistake(question); }
  resolveMistake(mistakeId: string) { return resolveMistake(mistakeId); }
  clearAllMistakes() { return clearAllMistakes(); }

  // Achievements
  getAchievements(): Achievement[] { return getAchievements(); }
  unlockAchievement(id: string): Achievement | null { return unlockAchievement(id); }
  claimBadgeReward(id: string) { return claimBadgeReward(id); }
  equipBadge(badgeId: string) { return equipBadge(badgeId); }
  unequipBadge(badgeId: string) { return unequipBadge(badgeId); }
  syncBadgesWithProgress(): Achievement[] { return syncBadgesWithProgress(); }
  upsertAchievement(achievement: Achievement): void { return upsertAchievement(achievement); }

  // Exam
  getExamResults(): ExamResult[] { return getExamResults(); }
  saveExamResult(result: ExamResult) { return saveExamResult(result); }
  getActiveExam() { return getActiveExam(); }
  saveActiveExam(state: any) { return saveActiveExam(state); }
  clearActiveExam() { return clearActiveExam(); }

  // Weekly Progress
  updateWeeklyCategoryProgress(category: CognitiveCategory, count: number = 1) { return updateWeeklyCategoryProgress(category, count); }
  getWeeklyQuestionProgressData(passedUser?: UserProfile, remoteData?: unknown): WeeklyQuestionProgressData { return getWeeklyQuestionProgressData(passedUser, remoteData); }
  private getDefaultWeeklyQuestionsData(user: UserProfile, todayIdx: number) { return getDefaultWeeklyQuestionsData(user, todayIdx); }
  private getWeekStartKey(date = new Date()): string { return getWeekStartKey(date); }
  private rollWeeklyQuestionData(data: any) { return rollWeeklyQuestionData(data); }
  private incrementWeeklyQuestionCount() { return incrementWeeklyQuestionCount(); }
  recordQuestionSolved(isCorrect: boolean = true, category?: CognitiveCategory) { return recordQuestionSolved(isCorrect, category); }
  getDailyPlan(): DailyStudyPlan { return getDailyPlan(); }
  updateDailyGoal(questions?: number, minutes?: number, sessions?: number): UserProfile { return updateDailyGoal(questions, minutes, sessions); }
  getLeaderboard(period: LeaderboardPeriod = 'daily', gradeFilter: number | 'all' = 'all'): LeaderboardEntry[] { return getLeaderboard(period, gradeFilter); }

  // Reminder (Delegated to reminderService)
  getReminderConfig(): StudyReminderConfig {
    return reminderService.getConfig();
  }
  saveReminderConfig(config: Partial<StudyReminderConfig>): StudyReminderConfig {
    return reminderService.saveConfig(config);
  }
}

export const dataService = new ZekaParkDataService();
