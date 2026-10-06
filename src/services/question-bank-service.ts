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
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  getDocs,
} from '../lib/supabase-data';
import { db } from '../lib/platform';
import { z } from 'zod';

const STORAGE_KEY = 'bilsem_admin_managed_questions_v2';

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
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try { cb(); } catch {}
    });
  }

  private init() {
    if (this.initialized) return;

    try {
      const stored = safeStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.questions = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse questions from safeStorage', e);
    }

    if (!this.questions || this.questions.length === 0) {
      this.questions = this.buildInitialQuestionPool();
      this.save();
    }

    this.initialized = true;

    // Real-time live Supabase synchronization
    if (typeof window !== 'undefined') {
      try {
        onSnapshot(
          collection(db, 'questions'),
          (snapshot) => {
            if (!snapshot.empty) {
              const liveList = snapshot.docs.map((d: { data: () => BaseQuestion; id: string }) => ({
                ...(d.data() as BaseQuestion),
                id: d.id,
              }));
              this.questions = liveList;
              this.save();
              this.notify();
            }
          },
          (err) => {
            console.warn('Supabase live sync notice (fallback to local cache):', err);
          }
        );
      } catch (err) {
        console.warn('Supabase snapshot setup skipped:', err);
      }
    }
  }

  private buildInitialQuestionPool(): BaseQuestion[] {
    const starterPool: BaseQuestion[] = [];
    const gradePlan: { grade: 1 | 2 | 3 | 4; types: QuestionType[] }[] = [
      { grade: 1, types: ['visual_sequence', 'figure_rotation', 'odd_one_out', 'shape_counting', 'shadow_matching', 'direction_path'] },
      { grade: 2, types: ['matrix_2x2', 'visual_sequence', 'figure_rotation', 'mirror_reflection', 'shape_counting', 'visual_analogy'] },
      { grade: 3, types: ['matrix_3x3', 'figure_rotation', 'number_pattern', 'operation_machine', 'symbol_coding', 'logic_grid'] },
      { grade: 4, types: ['raven_matrix', 'matrix_3x3', 'cube_counting', 'paper_folding', 'balance_scale', 'operation_machine'] },
    ];

    for (const item of gradePlan) {
      item.types.forEach((t, i) => {
        try {
          const diff = Math.min(6, item.grade + (i % 2)) as DifficultyLevel;
          const seed = 50000 + item.grade * 1000 + i * 149;
          const q = generateQuestionByType(t, seed, diff);
          q.id = `q_bilsem_g${item.grade}_${t}_${i + 1}`;
          q.targetGrade = item.grade;
          q.targetGrades = [item.grade];
          q.ageGroup = item.grade <= 2 ? '1-2' : '3-4';
          q.status = 'published';
          q.isCustom = true;
          starterPool.push(q);
        } catch {
          try {
            const fallback = generateQuestionByType('visual_sequence', 20000 + i, 2);
            fallback.id = `q_bilsem_g${item.grade}_seq_${i + 1}`;
            fallback.targetGrade = item.grade;
            fallback.targetGrades = [item.grade];
            fallback.status = 'published';
            fallback.isCustom = true;
            starterPool.push(fallback);
          } catch {}
        }
      });
    }

    return starterPool;
  }

  public seedDefaultPool(): number {
    const starter = this.buildInitialQuestionPool();
    this.questions = starter;
    this.save();
    this.notify();
    return starter.length;
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

  public createCustomQuestion(question: BaseQuestion, syncToCloud = true): BaseQuestion {
    const publishedQ: BaseQuestion = {
      ...question,
      status: question.status || 'published',
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };
    const existingIdx = this.questions.findIndex((q) => q.id === publishedQ.id);
    if (existingIdx !== -1) {
      this.questions[existingIdx] = { ...this.questions[existingIdx], ...publishedQ };
    } else {
      this.questions.unshift(publishedQ);
    }
    this.save();
    this.notify();

    // Live sync to Supabase
    if (syncToCloud) {
      void setDoc(doc(db, 'questions', publishedQ.id), publishedQ).catch((err) => {
        console.warn('Soru Supabase ile senkronize edilemedi:', err);
      });
    }

    return publishedQ;
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
      updatedAt: new Date().toISOString(),
      isCustom: true,
      status: 'published',
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
    this.notify();

    // Live Sync to Supabase
    try {
      setDoc(doc(db, 'questions', newQuestion.id), newQuestion).catch((err) => {
        console.warn('Live Supabase sync error (addQuestion):', err);
      });
    } catch {}

    return newQuestion;
  }

  public addBulkQuestions(newQuestions: BaseQuestion[]): number {
    if (!newQuestions || newQuestions.length === 0) return 0;
    
    const preparedQuestions: BaseQuestion[] = newQuestions.map((q) => ({
      ...q,
      status: q.status || 'published',
      isCustom: true,
      createdAt: q.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Prepend all new questions locally
    this.questions.unshift(...preparedQuestions);
    this.save();
    this.notify();

    // Live Batch Sync to Supabase
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < preparedQuestions.length; i += 400) {
          const chunk = preparedQuestions.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach((q) => {
            batch.set(doc(db, 'questions', q.id), q);
          });
          batch.commit().catch((err) => {
            console.warn('Live Supabase batch sync error (addBulkQuestions):', err);
          });
        }
      } catch (e) {
        console.warn('Supabase batch error:', e);
      }
    }

    return preparedQuestions.length;
  }

  public updateQuestion(id: string, updates: Partial<BaseQuestion>): BaseQuestion | null {
    const idx = this.questions.findIndex((q) => q.id === id);
    if (idx === -1) return null;

    const existing = this.questions[idx];
    const updated: BaseQuestion = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    this.questions[idx] = updated;
    this.save();
    this.notify();

    // Live Sync update to Supabase
    try {
      setDoc(doc(db, 'questions', id), updated, { merge: true }).catch((err) => {
        console.warn('Live Supabase update error:', err);
      });
    } catch {}

    return updated;
  }

  public deleteQuestion(id: string): boolean {
    const initialLen = this.questions.length;
    this.questions = this.questions.filter((q) => q.id !== id);
    if (this.questions.length !== initialLen) {
      this.save();
      this.notify();

      // Live delete from Supabase
      try {
        deleteDoc(doc(db, 'questions', id)).catch((err) => {
          console.warn('Live Supabase delete error:', err);
        });
      } catch {}

      return true;
    }
    return false;
  }

  public deleteBulkQuestions(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialLen = this.questions.length;
    this.questions = this.questions.filter((q) => !idSet.has(q.id));
    this.save();
    this.notify();

    // Live Batch Delete from Supabase
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < ids.length; i += 400) {
          const chunk = ids.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach((id) => {
            batch.delete(doc(db, 'questions', id));
          });
          batch.commit().catch((err) => {
            console.warn('Live Supabase batch delete error:', err);
          });
        }
      } catch (e) {
        console.warn('Supabase toplu silme hatası:', e);
      }
    }

    return initialLen - this.questions.length;
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
      updatedAt: new Date().toISOString(),
      isCustom: true,
      status: 'published',
    };

    this.questions.unshift(clone);
    this.save();
    this.notify();

    // Live Sync clone to Supabase
    try {
      setDoc(doc(db, 'questions', clone.id), clone).catch((err) => {
        console.warn('Live Supabase duplicate error:', err);
      });
    } catch {}

    return clone;
  }

  public resetToDefaults(): BaseQuestion[] {
    const existingIds = this.questions.map((q) => q.id);
    this.questions = [];
    this.save();
    this.notify();

    // Live Wipe from Supabase
    if (typeof window !== 'undefined' && existingIds.length > 0) {
      try {
        getDocs(collection(db, 'questions')).then((snapshot) => {
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((d) => batch.delete(d.ref));
            batch.commit().catch(console.warn);
          }
        }).catch(console.warn);
      } catch {}
    }

    return [];
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

  public importQuestionsJson(jsonString: string): { success: boolean; count: number; rejectedCount?: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      let rawList: unknown[] = [];

      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).questions)) {
        rawList = (parsed as any).questions;
      } else {
        return { success: false, count: 0, error: 'Geçerli bir soru dizisi (questions listesi) bulunamadı.' };
      }

      // Zod Validation Schema for Individual Imported Question
      const importedItemSchema = z.object({
        type: z.string().min(1).max(64),
        prompt: z.string().min(2).max(1000),
        options: z.array(z.object({
          id: z.string().min(1),
          label: z.string().optional(),
          visualData: z.unknown().optional(),
        })).min(2, 'Soru en az 2 seçenek içermelidir.').max(8),
        correctOptionId: z.string().min(1),
        targetGrade: z.number().int().min(1).max(4).optional(),
        category: z.string().optional(),
        difficulty: z.number().min(1).max(6).optional(),
      }).passthrough();

      const sanitizeText = (val: string) =>
        val.replace(/<[^>]*>?/gm, '').trim();

      let importedCount = 0;
      let rejectedCount = 0;

      for (const item of rawList) {
        const result = importedItemSchema.safeParse(item);
        if (!result.success) {
          rejectedCount++;
          continue;
        }

        const validItem = result.data;
        // Verify that correctOptionId actually exists in options
        const hasCorrectOption = validItem.options.some((opt) => opt.id === validItem.correctOptionId);
        if (!hasCorrectOption) {
          rejectedCount++;
          continue;
        }

        const validatedQuestion: BaseQuestion = {
          ...(item as any),
          id: (item as any).id || `q_imported_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          prompt: sanitizeText(validItem.prompt),
          targetGrade: (validItem.targetGrade || ((item as any).ageGroup === '1-2' ? 2 : 3)) as 1 | 2 | 3 | 4,
          category: (validItem.category || 'visual_perception') as CognitiveCategory,
          difficulty: (validItem.difficulty || 3) as DifficultyLevel,
          createdAt: (item as any).createdAt || new Date().toISOString(),
          isCustom: true,
        };

        this.questions.unshift(validatedQuestion);
        importedCount++;
      }

      if (importedCount > 0) {
        this.save();
        return { success: true, count: importedCount, rejectedCount };
      } else {
        return {
          success: false,
          count: 0,
          rejectedCount,
          error: rejectedCount > 0
            ? `${rejectedCount} soru incelendi ancak hiçbiri şema doğrulamalarından (seçenek eşleşmesi, zorunlu alanlar) geçemedi.`
            : 'İçe aktarılacak geçerli formatta soru bulunamadı.',
        };
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
