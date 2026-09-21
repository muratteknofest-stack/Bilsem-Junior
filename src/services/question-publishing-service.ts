import type { BaseQuestion } from '../types';
import { auditQuestion } from '../features/questions/quality';
import { questionBankService } from './question-bank-service';
import { authenticatedFetch } from '../lib/api-client';
export { parseQuestionImport, selectPublishedPool } from '../features/questions/editorial-data';

export interface StoredQuestion extends BaseQuestion {
  revision: number;
  updatedAt: string;
  updatedBy: string;
  reviewedBy?: string;
}
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const pendingSaveRequests = new Map<string, string>();

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || 'Soru yayınlama servisi isteği tamamlanamadı.');
  return body as T;
}

export async function loadQuestionLibrary(): Promise<StoredQuestion[]> {
  const questions: StoredQuestion[] = [];
  let cursor: string | null = null;
  do {
    const search = new URLSearchParams({ limit: '500' });
    if (cursor) search.set('cursor', cursor);
    const payload = await readJson<{ questions: StoredQuestion[]; nextCursor: string | null }>(
      await authenticatedFetch(`/api/admin/questions?${search}`),
    );
    questions.push(...payload.questions);
    cursor = payload.nextCursor;
  } while (cursor);

  const audited = questions
    .filter(q => auditQuestion(q).errors.length === 0)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  questionBankService.replaceCache(audited);
  return audited;
}

export async function saveEditorialQuestion(
  question: BaseQuestion,
  status: NonNullable<BaseQuestion['status']>,
  expectedRevision: number,
  confirmedReview: boolean,
): Promise<StoredQuestion> {
  const report = auditQuestion(question);
  if (report.errors.length) throw new Error(report.errors.join(' '));
  if (status === 'published' && !confirmedReview) throw new Error('Yayımlamadan önce yönerge, cevap ve görselleri inceleyip onaylayın.');

  const sanitized = clean(question);
  const operationKey = JSON.stringify({ question: sanitized, status, expectedRevision, confirmedReview });
  const requestId = pendingSaveRequests.get(operationKey) || crypto.randomUUID();
  pendingSaveRequests.set(operationKey, requestId);

  let response: Response;
  try {
    response = await authenticatedFetch(`/api/admin/questions/${encodeURIComponent(question.id)}`, {
      method: 'POST',
      body: JSON.stringify({
        question: sanitized,
        status,
        expectedRevision,
        confirmedReview,
        requestId,
      }),
    });
  } catch (error) {
    // Keep the same request ID for an exact retry after an ambiguous network
    // failure so a committed write cannot be applied twice.
    throw error;
  }

  if (!response.ok && response.status < 500) pendingSaveRequests.delete(operationKey);
  const { question: stored } = await readJson<{ question: StoredQuestion }>(response);
  pendingSaveRequests.delete(operationKey);

  // Keep in-memory admin panels synchronized only after the durable write.
  questionBankService.cacheQuestion(stored);

  return stored;
}
