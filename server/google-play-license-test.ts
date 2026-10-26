import { z } from 'zod';
import type { PlatformSettings } from '../src/lib/platform-settings';

// A short, operator-configured session for ONE parent/student pair. Never accept a client
// flag, email, user_metadata claim, or a student-supplied parent identifier.
function licenseTestIdentity(env: NodeJS.ProcessEnv, now: number): { parentId: string; studentId: string } | null {
  if (env.GOOGLE_PLAY_LICENSE_TEST_ENABLED !== 'true' || env.GOOGLE_PLAY_ENFORCE_PAID_ACCESS === 'true' || Boolean(env.GOOGLE_PLAY_PAID_ACCESS_FROM)) return null;
  const parent = z.uuid().safeParse(env.GOOGLE_PLAY_LICENSE_TEST_PARENT_ID);
  const student = z.uuid().safeParse(env.GOOGLE_PLAY_LICENSE_TEST_STUDENT_ID);
  const until = z.iso.datetime().safeParse(env.GOOGLE_PLAY_LICENSE_TEST_UNTIL);
  if (!parent.success || !student.success || parent.data === student.data || !until.success) return null;
  const remaining = Date.parse(until.data) - now;
  return remaining > 0 && remaining <= 24 * 60 * 60 * 1000 ? { parentId: parent.data, studentId: student.data } : null;
}
export function licenseTestStudentId(env: NodeJS.ProcessEnv = process.env, now = Date.now()): string | null {
  return licenseTestIdentity(env, now)?.studentId ?? null;
}
export function isLicenseTestFamily(parentId: string, studentId: string, env: NodeJS.ProcessEnv = process.env, now = Date.now()): boolean {
  const configured = licenseTestIdentity(env, now);
  return configured !== null && configured.parentId === parentId && configured.studentId === studentId;
}

// Technical acceptance tests must not be marked passed just to run a test.
// Legal information and all normal auth/family/setup checks still apply.
export function licenseTestLegalReady(settings: PlatformSettings): boolean {
  const { legalName, address, contactEmail, legalBases, retention, transfers } = settings.business;
  return [legalName, address, contactEmail, legalBases, retention, transfers].every(value => value.trim().length > 0);
}
