import type { CognitiveCategory, DifficultyLevel, MistakeItem, PublicQuestion, SkillMastery, UserProfile, VisualExplanation } from '../types';
import { authenticatedFetch } from '../lib/api-client';

export type PracticeContext = 'practice' | 'adaptive' | 'daily';
export type IssuedPracticeQuestion = PublicQuestion & {
  challengeId: string;
  correctOptionId?: string;
  explanation?: VisualExplanation;
};

export interface PracticeAnswerOutcome {
  correct: boolean;
  correctOptionId: string;
  explanation: VisualExplanation;
  xpAwarded: number;
  consecutiveCorrect: number;
  profile: UserProfile;
  masteries: SkillMastery[];
  mistakes: MistakeItem[];
  idempotent: boolean;
}

const pendingAnswerRequestIds = new Map<string, string>();
const pendingNextRequestIds = new Map<string, string>();
const pendingStartRequestIds = new Map<string, string>();
const pendingMistakeStartRequestIds = new Map<string, string>();

async function apiError(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  throw new Error(payload.error || fallback);
}

export async function startPractice(input: {
  context: PracticeContext;
  category: CognitiveCategory | 'mixed';
  difficulty: DifficultyLevel | 'adaptive';
  count: number;
}): Promise<{ sessionId: string; questions: IssuedPracticeQuestion[] }> {
  const requestKey = JSON.stringify(input);
  const requestId = pendingStartRequestIds.get(requestKey) || crypto.randomUUID();
  pendingStartRequestIds.set(requestKey, requestId);
  const response = await authenticatedFetch('/api/practice/start', {
    method: 'POST',
    body: JSON.stringify({ ...input, requestId }),
  });
  if (!response.ok) {
    if (response.status < 500) pendingStartRequestIds.delete(requestKey);
    return apiError(response, 'Pratik başlatılamadı.');
  }
  pendingStartRequestIds.delete(requestKey);
  return response.json();
}

export async function startMistakeRetry(mistakeId: string): Promise<{
  sessionId: string;
  questions: IssuedPracticeQuestion[];
}> {
  const requestId = pendingMistakeStartRequestIds.get(mistakeId) || crypto.randomUUID();
  pendingMistakeStartRequestIds.set(mistakeId, requestId);
  const response = await authenticatedFetch(`/api/practice/mistakes/${encodeURIComponent(mistakeId)}/start`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
  if (!response.ok) {
    if (response.status < 500) pendingMistakeStartRequestIds.delete(mistakeId);
    return apiError(response, 'Hata sorusu tekrar başlatılamadı.');
  }
  pendingMistakeStartRequestIds.delete(mistakeId);
  return response.json();
}

export async function answerPractice(
  sessionId: string,
  challengeId: string,
  selectedOptionId: string,
): Promise<PracticeAnswerOutcome> {
  const requestKey = `${sessionId}:${challengeId}:${selectedOptionId}`;
  const requestId = pendingAnswerRequestIds.get(requestKey) || crypto.randomUUID();
  pendingAnswerRequestIds.set(requestKey, requestId);
  const response = await authenticatedFetch(`/api/practice/${encodeURIComponent(sessionId)}/answer`, {
    method: 'POST',
    body: JSON.stringify({ challengeId, selectedOptionId, requestId }),
  });
  if (!response.ok) {
    if (response.status < 500) pendingAnswerRequestIds.delete(requestKey);
    return apiError(response, 'Cevap puanlanamadı.');
  }
  pendingAnswerRequestIds.delete(requestKey);
  return response.json();
}

export async function nextAdaptiveQuestion(sessionId: string): Promise<{
  question: IssuedPracticeQuestion;
  target: { category: CognitiveCategory; difficulty: DifficultyLevel; reason: string };
}> {
  const requestId = pendingNextRequestIds.get(sessionId) || crypto.randomUUID();
  pendingNextRequestIds.set(sessionId, requestId);
  const response = await authenticatedFetch(`/api/practice/${encodeURIComponent(sessionId)}/next`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
  if (!response.ok) {
    if (response.status < 500) pendingNextRequestIds.delete(sessionId);
    return apiError(response, 'Yeni adaptif soru hazırlanamadı.');
  }
  pendingNextRequestIds.delete(sessionId);
  return response.json();
}
