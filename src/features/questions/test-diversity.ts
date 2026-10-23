export const DIVERSITY_ERROR_CODE = 'INSUFFICIENT_DISTINCT_QUESTIONS';

/** A failed preparation never changes the requested length or starts a partial test. */
export class QuestionDiversityError extends Error {
  readonly code = DIVERSITY_ERROR_CODE;
  readonly status = 422;
  constructor(readonly requestedCount: number, readonly preparedCount: number) {
    super(`Bu seçimde ${preparedCount} farklı soru tarzı hazırlanabildi. ${requestedCount} soruluk testi benzer kalıpları tekrarlamadan hazırlayamadık. Daha kısa bir hedef veya tüm alanlardan karışık test seçebilirsin.`);
    this.name = 'QuestionDiversityError';
  }
}

export function readQuestionDiversityError(payload: unknown): QuestionDiversityError | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Record<string, unknown>;
  if (value.code !== DIVERSITY_ERROR_CODE || !Number.isInteger(value.requestedCount) ||
      !Number.isInteger(value.preparedCount) || Number(value.requestedCount) < 1 ||
      Number(value.requestedCount) > 50 || Number(value.preparedCount) < 0 ||
      Number(value.preparedCount) >= Number(value.requestedCount)) return null;
  return new QuestionDiversityError(Number(value.requestedCount), Number(value.preparedCount));
}
