import { BaseQuestion } from '../../types';

export type ValidationErrorCode =
  | 'QUESTION_STRUCTURE_INVALID'
  | 'INVALID_SEED'
  | 'DUPLICATE_OPTION'
  | 'MULTIPLE_CORRECT_ANSWERS'
  | 'NO_CORRECT_ANSWER'
  | 'OUT_OF_BOUNDS_ELEMENT'
  | 'INVALID_TRANSFORMATION'
  | 'EMPTY_EXPLANATION'
  | 'AMBIGUOUS_VISUAL'
  | 'INVALID_DIFFICULTY'
  | 'INSUFFICIENT_OPTIONS';

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  field?: string;
  details?: any;
}

export interface QuestionValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export function validateQuestion(question: BaseQuestion): QuestionValidationResult {
  const errors: ValidationError[] = [];

  // 1. Basic Structure
  if (!question || typeof question !== 'object') {
    return {
      isValid: false,
      errors: [{ code: 'QUESTION_STRUCTURE_INVALID', message: 'Soru nesnesi geçersiz veya boş.' }],
    };
  }

  if (!question.id || typeof question.id !== 'string') {
    errors.push({ code: 'QUESTION_STRUCTURE_INVALID', message: 'Soru kimliği (id) eksik.', field: 'id' });
  }

  if (typeof question.seed !== 'number' || isNaN(question.seed)) {
    errors.push({ code: 'INVALID_SEED', message: 'Geçerli bir deterministik tohum (seed) bulunamadı.', field: 'seed' });
  }

  if (!question.difficulty || question.difficulty < 1 || question.difficulty > 6) {
    errors.push({ code: 'INVALID_DIFFICULTY', message: 'Zorluk seviyesi 1 ile 6 arasında olmalıdır.', field: 'difficulty' });
  }

  // 2. Options validation
  if (!Array.isArray(question.options) || question.options.length < 3) {
    errors.push({
      code: 'INSUFFICIENT_OPTIONS',
      message: 'Soru en az 3 ya da 4 seçenek içermelidir.',
      field: 'options',
    });
  } else {
    // Unique Option IDs
    const optionIds = question.options.map((o) => o.id);
    const uniqueIds = new Set(optionIds);
    if (uniqueIds.size !== optionIds.length) {
      errors.push({ code: 'DUPLICATE_OPTION', message: 'Seçenek kimlikleri (A, B, C, D) benzersiz olmalıdır.' });
    }

    // Correct Answer exists and is unique
    if (!question.correctOptionId || !uniqueIds.has(question.correctOptionId)) {
      errors.push({
        code: 'NO_CORRECT_ANSWER',
        message: `Doğru cevap kimliği (${question.correctOptionId}) seçenekler arasında bulunamadı.`,
        field: 'correctOptionId',
      });
    }

    // Visual Fingerprint Uniqueness: no duplicate visual distractor/answers
    const fingerprints = new Set<string>();
    for (const opt of question.options) {
      if (!opt.fingerprint || fingerprints.has(opt.fingerprint)) {
        errors.push({
          code: 'DUPLICATE_OPTION',
          message: `Birbirinin aynısı görsel seçenek tespit edildi (Seçenek: ${opt.id}).`,
          field: 'options',
          details: { optionId: opt.id, fingerprint: opt.fingerprint },
        });
      }
      fingerprints.add(opt.fingerprint);
    }
  }

  // 3. Explanation Validation
  if (!question.explanation || !question.explanation.summary || question.explanation.summary.trim().length === 0) {
    errors.push({
      code: 'EMPTY_EXPLANATION',
      message: 'Soru için görsel ve mantıksal çözüm açıklaması eksik.',
      field: 'explanation',
    });
  }

  // 4. Prompt validation
  if (!question.prompt || question.prompt.trim().length === 0) {
    errors.push({
      code: 'QUESTION_STRUCTURE_INVALID',
      message: 'Soru yönergesi (prompt) boş olamaz.',
      field: 'prompt',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
