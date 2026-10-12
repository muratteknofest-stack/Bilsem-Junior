import { COLORFUL_TYPES, generateColorfulQuestion } from '../colorful-engine';
import { professionalGradeTypes } from '../reasoning-profile';
import { gradeDifficulty, isSchoolGrade, type SchoolGrade } from '../quality-policy';
import { assertQuestionReadyForStudents, isQuestionReadyForStudents } from '../quality';
import { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { GRADE_CONFIGS } from '../grade-config';
import { VERIFIED_TYPES, RECOVERED_TYPES, STUDENT_TYPES, generateProfessionalQuestion } from '../professional-engine';
import { generateRecoveredQuestion } from '../recovered-engine';
import { ALL_TOPIC_TYPES, TOPIC_CATEGORY_TYPES, WORKSHOP_TYPES, topicAllowedForGrade } from '../topic-catalog';
import { generateWorkshopQuestion } from '../workshop-engine';

export const ALL_QUESTION_TYPES = ALL_TOPIC_TYPES;
export const STUDENT_CATEGORY_TYPES = TOPIC_CATEGORY_TYPES;
export const CATEGORY_TYPES_MAP = TOPIC_CATEGORY_TYPES;

export function generateQuestionByType(
  type: QuestionType,
  seed: number,
  difficulty: DifficultyLevel = 3,
  _retryCount = 0
): BaseQuestion {
  let question: BaseQuestion;
  if (COLORFUL_TYPES.includes(type)) {
    question = generateColorfulQuestion(type, seed, difficulty);
  } else if (WORKSHOP_TYPES.includes(type)) {
    question = generateWorkshopQuestion(type, seed, difficulty);
  } else if (RECOVERED_TYPES.includes(type)) {
    question = generateRecoveredQuestion(type, seed, difficulty);
  } else if (VERIFIED_TYPES.includes(type)) {
    question = generateProfessionalQuestion(type, seed, difficulty);
  } else {
    throw new Error('UNKNOWN_QUESTION_TYPE: Soru türü tanınmıyor.');
  }
  assertQuestionReadyForStudents(question);
  return question;
}

export function generateQuestion(options: {
  profile?: 'professional';
  targetGrade?: SchoolGrade;
  category?: CognitiveCategory | 'mixed';
  difficulty?: DifficultyLevel;
  seed?: number;
  type?: QuestionType;
}): BaseQuestion {
  const seed = options.seed ?? Math.floor(Math.random() * 999999) + 1;
  if (!Number.isSafeInteger(seed) || seed < 1 || options.targetGrade !== undefined && !isSchoolGrade(options.targetGrade) || options.difficulty !== undefined && (!Number.isInteger(options.difficulty) || options.difficulty < 1 || options.difficulty > 6)) throw new Error('INVALID_GENERATION_INPUT: Sınıf, zorluk veya tohum geçersiz.');
  const rng = new SeededRNG(seed);
  const difficulty = options.targetGrade ? gradeDifficulty(options.targetGrade, options.difficulty ?? 3) : options.difficulty ?? 3;
  const allowed = (type: QuestionType) => topicAllowedForGrade(type, options.targetGrade) && (options.profile !== 'professional' || professionalGradeTypes(options.targetGrade || 4).includes(type));

  let chosenType: QuestionType;

  if (options.type) {
    if (!STUDENT_TYPES.includes(options.type)) throw new Error('QUESTION_REVIEW_REQUIRED: Bu türün bağımsız doğrulaması henüz yok.');
    if (options.category && options.category !== 'mixed' && !STUDENT_CATEGORY_TYPES[options.category]?.includes(options.type)) throw new Error('CATEGORY_MISMATCH: İstenen tür ve kategori uyuşmuyor.');
    if (!allowed(options.type)) throw new Error('Soru türü sınıf profilinde desteklenmiyor.');
    chosenType = options.type;
  } else if (options.category && options.category !== 'mixed') {
    const pool = (STUDENT_CATEGORY_TYPES[options.category] || []).filter(allowed);
    if (!pool.length) throw new Error('CATEGORY_UNAVAILABLE: Bu kategoride doğrulanmış soru bulunmuyor.');
    chosenType = rng.pick(pool);
  } else {
    chosenType = rng.pick(STUDENT_TYPES.filter(allowed));
  }

  let lastFailure = '';
  for (let attempt = 0; attempt < 16; attempt++) {
    try {
      const question = generateQuestionByType(chosenType, (seed % 2147483647 + attempt * 10007) % 2147483647 || 1, difficulty);
      if (isSchoolGrade(options.targetGrade)) {
        question.targetGrade = options.targetGrade; question.targetGrades = [options.targetGrade];
        question.ageGroup = options.targetGrade <= 2 ? '1-2' : '3-4';
      }
      if (isQuestionReadyForStudents(question)) return question;
      lastFailure = 'Sınıf profili veya içerik kontrolü başarısız.';
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : 'Üretim başarısız.';
    }
  }
  throw new Error('QUESTION_REVIEW_REQUIRED: 16 denemede doğrulanmış soru üretilemedi. ' + lastFailure);
}

export function generateQuestionForGrade(
  grade: 1 | 2 | 3 | 4,
  seed?: number,
  type?: QuestionType,
  difficulty?: DifficultyLevel
): BaseQuestion {
  if (!isSchoolGrade(grade)) throw new Error('Hedef sınıf 1–4 olmalı.');
  const cfg = GRADE_CONFIGS[grade];
  const finalSeed = seed ?? Math.floor(Math.random() * 900000) + 100000;
  const rng = new SeededRNG(finalSeed);

  const finalType = type ?? rng.pick(cfg.recommendedTypes.filter(t => STUDENT_TYPES.includes(t)));
  const finalDifficulty = difficulty ?? cfg.defaultDifficulty;

  return generateQuestion({ type: finalType, seed: finalSeed, difficulty: finalDifficulty, targetGrade: grade });
}


