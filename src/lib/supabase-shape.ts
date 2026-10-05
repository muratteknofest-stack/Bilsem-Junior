const profileFields: Record<string, string> = {
  email: 'email', name: 'name', role: 'role', studentCode: 'student_code',
  grade: 'grade', examFocus: 'exam_focus', parentPhone: 'parent_phone',
  recoveryEmail: 'recovery_email', consent: 'consent', avatar: 'avatar',
  level: 'level', xp: 'xp', streak: 'streak', longestStreak: 'longest_streak',
  lastActiveDate: 'last_active_date', todayPracticed: 'today_practiced',
  streakFreezeCount: 'streak_freeze_count', claimedStreakDays: 'claimed_streak_days',
  weeklyStreakHistory: 'weekly_streak_history', dailyGoalMinutes: 'daily_goal_minutes',
  todayMinutesSpent: 'today_minutes_spent', dailyGoalQuestions: 'daily_goal_questions',
  todayQuestionsSolved: 'today_questions_solved', dailyGoalSessions: 'daily_goal_sessions',
  todaySessionsCompleted: 'today_sessions_completed', soundEnabled: 'sound_enabled',
  totalQuestionsSolved: 'total_questions_solved',
  resolvedMistakesCount: 'resolved_mistakes_count', featuredBadgeIds: 'featured_badge_ids',
  reminderConfig: 'reminder_config', totalPoints: 'total_points',
  lastLoginAt: 'last_login_at', createdAt: 'created_at', updatedAt: 'updated_at',
};
type RecordValue = Record<string, any>;

export function fromSupabaseRow(table: string, row: RecordValue): RecordValue {
  if (table === 'profiles') {
    const profile: RecordValue = { id: row.id };
    for (const [field, column] of Object.entries(profileFields))
      if (row[column] !== null && row[column] !== undefined) profile[field] = row[column];
    if (row.linked_parent_id) profile.linkedParentId = row.linked_parent_id;
    profile.linkedStudentIds = row.linked_student_ids ?? [];
    return profile;
  }
  if (table === 'user_private_state') return {
    values: row.values ?? {}, updatedAt: row.updated_at,
  };
  if (table === 'questions' || table === 'practice_sessions' || table === 'test_attempts')
    return row.data ?? {};
  if (table === 'ai_generation_jobs') return {
    jobId: row.job_id, adminId: row.admin_id, status: row.status,
    config: row.config, progress: row.progress, createdAt: row.created_at,
    completedAt: row.completed_at, retryCount: row.retry_count,
  };
  return row;
}

export function toSupabaseRow(table: string, id: string, value: RecordValue): RecordValue {
  if (table === 'profiles') {
    const row: RecordValue = { id };
    for (const [field, column] of Object.entries(profileFields))
      if (value[field] !== undefined) row[column] = value[field];
    if (value.linkedParentId !== undefined) row.linked_parent_id = value.linkedParentId;
    if (value.linkedStudentIds !== undefined) row.linked_student_ids = value.linkedStudentIds;
    return row;
  }
  if (table === 'user_private_state') return {
    user_id: id, values: value.values ?? {}, updated_at: new Date().toISOString(),
  };
  if (table === 'questions') return { id, data: { ...value, id } };
  if (table === 'practice_sessions' || table === 'test_attempts') return {
    id, user_id: value.userId, data: value,
  };
  if (table === 'ai_generation_jobs') return {
    job_id: id, admin_id: value.adminId, status: value.status,
    config: value.config ?? {}, progress: value.progress ?? {},
    created_at: value.createdAt ?? Date.now(),
    ...(value.completedAt ? { completed_at: value.completedAt } : {}),
    ...(value.retryCount ? { retry_count: value.retryCount } : {}),
  };
  if (table === 'ai_generation_logs') return {
    legacy_id: id, admin_id: value.adminId, model: value.model,
    prompt_version: value.promptVersion, success: Boolean(value.success),
    quality_score: value.qualityScore, rejection_reasons: value.rejectionReasons ?? [],
    duration_ms: value.durationMs, timestamp: value.createdAt,
  };
  if (table === 'security_events') return {
    legacy_id: id, type: value.type, actor_id: value.actorId,
    student_id: value.studentId ?? null, created_at: value.createdAt ?? Date.now(),
  };
  throw new Error('Bilinmeyen Supabase tablosu.');
}
