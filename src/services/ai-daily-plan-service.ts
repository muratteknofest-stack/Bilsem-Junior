import {
  UserProfile,
  SkillMastery,
  MistakeItem,
  AiPersonalizedDailyPlan,
  DailyPlanTask,
  AiPlanWeaknessFocus,
  CognitiveCategory,
} from '../types';
import { dataService } from './data-service';
import { safeStorage } from '../lib/storage';
import { authenticatedFetch } from '../lib/api-client';
import { generateClientAiJson } from '../lib/client-ai-fallback';
import { z } from 'zod';

const STORAGE_KEY_AI_DAILY_PLAN = 'bilsem_ai_personalized_daily_plan';

const cognitiveCategorySchema = z.enum([
  'visual_perception', 'pattern', 'matrix', 'spatial', 'logic',
  'attention', 'memory', 'numerical', 'verbal', 'coding',
]);

const aiDailyPlanResponseSchema = z.object({
  greetingTitle: z.string().min(3).max(120),
  morningCoachMessage: z.string().min(10).max(600),
  motivationalQuote: z.string().min(5).max(240),
  focusWeaknesses: z.array(z.object({
    category: cognitiveCategorySchema,
    categoryName: z.string().min(3).max(100),
    reason: z.string().min(5).max(350),
    currentMastery: z.number().min(0).max(100),
  })).min(1).max(3),
  tasks: z.array(z.object({
    id: z.string().min(1).max(80).optional(),
    title: z.string().min(3).max(120),
    description: z.string().min(5).max(350),
    category: z.union([cognitiveCategorySchema, z.enum(['mistakes', 'adaptive'])]),
    targetCount: z.number().int().min(1).max(30),
    rewardXP: z.number().int().min(5).max(500),
    priority: z.enum(['high', 'medium', 'bonus']),
    actionType: z.enum(['practice_category', 'review_mistakes', 'adaptive_session']),
  })).min(2).max(5),
  totalTargetQuestions: z.number().int().min(1).max(100),
  estimatedMinutes: z.number().int().min(5).max(180),
  dailySuperpowerTarget: z.string().min(3).max(120),
});

class AiDailyPlanService {
  private cachedPlan: AiPersonalizedDailyPlan | null = null;
  private listeners: Set<(plan: AiPersonalizedDailyPlan) => void> = new Set();

