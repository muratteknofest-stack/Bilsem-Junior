import { BaseQuestion } from '../../types';
import { optionContent, solveQuestion } from './quality';

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

  if (!question.id || typeof question.id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(question.id)) {
    errors.push({ code: 'QUESTION_STRUCTURE_INVALID', message: 'Soru kimliği (id) eksik.', field: 'id' });
  }

  if (!Number.isSafeInteger(question.seed) || question.seed < 0) {
    errors.push({ code: 'INVALID_SEED', message: 'Geçerli bir deterministik tohum (seed) bulunamadı.', field: 'seed' });
  }

  if (!Number.isInteger(question.difficulty) || question.difficulty < 1 || question.difficulty > 6) {
    errors.push({ code: 'INVALID_DIFFICULTY', message: 'Zorluk seviyesi 1 ile 6 arasında olmalıdır.', field: 'difficulty' });
  }

  // 2. Options validation
  if (!Array.isArray(question.options) || question.options.length < 3) {
    errors.push({
      code: 'INSUFFICIENT_OPTIONS',
      message: 'Soru en az 3 ya da 4 seçenek içermelidir.',
      field: 'options',
    });
  } else if (question.options.some(o => !o || typeof o.id !== 'string' || !o.id.trim() || o.visualData == null)) {
    errors.push({ code: 'QUESTION_STRUCTURE_INVALID', message: 'Seçenek kimliği veya görsel içeriği eksik.' });
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
      const actualFingerprint = optionContent(opt.visualData);
      if (fingerprints.has(actualFingerprint)) {
        errors.push({
          code: 'DUPLICATE_OPTION',
          message: `Birbirinin aynısı görsel seçenek tespit edildi (Seçenek: ${opt.id}).`,
          field: 'options',
          details: { optionId: opt.id, fingerprint: opt.fingerprint },
        });
      }
      fingerprints.add(actualFingerprint);
    }
  }

  // 3. Explanation Validation
  if (!question.explanation || typeof question.explanation.summary !== 'string' || question.explanation.summary.trim().length === 0 || !Array.isArray(question.explanation.steps) || !question.explanation.steps.length || question.explanation.steps.some(s => typeof s !== 'string' || !s.trim())) {
    errors.push({
      code: 'EMPTY_EXPLANATION',
      message: 'Soru için görsel ve mantıksal çözüm açıklaması eksik.',
      field: 'explanation',
    });
  }

  // 4. Prompt validation
  if (typeof question.prompt !== 'string' || question.prompt.trim().length === 0) {
    errors.push({
      code: 'QUESTION_STRUCTURE_INVALID',
      message: 'Soru yönergesi (prompt) boş olamaz.',
      field: 'prompt',
    });
  }

  if (!question.visualConfig || typeof question.visualConfig.displayMode !== 'string') {
    errors.push({ code: 'QUESTION_STRUCTURE_INVALID', message: 'Görsel yapılandırması eksik.' });
  }
  if (errors.length === 0) {
    const solved = solveQuestion(question);
    if (!solved.supported || solved.matchingIds.length !== 1 || solved.matchingIds[0] !== question.correctOptionId) {
      errors.push({ code: solved.matchingIds.length > 1 ? 'MULTIPLE_CORRECT_ANSWERS' : 'NO_CORRECT_ANSWER', message: solved.reason || 'Bağımsız çözüm kontrolü: cevap anahtarı görünür kuralla eşleşmiyor veya tek bir doğru cevap yok.' });
    }
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}
