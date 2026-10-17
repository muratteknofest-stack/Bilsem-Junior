import {
  BaseQuestion,
  CognitiveCategory,
  QuestionType,
  DifficultyLevel,
  ALL_COGNITIVE_CATEGORIES,
} from '../types';

// ============================================================================
// TYPES & INTERFACES FOR QUESTION QUALITY VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  rule:
    | 'id_uniqueness'
    | 'mandatory_fields'
    | 'min_options'
    | 'non_empty_text'
    | 'correct_answer_bounds'
    | 'type_validity';
  message: string;
  receivedValue?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  errorCount: number;
  details: {
    hasUniqueId: boolean;
    hasMandatoryFields: boolean;
    hasMinimumFourOptions: boolean;
    hasNonEmptyTextFields: boolean;
    hasValidCorrectAnswerBounds: boolean;
  };
}

export interface ValidateQuestionOptions {
  existingQuestions?: Array<{ id?: string } | any>;
  existingIds?: string[];
  minOptionsCount?: number;
}

/**
 * Standard list of mandatory fields required for admin question submission.
 * Rule 2: id, category, subCategory, cognitiveSkill, ageLevel, difficulty, text, options, correctAnswer, explanation
 */
export const MANDATORY_QUESTION_FIELDS = [
  'id',
  'category',
  'subCategory',
  'cognitiveSkill',
  'ageLevel',
  'difficulty',
  'text',
  'options',
  'correctAnswer',
  'explanation',
] as const;

export type MandatoryQuestionField = typeof MANDATORY_QUESTION_FIELDS[number];

// ============================================================================
// CORE VALIDATION FUNCTION: validateQuestion
// ============================================================================

/**
 * Validates a question object prior to admin panel submission against 5 strict rules:
 * 1) ID uniqueness
 * 2) Mandatory fields (id, category, subCategory, cognitiveSkill, ageLevel, difficulty, text, options, correctAnswer, explanation)
 * 3) Minimum of 4 options
 * 4) Non-empty text fields (prompt/text, options, explanation)
 * 5) 'correctAnswer' index is within bounds of the options array
 *
 * @param question The question object to inspect
 * @param options Optional list of existing questions or existing IDs to check ID uniqueness against
 * @returns ValidationResult with boolean flag and exhaustive error list
 */
