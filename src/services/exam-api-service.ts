import type { ExamResult, PublicQuestion } from '../types';
import { authenticatedFetch } from '../lib/api-client';

export interface StartedExam {
  attemptId: string;
  title: string;
  durationSeconds: number;
  questions: PublicQuestion[];
}

export interface SubmittedExam {
  result: ExamResult;
  xpAwarded: number;
  idempotent: boolean;
}

async function readApiError(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  throw new Error(payload.error || fallback);
}

const pendingStartRequestIds = new Map<string, string>();

export async function startExam(modeId: string): Promise<StartedExam> {
  const requestId = pendingStartRequestIds.get(modeId) || crypto.randomUUID();
  pendingStartRequestIds.set(modeId, requestId);
  const response = await authenticatedFetch('/api/exams/start', {
    method: 'POST',
    body: JSON.stringify({ modeId, requestId }),
  });
  if (!response.ok) {
    if (response.status < 500) pendingStartRequestIds.delete(modeId);
    return readApiError(response, 'Sınav başlatılamadı.');
  }
  pendingStartRequestIds.delete(modeId);
  return response.json() as Promise<StartedExam>;
}

export async function submitExam(attemptId: string, answers: Record<string, string>): Promise<SubmittedExam> {
  const response = await authenticatedFetch(`/api/exams/${encodeURIComponent(attemptId)}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) return readApiError(response, 'Sınav puanlanamadı.');
  return response.json() as Promise<SubmittedExam>;
}
