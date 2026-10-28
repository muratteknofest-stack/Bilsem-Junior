import {
  UserProfile,
  SkillMastery,
  MistakeItem,
  AiPersonalizedDailyPlan,
  DailyPlanTask,
  AiPlanWeaknessFocus,
  CognitiveCategory,
} from '../types';
import { safeStorage } from '../lib/storage';

const STORAGE_KEY_AI_DAILY_PLAN = 'bilsem_ai_personalized_daily_plan';
export const studyPlanStorageKey = (user: Pick<UserProfile, 'id' | 'grade'>) =>
  `${STORAGE_KEY_AI_DAILY_PLAN}:v2:${encodeURIComponent(user.id)}:g${user.grade || 1}`;

export interface LocalStudyPlanSource {
  getCurrentUser(): UserProfile;
  getSkillMasteries(): SkillMastery[];
  getMistakes(): MistakeItem[];
}

export class LocalStudyPlanService {
  constructor(private readonly source: LocalStudyPlanSource) {}
  private cachedScope = '';
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
   * A new day or explicit refresh regenerates the plan locally.
   */
  public async getTodayPlan(forceRefresh = false): Promise<AiPersonalizedDailyPlan> {
    const todayKey = this.getTodayDateKey();
    const user = this.source.getCurrentUser();
    const scope = studyPlanStorageKey(user);
    if (this.cachedScope !== scope) {
      this.cachedPlan = null;
      this.cachedScope = scope;
    }
    // Old unscoped plans can contain another child's name and learning summary.
    // Regenerate from authoritative local progress instead of migrating ownership.
    safeStorage.removeItem(STORAGE_KEY_AI_DAILY_PLAN);
    const masteries = this.source.getSkillMasteries();
    const mistakes = this.source.getMistakes();

    // Check localStorage cache first
    if (!forceRefresh) {
      if (this.cachedPlan && this.cachedPlan.dateKey === todayKey) {
        const synced = this.syncTaskProgressWithUser(this.cachedPlan, user);
        return synced;
      }

      const raw = safeStorage.getItem(scope);
      if (raw) {
        try {
          const stored: { scope?: string; plan?: AiPersonalizedDailyPlan } = JSON.parse(raw);
          const parsed = stored?.scope === scope ? stored.plan : undefined;
          // If the plan is from today's morning, use it!
          if (parsed?.dateKey === todayKey && Array.isArray(parsed.tasks) && Array.isArray(parsed.focusWeaknesses)) {
            const synced = this.syncTaskProgressWithUser(parsed, user);
            this.cachedPlan = synced;
            return synced;
          }
        } catch {}
      }
    }

    // New morning or manual refresh requested: generate locally
    const newPlan = this.syncTaskProgressWithUser(this.generateProceduralPlan(user, masteries, mistakes), user);
    this.savePlan(newPlan, scope);
    return newPlan;
  }

  /**
   * Forces generation of a fresh local plan
   */
  public async refreshPlan(): Promise<AiPersonalizedDailyPlan> {
    return this.getTodayPlan(true);
  }

  /**
   * Generates a pedagogical, weakness-targeted local plan
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

  private savePlan(plan: AiPersonalizedDailyPlan, scope: string) {
    this.cachedPlan = plan;
    this.cachedScope = scope;
    safeStorage.setItem(scope, JSON.stringify({ scope, plan }));
    this.notify(plan);
  }
}


