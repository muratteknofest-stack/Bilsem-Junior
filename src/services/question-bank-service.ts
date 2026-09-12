import {
  BaseQuestion,
  CognitiveCategory,
  DifficultyLevel,
  QuestionType,
  ALL_COGNITIVE_CATEGORIES,
} from '../types';
import { generateQuestionByType, CATEGORY_TYPES_MAP } from '../features/questions/generators';
import { GRADE_CONFIGS, ALL_GRADES } from '../features/questions/grade-config';
import { safeStorage } from '../lib/storage';

const STORAGE_KEY = 'bilsem_admin_managed_questions_v1';

export interface QuestionFilter {
  grade?: 1 | 2 | 3 | 4 | 'all';
  category?: CognitiveCategory | 'all';
  difficulty?: DifficultyLevel | 'all';
  search?: string;
}

export interface QuestionBankStats {
  total: number;
  byGrade: Record<1 | 2 | 3 | 4, number>;
  byCategory: Record<CognitiveCategory, number>;
  byDifficulty: Record<DifficultyLevel, number>;
}

export interface CreateQuestionPayload {
  targetGrade: 1 | 2 | 3 | 4;
  category: CognitiveCategory;
  difficulty: DifficultyLevel;
  type: QuestionType;
  seed?: number;
  prompt?: string;
  secondaryPrompt?: string;
  correctOptionId?: string;
  customExplanationSummary?: string;
  customExplanationSteps?: string[];
}

class QuestionBankService {
  private questions: BaseQuestion[] = [];
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;

    try {
      const stored = safeStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.questions = parsed;
          this.initialized = true;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse questions from safeStorage', e);
    }

