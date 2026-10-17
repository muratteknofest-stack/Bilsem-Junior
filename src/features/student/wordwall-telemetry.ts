export interface WordwallTelemetryEntry {
  activityId: string;
  title: string;
  grade: number;
  category: string;
  startedAt: number;
  durationSeconds: number;
}

const activeSessions = new Map<string, { title: string; grade: number; category: string; startedAt: number }>();
const completedSessions: WordwallTelemetryEntry[] = [];

export function recordWordwallActivityStart(activity: { id: string; title: string; grade: number; category: string }, now = Date.now()): void {
  activeSessions.set(activity.id, {
    title: activity.title,
    grade: activity.grade,
    category: activity.category,
    startedAt: now,
  });
}

export function recordWordwallActivityClose(activityId: string, now = Date.now()): WordwallTelemetryEntry | null {
  const session = activeSessions.get(activityId);
  if (!session) return null;
  activeSessions.delete(activityId);
  const durationSeconds = Math.max(1, Math.round((now - session.startedAt) / 1000));
  const entry: WordwallTelemetryEntry = {
    activityId,
    title: session.title,
    grade: session.grade,
    category: session.category,
    startedAt: session.startedAt,
    durationSeconds,
  };
  completedSessions.push(entry);
  if (completedSessions.length > 100) completedSessions.splice(0, completedSessions.length - 100);
  return entry;
}

export function getWordwallTelemetryHistory(): readonly WordwallTelemetryEntry[] {
  return completedSessions.map(entry => ({ ...entry }));
}
