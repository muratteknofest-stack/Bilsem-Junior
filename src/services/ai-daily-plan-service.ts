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

const STORAGE_KEY_AI_DAILY_PLAN = 'bilsem_ai_personalized_daily_plan';

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

      const response = await fetch('/api/ai-daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          studentName: user.name.split(' ')[0] || user.name,
          grade: user.grade || 3,
          level: user.level || 4,
          streak: user.streak || 5,
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
            currentMastery: Number(f.currentMastery) || 50,
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
      morningCoachMessage: `Dünkü ${user.streak} günlük harika serin sayesinde harika bir ritim yakaladın. Bu sabah yapay zeka analizimize göre en çok gelişim bekleyen "${weak1.categoryName}" ve "${weak2.categoryName}" konularına odaklanarak seviyeni bir üst basamağa taşıyoruz!`,
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
