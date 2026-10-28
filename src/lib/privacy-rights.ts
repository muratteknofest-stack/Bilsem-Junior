const DAY = 86_400_000;

/** Article 13 response tracking; this never authorizes or executes deletion. */
export function privacyResponseDeadline(receivedAt: string, now = Date.now()) {
  const received = Date.parse(receivedAt);
  if (!Number.isFinite(received) || !Number.isFinite(now)) return null;
  const dueAt = new Date(received + 30 * DAY);
  const remaining = dueAt.getTime() - now;
  return { dueAt, overdue: remaining < 0, daysRemaining: Math.max(0, Math.ceil(remaining / DAY)) };
}
