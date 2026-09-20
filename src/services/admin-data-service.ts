import { authenticatedFetch } from '../lib/api-client';
import type { SkillMastery } from '../types';

export interface AdminActivity {
  id: string;
  action?: string;
  createdAt?: number;
  studentId?: string;
  rewardType?: string;
  amount?: number;
}

export interface AdminOverview {
  totalQuestions: number;
  statusCounts: { published: number; draft: number; review: number; archived: number };
  registeredStudents: number;
  openReports: number;
  targetQuestions: number;
  categoryCounts: Record<string, number>;
  recentActivities: AdminActivity[];
}

export interface AdminStudentRecord {
  id: string;
  name: string;
  avatar: string;
  grade: number;
  level: number;
  xp: number;
  streak: number;
  solvedQuestions: number;
  accuracy: number;
  mistakesCount: number;
  streakFreeze: number;
  lastActiveAt: string | null;
  masteries: SkillMastery[];
}

const readJson = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Yönetim servisi isteği tamamlanamadı.');
  return body as T;
};

export async function loadAdminOverview(): Promise<AdminOverview> {
  return readJson<AdminOverview>(await authenticatedFetch('/api/admin/overview'));
}

export async function loadAdminStudents(cursor?: string): Promise<{
  students: AdminStudentRecord[];
  nextCursor: string | null;
}> {
  const search = new URLSearchParams({ limit: '100' });
  if (cursor) search.set('cursor', cursor);
  return readJson(await authenticatedFetch(`/api/admin/students?${search}`));
}

export async function grantStudentReward(
  studentId: string,
  type: 'xp' | 'streak_freeze',
  amount: number,
): Promise<void> {
  await readJson(await authenticatedFetch(`/api/admin/students/${encodeURIComponent(studentId)}/reward`, {
    method: 'POST',
    body: JSON.stringify({ type, amount }),
  }));
}
