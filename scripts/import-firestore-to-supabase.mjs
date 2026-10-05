import { readFile } from 'node:fs/promises';

const [, , exportPath, idMapPath, mode] = process.argv;
if (!exportPath || !idMapPath || (mode && mode !== '--apply')) {
  console.error('Usage: node scripts/import-firestore-to-supabase.mjs firestore-export.json uid-map.json [--apply]');
  process.exit(2);
}
const source = JSON.parse(await readFile(exportPath, 'utf8'));
const idMap = JSON.parse(await readFile(idMapPath, 'utf8'));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function mapUid(oldId) {
  const result = idMap[oldId];
  if (typeof result !== 'string' || !uuid.test(result))
    throw new Error('Firebase UID için geçerli Supabase UUID eşlemesi eksik.');
  return result;
}
function entries(name) {
  const collection = source[name] ?? {};
  if (Array.isArray(collection)) return collection.map(value => [value.id, value]);
  if (collection && typeof collection === 'object') return Object.entries(collection);
  throw new Error(`Invalid ${name} collection`);
}
const profileFields = {
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
function profile(id, data) {
  const row = { id: mapUid(id) };
  for (const [key, column] of Object.entries(profileFields))
    if (data[key] !== undefined) row[column] = data[key];
  row.linked_parent_id = data.linkedParentId ? mapUid(data.linkedParentId) : null;
  row.linked_student_ids = (data.linkedStudentIds ?? []).map(mapUid);
  return row;
}
const configs = [
  { source: 'users', table: 'profiles', conflict: 'id', row: profile },
  { source: 'privateStates', table: 'user_private_state', conflict: 'user_id',
    row: (id, data) => ({ user_id: mapUid(id), values: data.values ?? {} }) },
  { source: 'questions', table: 'questions', conflict: 'id',
    row: (id, data) => ({ id, data: { ...data, id } }) },
  ...['practiceSessions', 'testAttempts'].map(name => ({
    source: name, table: name === 'practiceSessions' ? 'practice_sessions' : 'test_attempts',
    conflict: 'id',
    row: (id, data) => ({
      id, user_id: mapUid(data.userId), data: { ...data, userId: mapUid(data.userId) },
      ...(typeof data.createdAt === 'number' ? { created_at: data.createdAt } : {}),
    }),
  })),
  { source: 'ai_generation_jobs', table: 'ai_generation_jobs', conflict: 'job_id',
    row: (id, data) => ({
      job_id: id, admin_id: mapUid(data.adminId), status: data.status,
      config: data.config ?? {}, progress: data.progress ?? {},
      created_at: data.createdAt ?? Date.now(),
      ...(data.completedAt ? { completed_at: data.completedAt } : {}),
      ...(data.retryCount ? { retry_count: data.retryCount } : {}),
    }) },
  { source: 'ai_generation_logs', table: 'ai_generation_logs', conflict: 'legacy_id',
    row: (id, data) => ({
      legacy_id: id, admin_id: mapUid(data.adminId),
      model: data.model, prompt_version: data.promptVersion,
      success: Boolean(data.success), quality_score: data.qualityScore,
      rejection_reasons: data.rejectionReasons ?? [],
      duration_ms: data.durationMs, timestamp: data.createdAt,
    }) },
  { source: 'securityEvents', table: 'security_events', conflict: 'legacy_id',
    row: (id, data) => ({
      legacy_id: id, type: data.type, actor_id: mapUid(data.actorId),
      ...(data.studentId ? { student_id: mapUid(data.studentId) } : {}),
      created_at: data.createdAt ?? Date.now(),
      detail: data.detail ?? null,
    }) },
];
const batches = configs.map(config => ({
  ...config,
  rows: entries(config.source).map(([id, data]) => {
    if (!id || !data || typeof data !== 'object') throw new Error(`Invalid ${config.source} record`);
    return config.row(id, data);
  }),
}));
for (const batch of batches) console.log(`${batch.source}: ${batch.rows.length} validated`);
if (mode !== '--apply') {
  console.log('Dry run complete; no Supabase data was changed.');
  process.exit(0);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !/^https:\/\//.test(url)) throw new Error('Server-only Supabase URL and service role key required');
for (const batch of batches) {
  for (let i = 0; i < batch.rows.length; i += 100) {
    const endpoint = new URL(`/rest/v1/${batch.table}?on_conflict=${batch.conflict}`, url);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(batch.rows.slice(i, i + 100)),
    });
    if (!response.ok) throw new Error(`${batch.table} import stopped at offset ${i}: HTTP ${response.status}`);
  }
  console.log(`${batch.table}: ${batch.rows.length} submitted; existing rows preserved`);
}
