import { isAvailableCategory } from './available-categories';
import { isLearningTopic, type LearningTopic } from './learning-topics';
import type { LearningCategory, LearningMode, LearningSessionView } from './learning-contract';
import type { SchoolGrade } from '../questions/quality-policy';

export interface LearningResumeScope {
  mode: LearningMode; grade: SchoolGrade; category: LearningCategory; topic: LearningTopic;
}
export interface LearningResumeCandidate {
  id: string; mode: LearningMode; grade: SchoolGrade; expiresAt: string; count: number;
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Metadata is an invitation to GET the owned snapshot, never an answer cache.
 * A normal adaptive route cannot claim a story's session or another locale. */
export function learningResumeCandidate(value: unknown, scope: LearningResumeScope, now = Date.now()): LearningResumeCandidate | null {
  if (!record(value) || value.mode !== scope.mode || value.finished_at != null || value.result != null ||
      typeof value.id !== 'string' || !uuid.test(value.id) || typeof value.expires_at !== 'string' || !record(value.selection)) return null;
  const selection = value.selection;
  const deadline = Date.parse(value.expires_at);
  if (!Number.isFinite(deadline) || deadline < now - 24 * 3600_000 || deadline > now + 24 * 3600_000 ||
      selection.grade !== scope.grade || (selection.locale !== undefined && selection.locale !== 'tr') || selection.mixCategories === true ||
      typeof selection.count !== 'number' || !Number.isInteger(selection.count) || selection.count < 1 || selection.count > 50 ||
      (selection.category !== 'mixed' && !isAvailableCategory(selection.category)) || !isLearningTopic(selection.topic ?? 'mixed')) return null;
  if (scope.topic !== 'mixed' && selection.topic !== scope.topic || scope.category !== 'mixed' && selection.category !== scope.category) return null;
  return { id: value.id, mode: scope.mode, grade: scope.grade, expiresAt: value.expires_at, count: selection.count };
}

export function assertResumedLearningSession(session: LearningSessionView, candidate: LearningResumeCandidate): void {
  if (session.id !== candidate.id || session.mode !== candidate.mode || session.expiresAt !== candidate.expiresAt ||
      session.questions.length !== candidate.count || session.questions.some(q => q.targetGrade !== candidate.grade)) {
    throw new Error('Kayıtlı çalışma bu sınıf ve çalışma alanıyla eşleşmiyor. Ana sayfadan yeniden aç.');
  }
}
