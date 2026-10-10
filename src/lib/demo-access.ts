import { safeStorage } from './storage';

// These limits are a product preview, not a payment entitlement. Paid access
// must always be verified on the server against a provider-confirmed purchase.
const DEMO_QUESTIONS_KEY = 'zp:demo:answered:v1';
const LANDING_QUESTION_KEY = 'zp:landing:answered:v1';
export const DEMO_QUESTION_LIMIT = 3;

export function isDemoUser(id: string | undefined): boolean {
  return Boolean(id?.startsWith('demo_'));
}

export function demoQuestionsRemaining(): number {
  const count = Number(safeStorage.getItem(DEMO_QUESTIONS_KEY) || 0);
  return Math.max(0, DEMO_QUESTION_LIMIT - (Number.isFinite(count) ? Math.max(0, count) : 0));
}

export function useDemoQuestion(): boolean {
  const remaining = demoQuestionsRemaining();
  if (remaining === 0) return false;
  safeStorage.setItem(DEMO_QUESTIONS_KEY, String(DEMO_QUESTION_LIMIT - remaining + 1));
  return true;
}

export function landingQuestionAnswered(): boolean {
  return safeStorage.getItem(LANDING_QUESTION_KEY) === 'true';
}

export function useLandingQuestion(): boolean {
  if (landingQuestionAnswered()) return false;
  safeStorage.setItem(LANDING_QUESTION_KEY, 'true');
  return true;
}