  /**
   * Returns today's YYYY-MM-DD date key
   */
  public getTodayDateKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Returns a friendly Turkish date string for the morning
   */
  public getMorningFormattedDate(): string {
    const d = new Date();
    const formatted = d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    });
    return `${formatted} Sabahı`;
  }

  /**
   * Subscribes to plan updates
   */
  public subscribe(listener: (plan: AiPersonalizedDailyPlan) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(plan: AiPersonalizedDailyPlan) {
    this.cachedPlan = plan;
    this.listeners.forEach((fn) => fn(plan));
  }

  /**
   * Fetches or generates today's personalized study plan.
   * Checks if cached plan is from today morning.
   * If a new morning or forceRefresh is true, re-generates via AI.
   */
  public async getTodayPlan(forceRefresh = false): Promise<AiPersonalizedDailyPlan> {
    const todayKey = this.getTodayDateKey();
    const user = dataService.getCurrentUser();
    const masteries = dataService.getSkillMasteries();
    const mistakes = dataService.getMistakes();

    // Check localStorage cache first
    if (!forceRefresh) {
      if (this.cachedPlan && this.cachedPlan.dateKey === todayKey) {
        const synced = this.syncTaskProgressWithUser(this.cachedPlan, user);
        return synced;
      }

      const raw = safeStorage.getItem(STORAGE_KEY_AI_DAILY_PLAN);
      if (raw) {
        try {
          const parsed: AiPersonalizedDailyPlan = JSON.parse(raw);
          // If the plan is from today's morning, use it!
          if (parsed.dateKey === todayKey) {
            const synced = this.syncTaskProgressWithUser(parsed, user);
            this.cachedPlan = synced;
            return synced;
          }
        } catch {}
      }
    }

    // New morning or manual refresh requested: Generate with AI
    const newPlan = await this.fetchAiGeneratedPlan(user, masteries, mistakes);
    this.savePlan(newPlan);
    return newPlan;
  }

  /**
   * Forces generation of a fresh AI plan
   */
  public async refreshPlan(): Promise<AiPersonalizedDailyPlan> {
    return this.getTodayPlan(true);
  }

  /**
   * Fetches the personalized plan from backend Gemini API with procedural fallback
   */
  private async fetchAiGeneratedPlan(
    user: UserProfile,
    masteries: SkillMastery[],
    mistakes: MistakeItem[]
  ): Promise<AiPersonalizedDailyPlan> {
    const todayKey = this.getTodayDateKey();
    const formattedDate = this.getMorningFormattedDate();
    const unresolvedMistakes = mistakes.filter((m) => !m.resolved);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await authenticatedFetch('/api/ai-daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          studentName: user.name.split(' ')[0] || user.name,
          grade: user.grade || 1,
          level: user.level || 1,
          streak: user.streak || 0,
          dailyGoalQuestions: user.dailyGoalQuestions || 10,
          dailyGoalMinutes: user.dailyGoalMinutes || 15,
          todayQuestionsSolved: user.todayQuestionsSolved || 0,
          unresolvedMistakes,
          masteries,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && !data.fallback) {
          const rawTasks: DailyPlanTask[] = (data.tasks || []).map((t: any, idx: number) => ({
            id: t.id || `task-${idx + 1}`,
            title: t.title,
            description: t.description,
            category: t.category,
            targetCount: Number(t.targetCount) || 3,
            completedCount: Number(t.completedCount) || 0,
            rewardXP: Number(t.rewardXP) || 25,
            isCompleted: Boolean(t.isCompleted),
            priority: (t.priority as any) || 'medium',
            actionType: (t.actionType as any) || 'practice_category',
          }));

          const rawFocus: AiPlanWeaknessFocus[] = (data.focusWeaknesses || []).map((f: any) => ({
            category: f.category,
            categoryName: f.categoryName,
            reason: f.reason,
            currentMastery: Number(f.currentMastery) || 0,
            mistakeCount: unresolvedMistakes.filter((m) => m.category === f.category).length,
          }));

          const plan: AiPersonalizedDailyPlan = {
            dateKey: todayKey,
            formattedDate,
            generatedAtTimestamp: Date.now(),
            greetingTitle: data.greetingTitle,
            morningCoachMessage: data.morningCoachMessage,
            motivationalQuote: data.motivationalQuote,
            focusWeaknesses: rawFocus,
            tasks: rawTasks,
            totalTargetQuestions: data.totalTargetQuestions || user.dailyGoalQuestions || 10,
            totalCompletedQuestions: user.todayQuestionsSolved || 0,
            estimatedMinutes: data.estimatedMinutes || user.dailyGoalMinutes || 15,
            dailySuperpowerTarget: data.dailySuperpowerTarget,
            isAiGenerated: true,
            modelUsed: data.modelUsed || 'gemini-3.8-flash',
          };

          return this.syncTaskProgressWithUser(plan, user);
        }
      }
    } catch (err) {
      console.warn('AI Daily Plan API call failed, generating procedural pedagogical plan:', err);
    }

    const firebaseAiPlan = await generateClientAiJson(
      [
        'Gerçek öğrenme verilerine göre bir günlük BİLSEM çalışma planı üret.',
        'Plan kısa, uygulanabilir ve öğrencinin en zayıf alanlarına öncelik veren 2-5 görev içersin.',
        `Öğrenci verisi: ${JSON.stringify({
          firstName: user.name.split(' ')[0] || 'Öğrenci',
          grade: user.grade || 1,
          level: user.level || 1,
          streak: user.streak || 0,
          dailyGoalQuestions: user.dailyGoalQuestions || 10,
          dailyGoalMinutes: user.dailyGoalMinutes || 15,
          todayQuestionsSolved: user.todayQuestionsSolved || 0,
          masteries: masteries.map((item) => ({
            category: item.category,
            categoryName: item.categoryName,
            mastery: item.mastery,
            accuracy: item.accuracy,
          })),
          unresolvedMistakes: unresolvedMistakes.map((item) => ({
            category: item.category,
            questionType: item.questionType,
            difficulty: item.difficulty,
          })),
        })}`,
      ].join('\n'),
      aiDailyPlanResponseSchema,
      7500,
    );
    if (firebaseAiPlan) {
      const tasks: DailyPlanTask[] = firebaseAiPlan.tasks.map((task, index) => ({
        id: task.id || `client-ai-fallback-task-${index + 1}`,
        title: task.title,
        description: task.description,
        category: task.category,
        targetCount: task.targetCount,
        completedCount: 0,
        rewardXP: task.rewardXP,
        isCompleted: false,
        priority: task.priority,
        actionType: task.actionType,
      }));
      const focusWeaknesses: AiPlanWeaknessFocus[] = firebaseAiPlan.focusWeaknesses.map((focus) => ({
        ...focus,
        mistakeCount: unresolvedMistakes.filter((item) => item.category === focus.category).length,
      }));
      const plan: AiPersonalizedDailyPlan = {
        dateKey: todayKey,
        formattedDate,
        generatedAtTimestamp: Date.now(),
        greetingTitle: firebaseAiPlan.greetingTitle,
        morningCoachMessage: firebaseAiPlan.morningCoachMessage,
        motivationalQuote: firebaseAiPlan.motivationalQuote,
        focusWeaknesses,
        tasks,
        totalTargetQuestions: firebaseAiPlan.totalTargetQuestions,
        totalCompletedQuestions: user.todayQuestionsSolved || 0,
        estimatedMinutes: firebaseAiPlan.estimatedMinutes,
        dailySuperpowerTarget: firebaseAiPlan.dailySuperpowerTarget,
        isAiGenerated: true,
        modelUsed: 'Pedagojik yedek',
      };
      return this.syncTaskProgressWithUser(plan, user);
    }

    // High quality procedural fallback based on student's actual weaknesses
    const proceduralPlan = this.generateProceduralPlan(user, masteries, mistakes);
    return this.syncTaskProgressWithUser(proceduralPlan, user);
  }

  /**
   * Generates a pedagogical, weakness-targeted fallback plan
   */
  private generateProceduralPlan(
    user: UserProfile,
    masteries: SkillMastery[],
    mistakes: MistakeItem[]
  ): AiPersonalizedDailyPlan {
    const todayKey = this.getTodayDateKey();
    const formattedDate = this.getMorningFormattedDate();
    const studentFirstName = user.name.split(' ')[0] || 'Genç Kaşif';

    // Sort masteries to find weakest
    const sorted = [...masteries].sort((a, b) => a.mastery - b.mastery);
    const weak1 = sorted[0] || {
      category: 'matrix' as CognitiveCategory,
      categoryName: 'Matris Tamamlama',
      mastery: 58,
    };
    const weak2 = sorted[1] || {
      category: 'pattern' as CognitiveCategory,
      categoryName: 'Örüntü ve Dizi',
      mastery: 65,
    };

    const unresolvedMistakes = mistakes.filter((m) => !m.resolved);

    const focusWeaknesses: AiPlanWeaknessFocus[] = [
      {
        category: weak1.category,
        categoryName: weak1.categoryName,
        reason: `%${weak1.mastery} ustalık seviyesi ile en çok gelişim potansiyeli taşıyan alanın. Satır ve sütun kurallarını kesiştirmeyi pekiştireceğiz.`,
        currentMastery: weak1.mastery,
        mistakeCount: unresolvedMistakes.filter((m) => m.category === weak1.category).length,
      },
      {
        category: weak2.category,
        categoryName: weak2.categoryName,
        reason: `Dizilerdeki adım artış ritmini ve döngüsel geçişleri hızlandırmak sınav kondisyonunu zirveye taşıyacak.`,
        currentMastery: weak2.mastery,
        mistakeCount: unresolvedMistakes.filter((m) => m.category === weak2.category).length,
      },
    ];

    const tasks: DailyPlanTask[] = [
      {
        id: 'task-1',
        title: `1. Odak: ${weak1.categoryName} Güçlendirme`,
        description: `En zayıf başlığın olan ${weak1.categoryName} alanında 4 hedef soru çözerek zihnini ısıt.`,
        category: weak1.category,
        targetCount: 4,
        completedCount: 0,
        rewardXP: 30,
        isCompleted: false,
        priority: 'high',
        actionType: 'practice_category',
      },
      {
        id: 'task-2',
        title: unresolvedMistakes.length > 0 ? '2. Hata Avı: Bekleyen Soruları Fetheyle' : `2. Odak: ${weak2.categoryName} Pratiği`,
        description:
          unresolvedMistakes.length > 0
            ? `Hata Defterinde bekleyen ${unresolvedMistakes.length} sorudan en az 2 tanesini tekrar çözerek süper güç kazan.`
            : `${weak2.categoryName} sorularında 3 soru tamamlayarak örüntü algını güçlendir.`,
        category: unresolvedMistakes.length > 0 ? 'mistakes' : weak2.category,
        targetCount: unresolvedMistakes.length > 0 ? 2 : 3,
        completedCount: 0,
        rewardXP: 40,
        isCompleted: false,
        priority: 'high',
        actionType: unresolvedMistakes.length > 0 ? 'review_mistakes' : 'practice_category',
      },
      {
        id: 'task-3',
        title: '3. Zeka Maratonu: Günlük Hedefi Tamamla',
        description: `Bugün hedeflenen 10 soruluk zeka antrenmanını tamamla ve ${user.streak + 1}. gün serini güvenceye al!`,
        category: 'adaptive',
        targetCount: 4,
        completedCount: 0,
        rewardXP: 50,
        isCompleted: false,
        priority: 'medium',
        actionType: 'adaptive_session',
      },
    ];

    return {
      dateKey: todayKey,
      formattedDate,
      generatedAtTimestamp: Date.now(),
      greetingTitle: `Günaydın ${studentFirstName}! Bugün Zihnini Parlatma Vakti 🚀`,
      morningCoachMessage: `Kayıtlı çalışma sonuçlarına göre bugün "${weak1.categoryName}" ve "${weak2.categoryName}" konularına odaklanan dengeli bir plan hazırladık. Mevcut serin: ${user.streak} gün.`,
      motivationalQuote: 'Her yeni sabah, beynimizin nöronlarını güçlendirmek ve yeni bir zeka kapısı açmak için yepyeni bir fırsattır.',
      focusWeaknesses,
      tasks,
      totalTargetQuestions: user.dailyGoalQuestions || 10,
      totalCompletedQuestions: user.todayQuestionsSolved || 0,
      estimatedMinutes: user.dailyGoalMinutes || 15,
      dailySuperpowerTarget: `${weak1.categoryName} Ustası & Seri Koruyucusu`,
      isAiGenerated: false,
      modelUsed: 'Bilişsel Pedagoji Motoru',
    };
  }

  /**
   * Synchronizes tasks with user's live progress for today
   */
  public syncTaskProgressWithUser(
    plan: AiPersonalizedDailyPlan,
    user: UserProfile
  ): AiPersonalizedDailyPlan {
    const todaySolved = user.todayQuestionsSolved ?? 0;
    const resolvedCount = user.resolvedMistakesCount ?? 0;

    // Distribute questions across tasks
    const updatedTasks = plan.tasks.map((task, index) => {
      let completedCount = task.completedCount;

      if (task.actionType === 'review_mistakes') {
        completedCount = Math.min(task.targetCount, resolvedCount);
      } else if (index === 0) {
        // First task gets credit first
        completedCount = Math.min(task.targetCount, todaySolved);
      } else if (index === 1) {
        const remainingAfterFirst = Math.max(0, todaySolved - plan.tasks[0].targetCount);
        completedCount = Math.min(task.targetCount, remainingAfterFirst);
      } else {
        const remainingAfterTwo = Math.max(
          0,
          todaySolved - (plan.tasks[0].targetCount + plan.tasks[1].targetCount)
        );
        completedCount = Math.min(task.targetCount, remainingAfterTwo);
      }

      return {
        ...task,
        completedCount,
        isCompleted: completedCount >= task.targetCount,
      };
    });

    const updatedPlan: AiPersonalizedDailyPlan = {
      ...plan,
      totalCompletedQuestions: todaySolved,
      tasks: updatedTasks,
    };

    return updatedPlan;
  }

  private savePlan(plan: AiPersonalizedDailyPlan) {
    this.cachedPlan = plan;
    safeStorage.setItem(STORAGE_KEY_AI_DAILY_PLAN, JSON.stringify(plan));
    this.notify(plan);
  }
}

export const aiDailyPlanService = new AiDailyPlanService();