export function validateQuestion(
  question: any,
  options: ValidateQuestionOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];

  let hasUniqueId = true;
  let hasMandatoryFields = true;
  let hasMinimumFourOptions = true;
  let hasNonEmptyTextFields = true;
  let hasValidCorrectAnswerBounds = true;

  const minCount = options.minOptionsCount ?? 4;

  // Initial null / type check
  if (!question || typeof question !== 'object') {
    return {
      isValid: false,
      errors: [
        {
          field: 'root',
          rule: 'mandatory_fields',
          message: 'Soru nesnesi (question) boş veya tanımsız.',
          receivedValue: question,
        },
      ],
      errorCount: 1,
      details: {
        hasUniqueId: false,
        hasMandatoryFields: false,
        hasMinimumFourOptions: false,
        hasNonEmptyTextFields: false,
        hasValidCorrectAnswerBounds: false,
      },
    };
  }

  // -------------------------------------------------------------
  // 1) ID UNIQUENESS & INTEGRITY
  // -------------------------------------------------------------
  const qId = question.id !== undefined && question.id !== null ? String(question.id).trim() : '';

  if (!qId) {
    hasUniqueId = false;
    errors.push({
      field: 'id',
      rule: 'id_uniqueness',
      message: 'Soru kimliği (id) boş veya tanımsız olamaz.',
      receivedValue: question.id,
    });
  } else {
    // Check against existing question pool or list of existing IDs
    const poolIds: string[] = [
      ...(options.existingIds || []),
      ...(options.existingQuestions || [])
        .filter((q) => q && q !== question)
        .map((q) => String(q.id || '').trim()),
    ].filter(Boolean);

    if (poolIds.length > 0 && poolIds.includes(qId)) {
      hasUniqueId = false;
      errors.push({
        field: 'id',
        rule: 'id_uniqueness',
        message: `"${qId}" kimlikli soru sistemde zaten mevcut. Soru kimliği benzersiz olmalıdır.`,
        receivedValue: qId,
      });
    }
  }

  // -------------------------------------------------------------
  // 2) MANDATORY FIELDS CHECK
  // (id, category, subCategory, cognitiveSkill, ageLevel, difficulty, text, options, correctAnswer, explanation)
  // -------------------------------------------------------------
  
  // Normalization aliases:
  // - text: accepts question.text or question.prompt
  // - correctAnswer: accepts question.correctAnswer or question.correctOptionId or question.correctOptionIndex
  // - subCategory: accepts question.subCategory or question.type
  // - cognitiveSkill: accepts question.cognitiveSkill or question.category
  // - ageLevel: accepts question.ageLevel or question.grade
  const normalizedQuestion = {
    ...question,
    text: question.text ?? question.prompt ?? question.questionText,
    correctAnswer: question.correctAnswer ?? question.correctOptionId ?? question.correctOptionIndex,
    subCategory: question.subCategory ?? question.type,
    cognitiveSkill: question.cognitiveSkill ?? question.category,
    ageLevel: question.ageLevel ?? question.grade,
  };

  for (const field of MANDATORY_QUESTION_FIELDS) {
    const val = normalizedQuestion[field];

    if (val === undefined || val === null) {
      hasMandatoryFields = false;
      errors.push({
        field,
        rule: 'mandatory_fields',
        message: `Zorunlu alan eksik: "${field}" alanı tanımlanmalıdır.`,
        receivedValue: val,
      });
    } else if (typeof val === 'string' && val.trim() === '') {
      hasMandatoryFields = false;
      errors.push({
        field,
        rule: 'mandatory_fields',
        message: `Zorunlu alan boş: "${field}" alanı boş bırakılamaz.`,
        receivedValue: val,
      });
    }
  }

  // -------------------------------------------------------------
  // 3) MINIMUM OF 4 OPTIONS
  // -------------------------------------------------------------
  const qOptions = question.options;

  if (!Array.isArray(qOptions)) {
    hasMinimumFourOptions = false;
    errors.push({
      field: 'options',
      rule: 'min_options',
      message: 'Seçenekler bir dizi (array) formatında olmalıdır.',
      receivedValue: qOptions,
    });
  } else if (qOptions.length < minCount) {
    hasMinimumFourOptions = false;
    errors.push({
      field: 'options',
      rule: 'min_options',
      message: `En az ${minCount} seçenek bulunmalıdır. Mevcut seçenek sayısı: ${qOptions.length}.`,
      receivedValue: qOptions.length,
    });
  }

  // -------------------------------------------------------------
  // 4) NON-EMPTY TEXT FIELDS
  // -------------------------------------------------------------
  
  // A) Question text / prompt
  const mainText = normalizedQuestion.text;
  if (typeof mainText !== 'string' || mainText.trim().length === 0) {
    hasNonEmptyTextFields = false;
    errors.push({
      field: 'text',
      rule: 'non_empty_text',
      message: 'Soru metni / yönergesi (text/prompt) boş olamaz.',
      receivedValue: mainText,
    });
  }

  // B) Options text / label / visual content
  if (Array.isArray(qOptions)) {
    qOptions.forEach((opt: any, index: number) => {
      if (!opt || typeof opt !== 'object') {
        hasNonEmptyTextFields = false;
        errors.push({
          field: `options[${index}]`,
          rule: 'non_empty_text',
          message: `${index + 1}. seçenek nesnesi tanımsız veya geçersiz.`,
          receivedValue: opt,
        });
        return;
      }

      const optText = opt.text ?? opt.label ?? opt.content;
      const hasVisual =
        Boolean(opt.visualData && (
          opt.visualData.kind ||
          opt.visualData.textNumber !== undefined ||
          opt.visualData.textOnly ||
          opt.visualData.stack ||
          opt.visualData.fillPercent !== undefined ||
          opt.visualData.paperPattern ||
          opt.visualData.grid2D ||
          opt.visualData.fill
        ));

      const hasText = typeof optText === 'string' && optText.trim().length > 0;
      const hasNumber = typeof optText === 'number' || typeof opt.textNumber === 'number';

      if (!hasText && !hasVisual && !hasNumber) {
        hasNonEmptyTextFields = false;
        errors.push({
          field: `options[${index}].text`,
          rule: 'non_empty_text',
          message: `${index + 1}. seçenekte geçerli bir metin veya görsel içerik bulunmalıdır.`,
          receivedValue: optText,
        });
      }
    });
  }

  // C) Explanation field
  const expl = question.explanation;
  if (expl !== undefined && expl !== null) {
    if (typeof expl === 'string') {
      if (expl.trim().length === 0) {
        hasNonEmptyTextFields = false;
        errors.push({
          field: 'explanation',
          rule: 'non_empty_text',
          message: 'Çözüm açıklaması metni (explanation) boş bırakılamaz.',
          receivedValue: expl,
        });
      }
    } else if (typeof expl === 'object') {
      const explSummary = expl.summary ?? expl.text ?? expl.title;
      if (!explSummary || (typeof explSummary === 'string' && explSummary.trim().length === 0)) {
        hasNonEmptyTextFields = false;
        errors.push({
          field: 'explanation.summary',
          rule: 'non_empty_text',
          message: 'Çözüm açıklaması nesnesi geçerli bir özet metin (summary/text) içermelidir.',
          receivedValue: expl,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 5) 'CORRECTANSWER' INDEX IS WITHIN BOUNDS OF THE OPTIONS ARRAY
  // -------------------------------------------------------------
  const ans = normalizedQuestion.correctAnswer;

  if (ans === undefined || ans === null || (typeof ans === 'string' && ans.trim() === '')) {
    hasValidCorrectAnswerBounds = false;
    errors.push({
      field: 'correctAnswer',
      rule: 'correct_answer_bounds',
      message: 'Doğru cevap (correctAnswer) belirtilmelidir.',
      receivedValue: ans,
    });
  } else if (Array.isArray(qOptions) && qOptions.length > 0) {
    let isInBounds = false;

    // Case 1: Numeric index (e.g. 0, 1, 2, 3)
    if (typeof ans === 'number') {
      if (ans >= 0 && ans < qOptions.length && Number.isInteger(ans)) {
        isInBounds = true;
      } else {
        errors.push({
          field: 'correctAnswer',
          rule: 'correct_answer_bounds',
          message: `Doğru cevap sayısal indeksi [${ans}], seçenek dizisinin sınırları (0..${qOptions.length - 1}) dışında.`,
          receivedValue: ans,
        });
      }
    }
    // Case 2: String matching option ID (e.g. 'A', 'B', 'C', 'D' or '0', '1', '2')
    else if (typeof ans === 'string') {
      const trimmed = ans.trim();
      
      // Match by option id
      const matchIndex = qOptions.findIndex(
        (opt: any) => opt && String(opt.id || '').trim().toUpperCase() === trimmed.toUpperCase()
      );

      // Or check if string is numeric index (e.g. "2")
      const numericVal = parseInt(trimmed, 10);
      const isNumericIndexValid =
        !isNaN(numericVal) &&
        String(numericVal) === trimmed &&
        numericVal >= 0 &&
        numericVal < qOptions.length;

      if (matchIndex !== -1) {
        isInBounds = true;
      } else if (isNumericIndexValid) {
        isInBounds = true;
      } else {
        const availableOptions = qOptions.map((o: any, idx: number) => o?.id ?? idx).join(', ');
        errors.push({
          field: 'correctAnswer',
          rule: 'correct_answer_bounds',
          message: `Doğru cevap değeri "${trimmed}", mevcut seçenekler [${availableOptions}] ile eşleşmiyor veya sınır dışı.`,
          receivedValue: trimmed,
        });
      }
    }

    if (!isInBounds) {
      hasValidCorrectAnswerBounds = false;
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    errorCount: errors.length,
    details: {
      hasUniqueId,
      hasMandatoryFields,
      hasMinimumFourOptions,
      hasNonEmptyTextFields,
      hasValidCorrectAnswerBounds,
    },
  };
}

/**
 * Convenience helper to quickly test if a question is valid.
 */
export function isValidQuestion(question: any, options?: ValidateQuestionOptions): boolean {
  return validateQuestion(question, options).isValid;
}

/**
 * Helper function to format validation errors into human-readable strings.
 */
export function formatValidationErrors(result: ValidationResult): string[] {
  return result.errors.map((err) => `[${err.field}] (${err.rule}): ${err.message}`);
}
