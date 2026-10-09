import { UserProfile, StreakMilestone } from '../../types';
import { STREAK_MILESTONES } from './shared';
import { getCurrentUser, setCurrentUser, addXP } from './profile-service';

export function markPracticeForToday(user: UserProfile, minutesSpent: number): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const previous = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  const previousDate = previous && Number.isFinite(previous.getTime())
    ? `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}` : '';
  const isNewCalendarDay = previousDate !== today;

  if (isNewCalendarDay) {
    user.todayMinutesSpent = 0;
    user.todayQuestionsSolved = 0;
    user.todaySessionsCompleted = 0;
    user.todayPracticed = false;
  }

  let streakIncreased = false;
  if (!user.todayPracticed) {
    const previousTime = previousDate ? new Date(`${previousDate}T00:00:00`).getTime() : Number.NaN;
    const todayTime = new Date(`${today}T00:00:00`).getTime();
    const dayGap = Number.isFinite(previousTime) ? Math.round((todayTime - previousTime) / 86_400_000) : Number.NaN;

    if (!previousDate || user.streak <= 0) {
      user.streak = 1;
    } else if (dayGap === 1) {
      user.streak += 1;
    } else if (dayGap === 2 && (user.streakFreezeCount || 0) > 0) {
      user.streakFreezeCount = (user.streakFreezeCount || 0) - 1;
      user.streak += 1;
    } else if (dayGap > 1) {
      user.streak = 1;
    } else if (previousDate === today && user.streak <= 0) {
      user.streak = 1;
    }
    streakIncreased = true;
  }

  user.todayPracticed = true;
  user.todayMinutesSpent = (user.todayMinutesSpent || 0) + Math.max(0, minutesSpent);
  user.lastActiveDate = now.toISOString();
  user.longestStreak = Math.max(user.longestStreak || 0, user.streak || 0);
  const dayIndex = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayIndex);
  monday.setHours(0, 0, 0, 0);
  const previousWasBeforeThisWeek = previousDate
    ? new Date(`${previousDate}T00:00:00`).getTime() < monday.getTime()
    : true;
  const history = previousWasBeforeThisWeek
    ? [false, false, false, false, false, false, false]
    : [...(user.weeklyStreakHistory || [false, false, false, false, false, false, false])];
  history[dayIndex] = true;
  user.weeklyStreakHistory = history;
  return streakIncreased;
}

export function getStreakMilestones(): StreakMilestone[] {
  return STREAK_MILESTONES;
}

export function recordPracticeSession(minutesSpent = 2): { user: UserProfile; streakIncreased: boolean } {
  const user = getCurrentUser();
  const streakIncreased = markPracticeForToday(user, minutesSpent);
  user.todaySessionsCompleted = (user.todaySessionsCompleted || 0) + 1;
  setCurrentUser(user);
  return { user, streakIncreased };
}

export function claimStreakReward(day: number): { success: boolean; xpAwarded: number; milestone?: StreakMilestone; user: UserProfile } {
  const user = getCurrentUser();
  const milestone = STREAK_MILESTONES.find((m) => m.day === day);
  if (!milestone) return { success: false, xpAwarded: 0, user };

  const claimed = user.claimedStreakDays || [];
  if (claimed.includes(day)) {
    return { success: false, xpAwarded: 0, milestone, user };
  }

  if (user.streak < day) {
    return { success: false, xpAwarded: 0, milestone, user };
  }

  // Award XP
  addXP(milestone.xpReward);
  const updatedUser = getCurrentUser();

  if (milestone.rewardType === 'shield') {
    updatedUser.streakFreezeCount = (updatedUser.streakFreezeCount || 0) + 1;
  }

  updatedUser.claimedStreakDays = [...claimed, day];
  setCurrentUser(updatedUser);

  return {
    success: true,
    xpAwarded: milestone.xpReward,
    milestone,
    user: updatedUser,
  };
}

export function useStreakFreeze(): { success: boolean; user: UserProfile } {
  const user = getCurrentUser();
  if ((user.streakFreezeCount || 0) <= 0) {
    return { success: false, user };
  }
  user.streakFreezeCount = (user.streakFreezeCount || 0) - 1;
  setCurrentUser(user);
  return { success: true, user };
}