    // Default Seeded Questions across 4 grades and 8 cognitive categories
    this.questions = this.buildInitialQuestionPool();
    this.save();
    this.initialized = true;
  }

  private buildInitialQuestionPool(): BaseQuestion[] {
    const pool: BaseQuestion[] = [];
    const baseSeed = 51000;

    // Build curated initial questions for Grade 1
    const g1Configs = [
      { type: 'odd_one_out' as QuestionType, diff: 1 as DifficultyLevel, cat: 'visual_perception' as CognitiveCategory, seed: baseSeed + 101 },
      { type: 'figure_completion' as QuestionType, diff: 2 as DifficultyLevel, cat: 'visual_perception' as CognitiveCategory, seed: baseSeed + 102 },
      { type: 'visual_sequence' as QuestionType, diff: 2 as DifficultyLevel, cat: 'pattern' as CognitiveCategory, seed: baseSeed + 103 },
      { type: 'shape_counting' as QuestionType, diff: 1 as DifficultyLevel, cat: 'attention' as CognitiveCategory, seed: baseSeed + 104 },
      { type: 'symmetry_completion' as QuestionType, diff: 2 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 105 },
      { type: 'direction_path' as QuestionType, diff: 1 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 106 },
      { type: 'shadow_matching' as QuestionType, diff: 2 as DifficultyLevel, cat: 'visual_perception' as CognitiveCategory, seed: baseSeed + 107 },
      { type: 'tangram_puzzle' as QuestionType, diff: 2 as DifficultyLevel, cat: 'visual_perception' as CognitiveCategory, seed: baseSeed + 108 },
      { type: 'maze_path' as QuestionType, diff: 2 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 109 },
      { type: 'detail_detection' as QuestionType, diff: 2 as DifficultyLevel, cat: 'attention' as CognitiveCategory, seed: baseSeed + 110 },
    ];

    g1Configs.forEach((c, idx) => {
      const q = generateQuestionByType(c.type, c.seed, c.diff);
      q.id = `q_gr1_${idx + 1}`;
      q.targetGrade = 1;
      q.targetGrades = [1];
      q.category = c.cat;
      q.ageGroup = '1-2';
      q.estimatedSeconds = GRADE_CONFIGS[1].timeLimitSeconds;
      q.createdAt = new Date(Date.now() - (15 - idx) * 3600000).toISOString();
      pool.push(q);
    });

    // Build curated initial questions for Grade 2
    const g2Configs = [
      { type: 'matrix_2x2' as QuestionType, diff: 3 as DifficultyLevel, cat: 'matrix' as CognitiveCategory, seed: baseSeed + 201 },
      { type: 'mirror_reflection' as QuestionType, diff: 2 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 202 },
      { type: 'figure_rotation' as QuestionType, diff: 3 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 203 },
      { type: 'visual_memory' as QuestionType, diff: 2 as DifficultyLevel, cat: 'memory' as CognitiveCategory, seed: baseSeed + 204 },
      { type: 'classification' as QuestionType, diff: 3 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 205 },
      { type: 'balance_scale' as QuestionType, diff: 3 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 206 },
      { type: 'gear_rotation' as QuestionType, diff: 3 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 207 },
      { type: 'top_view' as QuestionType, diff: 3 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 208 },
      { type: 'punch_folding' as QuestionType, diff: 3 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 209 },
      { type: 'weight_comparison' as QuestionType, diff: 3 as DifficultyLevel, cat: 'numerical' as CognitiveCategory, seed: baseSeed + 210 },
    ];

    g2Configs.forEach((c, idx) => {
      const q = generateQuestionByType(c.type, c.seed, c.diff);
      q.id = `q_gr2_${idx + 1}`;
      q.targetGrade = 2;
      q.targetGrades = [2];
      q.category = c.cat;
      q.ageGroup = '1-2';
      q.estimatedSeconds = GRADE_CONFIGS[2].timeLimitSeconds;
      q.createdAt = new Date(Date.now() - (12 - idx) * 3600000).toISOString();
      pool.push(q);
    });

    // Build curated initial questions for Grade 3
    const g3Configs = [
      { type: 'visual_analogy' as QuestionType, diff: 4 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 301 },
      { type: 'number_pattern' as QuestionType, diff: 3 as DifficultyLevel, cat: 'numerical' as CognitiveCategory, seed: baseSeed + 302 },
      { type: 'symbol_coding' as QuestionType, diff: 4 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 303 },
      { type: 'matrix_3x3' as QuestionType, diff: 4 as DifficultyLevel, cat: 'matrix' as CognitiveCategory, seed: baseSeed + 304 },
      { type: 'logical_sequence' as QuestionType, diff: 3 as DifficultyLevel, cat: 'pattern' as CognitiveCategory, seed: baseSeed + 305 },
      { type: 'operation_machine' as QuestionType, diff: 4 as DifficultyLevel, cat: 'numerical' as CognitiveCategory, seed: baseSeed + 306 },
      { type: 'verbal_analogy' as QuestionType, diff: 4 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 307 },
      { type: 'logic_grid' as QuestionType, diff: 4 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 308 },
      { type: 'multiview_perspective' as QuestionType, diff: 4 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 309 },
      { type: 'spatial_origami' as QuestionType, diff: 4 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 310 },
    ];

    g3Configs.forEach((c, idx) => {
      const q = generateQuestionByType(c.type, c.seed, c.diff);
      q.id = `q_gr3_${idx + 1}`;
      q.targetGrade = 3;
      q.targetGrades = [3];
      q.category = c.cat;
      q.ageGroup = '3-4';
      q.estimatedSeconds = GRADE_CONFIGS[3].timeLimitSeconds;
      q.createdAt = new Date(Date.now() - (9 - idx) * 3600000).toISOString();
      pool.push(q);
    });

    // Build curated initial questions for Grade 4
    const g4Configs = [
      { type: 'matrix_3x3' as QuestionType, diff: 5 as DifficultyLevel, cat: 'matrix' as CognitiveCategory, seed: baseSeed + 401 },
      { type: 'logical_sequence' as QuestionType, diff: 5 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 402 },
      { type: 'spatial_relationship' as QuestionType, diff: 5 as DifficultyLevel, cat: 'spatial' as CognitiveCategory, seed: baseSeed + 403 },
      { type: 'symbol_coding' as QuestionType, diff: 6 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 404 },
      { type: 'visual_analogy' as QuestionType, diff: 5 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 405 },
      { type: 'story_logic' as QuestionType, diff: 5 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 406 },
      { type: 'raven_matrix' as QuestionType, diff: 5 as DifficultyLevel, cat: 'matrix' as CognitiveCategory, seed: baseSeed + 407 },
      { type: 'word_scramble_logic' as QuestionType, diff: 5 as DifficultyLevel, cat: 'pattern' as CognitiveCategory, seed: baseSeed + 408 },
      { type: 'number_pyramid' as QuestionType, diff: 5 as DifficultyLevel, cat: 'numerical' as CognitiveCategory, seed: baseSeed + 409 },
      { type: 'latin_square' as QuestionType, diff: 5 as DifficultyLevel, cat: 'logic' as CognitiveCategory, seed: baseSeed + 410 },
    ];

    g4Configs.forEach((c, idx) => {
      const q = generateQuestionByType(c.type, c.seed, c.diff);
      q.id = `q_gr4_${idx + 1}`;
      q.targetGrade = 4;
      q.targetGrades = [4];
      q.category = c.cat;
      q.ageGroup = '3-4';
      q.estimatedSeconds = GRADE_CONFIGS[4].timeLimitSeconds;
      q.createdAt = new Date(Date.now() - (6 - idx) * 3600000).toISOString();
      pool.push(q);
    });

    return pool;
  }

  private save() {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.questions));
    } catch (e) {
      console.warn('Failed to save questions to safeStorage', e);
    }
  }

  public getAll(): BaseQuestion[] {
    return [...this.questions];
  }

  public getAllQuestions(): BaseQuestion[] {
    return [...this.questions];
  }

  public createCustomQuestion(question: BaseQuestion): BaseQuestion {
    const existingIdx = this.questions.findIndex((q) => q.id === question.id);
    if (existingIdx !== -1) {
      this.questions[existingIdx] = { ...this.questions[existingIdx], ...question };
    } else {
      this.questions.unshift(question);
    }
    this.save();
    return question;
  }

  public getFiltered(filter?: QuestionFilter): BaseQuestion[] {
    let result = [...this.questions];

    if (!filter) return result;

    if (filter.grade && filter.grade !== 'all') {
      const target = filter.grade;
      result = result.filter((q) => q.targetGrade === target || q.targetGrades?.includes(target));
    }

    if (filter.category && filter.category !== 'all') {
      result = result.filter((q) => q.category === filter.category);
    }

    if (filter.difficulty && filter.difficulty !== 'all') {
      result = result.filter((q) => q.difficulty === filter.difficulty);
    }

    if (filter.search && filter.search.trim() !== '') {
      const term = filter.search.toLowerCase().trim();
      result = result.filter(
        (q) =>
          q.prompt.toLowerCase().includes(term) ||
          q.id.toLowerCase().includes(term) ||
          q.type.toLowerCase().includes(term) ||
          q.explanation.ruleTitle.toLowerCase().includes(term)
      );
    }

    return result;
  }

  public addQuestion(payload: CreateQuestionPayload): BaseQuestion {
    const finalSeed = payload.seed || Math.floor(Math.random() * 900000) + 100000;
    const base = generateQuestionByType(payload.type, finalSeed, payload.difficulty);

    const newId = `q_gr${payload.targetGrade}_${Date.now()}`;
    const newQuestion: BaseQuestion = {
      ...base,
      id: newId,
      targetGrade: payload.targetGrade,
      targetGrades: [payload.targetGrade],
      category: payload.category,
      difficulty: payload.difficulty,
      prompt: payload.prompt || base.prompt,
      secondaryPrompt: payload.secondaryPrompt !== undefined ? payload.secondaryPrompt : base.secondaryPrompt,
      correctOptionId: payload.correctOptionId || base.correctOptionId,
      ageGroup: payload.targetGrade <= 2 ? '1-2' : '3-4',
      estimatedSeconds: GRADE_CONFIGS[payload.targetGrade].timeLimitSeconds,
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    if (payload.customExplanationSummary || payload.customExplanationSteps) {
      newQuestion.explanation = {
        ...base.explanation,
        summary: payload.customExplanationSummary || base.explanation.summary,
        steps: payload.customExplanationSteps || base.explanation.steps,
      };
    }

    this.questions.unshift(newQuestion);
    this.save();
    return newQuestion;
  }

  public addBulkQuestions(newQuestions: BaseQuestion[]): number {
    if (!newQuestions || newQuestions.length === 0) return 0;
    // Prepend all new questions
    this.questions.unshift(...newQuestions);
    this.save();
    return newQuestions.length;
  }

  public updateQuestion(id: string, updates: Partial<BaseQuestion>): BaseQuestion | null {
    const idx = this.questions.findIndex((q) => q.id === id);
    if (idx === -1) return null;

    const existing = this.questions[idx];
    const updated: BaseQuestion = {
      ...existing,
      ...updates,
      id: existing.id, // preserve id
    };

    this.questions[idx] = updated;
    this.save();
    return updated;
  }

  public deleteQuestion(id: string): boolean {
    const initialLen = this.questions.length;
    this.questions = this.questions.filter((q) => q.id !== id);
    if (this.questions.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public duplicateQuestion(id: string, targetGrade?: 1 | 2 | 3 | 4): BaseQuestion | null {
    const source = this.questions.find((q) => q.id === id);
    if (!source) return null;

    const grade = targetGrade || source.targetGrade || 1;
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    const clone: BaseQuestion = {
      ...source,
      id: `q_gr${grade}_copy_${Date.now()}`,
      targetGrade: grade,
      targetGrades: [grade],
      seed: newSeed,
      ageGroup: grade <= 2 ? '1-2' : '3-4',
      estimatedSeconds: GRADE_CONFIGS[grade].timeLimitSeconds,
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    this.questions.unshift(clone);
    this.save();
    return clone;
  }

  public resetToDefaults(): BaseQuestion[] {
    this.questions = this.buildInitialQuestionPool();
    this.save();
    return [...this.questions];
  }

  public exportQuestionsJson(gradeFilter?: 1 | 2 | 3 | 4 | 'all'): string {
    const data = this.getFiltered({ grade: gradeFilter });
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        gradeFilter: gradeFilter || 'all',
        total: data.length,
        questions: data,
      },
      null,
      2
    );
  }

  public importQuestionsJson(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      let list: any[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && Array.isArray(parsed.questions)) {
        list = parsed.questions;
      } else {
        return { success: false, count: 0, error: 'Geçerli bir soru dizisi (questions listesi) bulunamadı.' };
      }

      let importedCount = 0;
      for (const item of list) {
        if (item && item.type && item.prompt && item.options) {
          const validatedQuestion: BaseQuestion = {
            ...item,
            id: item.id || `q_imported_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            targetGrade: item.targetGrade || (item.ageGroup === '1-2' ? 2 : 3),
            category: item.category || 'visual_perception',
            difficulty: item.difficulty || 3,
            createdAt: item.createdAt || new Date().toISOString(),
            isCustom: true,
          };
          this.questions.unshift(validatedQuestion);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        this.save();
        return { success: true, count: importedCount };
      } else {
        return { success: false, count: 0, error: 'İçe aktarılacak geçerli formatta soru bulunamadı.' };
      }
    } catch (e: any) {
      return { success: false, count: 0, error: e?.message || 'JSON ayrıştırma hatası' };
    }
  }

  public getStats(): QuestionBankStats {
    const byGrade: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const byCategory: Record<CognitiveCategory, number> = {
      visual_perception: 0,
      pattern: 0,
      matrix: 0,
      spatial: 0,
      logic: 0,
      attention: 0,
      memory: 0,
      numerical: 0,
      verbal: 0,
      coding: 0,
    };
    const byDifficulty: Record<DifficultyLevel, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    };

    for (const q of this.questions) {
      const g = (q.targetGrade || 1) as 1 | 2 | 3 | 4;
      if (byGrade[g] !== undefined) byGrade[g]++;

      if (byCategory[q.category] !== undefined) {
        byCategory[q.category]++;
      }

      if (byDifficulty[q.difficulty] !== undefined) {
        byDifficulty[q.difficulty]++;
      }
    }

    return {
      total: this.questions.length,
      byGrade,
      byCategory,
      byDifficulty,
    };
  }
}

export const questionBankService = new QuestionBankService();
