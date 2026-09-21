const DAY_MS = 86_400_000;

export function activityRetentionExpiresAt(now = Date.now()): number {
  const configured = Number(process.env.ACTIVITY_RETENTION_DAYS || 180);
  const days = Number.isInteger(configured) && configured >= 30 && configured <= 3650
    ? configured
    : 180;
  return now + days * DAY_MS;
}
