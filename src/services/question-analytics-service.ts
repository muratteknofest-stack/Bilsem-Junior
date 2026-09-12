import {
  BaseQuestion,
  CognitiveCategory,
  DifficultyLevel,
  COGNITIVE_CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  ALL_COGNITIVE_CATEGORIES,
} from '../types';
import { questionBankService } from './question-bank-service';
import { dataService } from './data-service';
import { safeStorage } from '../lib/storage';

export interface CategorySuccessMetric {
  category: CognitiveCategory;
  categoryName: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  successRate: number; // 0 - 100%
  avgTimeSeconds: number;
  targetTimeSeconds: number;
  hardestQuestionId?: string;
  hardestQuestionPrompt?: string;
  hardestQuestionRate?: number;
  challengeStatus: 'optimal' | 'moderate' | 'high_friction';
  primaryCognitiveTrap: string;
}

export interface DifficultySuccessMetric {
  difficulty: DifficultyLevel;
  label: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  successRate: number; // 0 - 100%
  expectedBenchmarkRate: number; // e.g. Level 1: 92%, Level 6: 38%
  deltaFromBenchmark: number; // actual - expected
  avgTimeSeconds: number;
  recommendedGrade: string;
}

export interface CrossMatrixCell {
  category: CognitiveCategory;
  difficulty: DifficultyLevel;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  successRate: number;
  avgTimeSeconds: number;
  status: 'optimal' | 'moderate' | 'challenging' | 'critical';
  questionCount: number;
  hardestPrompt?: string;
}

export interface ChallengingQuestionRecord {
  question: BaseQuestion;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  successRate: number; // 0 - 100%
  avgTimeSeconds: number;
  targetTimeSeconds: number;
  timeOverrunPct: number; // % slower than target
  mostCommonDistractorOptionId: string;
  distractorPickRate: number; // e.g. %48
  distractorExplanation: string;
  pedagogicalChallengeReason: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface PedagogicalInsight {
  id: string;
  type: 'critical_warning' | 'timing_friction' | 'distractor_trap' | 'positive_strength';
  title: string;
  description: string;
  targetCategory?: CognitiveCategory;
  targetDifficulty?: DifficultyLevel;
  actionRecommendation: string;
}

export interface QuestionAnalyticsSummary {
  overall: {
    totalQuestions: number;
    totalAttempts: number;
    overallSuccessRate: number;
    avgTimeSeconds: number;
    challengingCount: number; // questions with < 65% success rate
    criticalCount: number; // questions with < 50% success rate
    hardestCategory: { category: CognitiveCategory; name: string; rate: number };
    easiestCategory: { category: CognitiveCategory; name: string; rate: number };
    hardestDifficulty: { difficulty: DifficultyLevel; label: string; rate: number };
  };
  byCategory: CategorySuccessMetric[];
  byDifficulty: DifficultySuccessMetric[];
  crossMatrix: CrossMatrixCell[];
  challengingQuestions: ChallengingQuestionRecord[];
  pedagogicalInsights: PedagogicalInsight[];
}

export interface AnalyticsFilter {
  grade?: 1 | 2 | 3 | 4 | 'all';
  category?: CognitiveCategory | 'all';
  difficulty?: DifficultyLevel | 'all';
  timeRange?: '7d' | '30d' | 'all';
  searchQuery?: string;
  successRateFilter?: 'all' | 'very_easy' | 'very_hard';
}

const STORAGE_KEY_USER_STATS = 'bilsem_question_live_analytics_v1';

// Seeded cognitive traps and distractor reasons mapped by type and category
const CATEGORY_TRAPS: Record<CognitiveCategory, string> = {
  spatial: '90° ile 180° rotasyon ve ayna simetrisi eksenlerinin karıştırılması',
  matrix: 'Satır ve sütundaki çoklu kural akışında (şekil + renk) renk tuzağına düşme',
  pattern: 'Dönemsel döngü örüntüsünün son elemanında kural yönünü ters uygulama',
  logic: 'Sembolik kodlama veya kıyaslamada öncüllerin sıralama hatası',
  attention: 'Küçük geometrik iç parçaların veya benzer sembollerin gözden kaçırılması',
  numerical: 'Görsel terazi dengesi veya sayı örüntüsündeki çift adımlı artış karmaşası',
  memory: 'Arka arkaya sunulan figürlerin yerleşim koordinatlarının unutulması',
  visual_perception: 'Dış sınır çizgisi benzerliği nedeniyle iç detayların atlanması',
  verbal: 'Kelime anlam ilişkilerinde yapısal değil tanımsal benzerliğe aldanma',
  coding: 'Döngü veya koşul adımlarından birini atlama',
};

const BENCHMARK_RATES: Record<DifficultyLevel, number> = {
  1: 91,
  2: 83,
  3: 72,
  4: 61,
  5: 49,
  6: 36,
};

class QuestionAnalyticsService {
  private userLiveStats: Record<
    string,
    { attempts: number; correct: number; totalTime: number; optionPicks: Record<string, number> }
  > = {};

  constructor() {
    this.loadUserLiveStats();
  }

  private loadUserLiveStats() {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY_USER_STATS);
      if (raw) {
        this.userLiveStats = JSON.parse(raw);
      }
    } catch (e) {
      this.userLiveStats = {};
    }
  }

  private saveUserLiveStats() {
    try {
      safeStorage.setItem(STORAGE_KEY_USER_STATS, JSON.stringify(this.userLiveStats));
    } catch (e) {
      console.warn('Failed to save user live stats', e);
    }
  }

  /**
   * Records a student attempt (e.g. from Practice Simulator or Student Session)
   */
  public recordAttempt(questionId: string, isCorrect: boolean, selectedOptionId: string, timeSpentSeconds: number) {
    if (!this.userLiveStats[questionId]) {
      this.userLiveStats[questionId] = {
        attempts: 0,
        correct: 0,
        totalTime: 0,
        optionPicks: {},
      };
    }

    const item = this.userLiveStats[questionId];
    item.attempts += 1;
    if (isCorrect) item.correct += 1;
    item.totalTime += timeSpentSeconds;
    item.optionPicks[selectedOptionId] = (item.optionPicks[selectedOptionId] || 0) + 1;

    this.saveUserLiveStats();
  }

  /** Returns only attempts actually captured by the local admin simulator. */
  private getRecordedStatsForQuestion(q: BaseQuestion) {
    const live = this.userLiveStats[q.id];
    const totalAttempts = live?.attempts || 0;
    const correctCount = live?.correct || 0;
    const wrongCount = Math.max(0, totalAttempts - correctCount);
    const calculatedRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
    const avgTimeSeconds = totalAttempts > 0 ? Math.round(((live?.totalTime || 0) / totalAttempts) * 10) / 10 : 0;

    // Distractor analysis: identify which wrong option was picked the most
    const wrongOptions = q.options.filter((opt) => opt.id !== q.correctOptionId);
    let topDistractorId = wrongOptions[0]?.id || 'B';
    let topDistractorPickRate = 0;
    if (live && wrongOptions.length > 0) {
      let maxPick = 0;
      wrongOptions.forEach((opt) => {
        const picks = live.optionPicks[opt.id] || 0;
        if (picks > maxPick) {
          maxPick = picks;
          topDistractorId = opt.id;
        }
      });
      topDistractorPickRate = wrongCount > 0 ? Math.round((maxPick / wrongCount) * 100) : 0;
    }

    return {
      totalAttempts,
      correctCount,
      wrongCount,
      successRate: calculatedRate,
      avgTimeSeconds,
      topDistractorId,
      topDistractorPickRate,
    };
  }

  /**
   * Main computation: Generates complete analytics summary across categories, difficulties, and questions
   */
  public getAnalytics(filter?: AnalyticsFilter): QuestionAnalyticsSummary {
    const allQuestions = questionBankService.getAll();
    const grade = filter?.grade || 'all';
    const categoryFilter = filter?.category || 'all';
    const difficultyFilter = filter?.difficulty || 'all';
    const searchQuery = (filter?.searchQuery || '').toLowerCase().trim();

    // 1. Filter questions
    let filteredQuestions = allQuestions.filter((q) => {
      if (grade !== 'all') {
        const matchesGrade = q.targetGrade === grade || q.targetGrades?.includes(grade);
        if (!matchesGrade) return false;
      }
      if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (searchQuery) {
        const matchPrompt = q.prompt.toLowerCase().includes(searchQuery);
        const matchId = q.id.toLowerCase().includes(searchQuery);
        const matchRule = q.explanation.ruleTitle.toLowerCase().includes(searchQuery);
        if (!matchPrompt && !matchId && !matchRule) return false;
      }
      return true;
    });

    // 2. Compute individual question stats
    const questionRecords: ChallengingQuestionRecord[] = [];

    filteredQuestions.forEach((q) => {
      const stats = this.getRecordedStatsForQuestion(q);
      if (stats.totalAttempts === 0) return;
      const targetTime = q.estimatedSeconds || 40;
      const overrunPct = Math.round(((stats.avgTimeSeconds - targetTime) / targetTime) * 100);

      // Severity classification
      let severity: 'critical' | 'high' | 'medium' = 'medium';
      if (stats.successRate < 50 || overrunPct > 35) {
        severity = 'critical';
      } else if (stats.successRate < 65 || overrunPct > 20) {
        severity = 'high';
      }

      const distractorExp =
        q.explanation.steps[0] || 'Kuralın son adımındaki dönüşüm veya desen sırası yanıltıcı bulundu.';

      questionRecords.push({
        question: q,
        totalAttempts: stats.totalAttempts,
        correctCount: stats.correctCount,
        wrongCount: stats.wrongCount,
        successRate: stats.successRate,
        avgTimeSeconds: stats.avgTimeSeconds,
        targetTimeSeconds: targetTime,
        timeOverrunPct: Math.max(0, overrunPct),
        mostCommonDistractorOptionId: stats.topDistractorId,
        distractorPickRate: stats.topDistractorPickRate,
        distractorExplanation: distractorExp,
        pedagogicalChallengeReason:
          CATEGORY_TRAPS[q.category] || 'Öğrenciler seçenekler arasındaki ince açı ve desen farkını kaçırmaktadır.',
        severity,
      });
    });

    // Sort questions by challenge level (lowest success rate first)
    questionRecords.sort((a, b) => a.successRate - b.successRate);

    // 3. Aggregate By Category (for all 8 categories)
    const byCategory: CategorySuccessMetric[] = ALL_COGNITIVE_CATEGORIES.map((cat) => {
      const catQuestions = questionRecords.filter((r) => r.question.category === cat);
      const totalAttempts = catQuestions.reduce((acc, curr) => acc + curr.totalAttempts, 0);
      const correctCount = catQuestions.reduce((acc, curr) => acc + curr.correctCount, 0);
      const wrongCount = totalAttempts - correctCount;
      const successRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
      const totalTime = catQuestions.reduce((acc, curr) => acc + curr.avgTimeSeconds * curr.totalAttempts, 0);
      const avgTimeSeconds = totalAttempts > 0 ? Math.round((totalTime / totalAttempts) * 10) / 10 : 0;
      const targetTimeSeconds = 40;

      const hardestQ = catQuestions[0]; // already sorted ascending by successRate

      let challengeStatus: 'optimal' | 'moderate' | 'high_friction' = 'optimal';
      if (successRate < 60) challengeStatus = 'high_friction';
      else if (successRate < 75) challengeStatus = 'moderate';

      return {
        category: cat,
        categoryName: COGNITIVE_CATEGORY_LABELS[cat],
        totalAttempts,
        correctCount,
        wrongCount,
        successRate,
        avgTimeSeconds,
        targetTimeSeconds,
        hardestQuestionId: hardestQ?.question.id,
        hardestQuestionPrompt: hardestQ?.question.prompt,
        hardestQuestionRate: hardestQ?.successRate,
        challengeStatus,
        primaryCognitiveTrap: CATEGORY_TRAPS[cat],
      };
    });

    // 4. Aggregate By Difficulty (1 to 6)
    const allDifficulties: DifficultyLevel[] = [1, 2, 3, 4, 5, 6];
    const byDifficulty: DifficultySuccessMetric[] = allDifficulties.map((diff) => {
      const diffQuestions = questionRecords.filter((r) => r.question.difficulty === diff);
      const totalAttempts = diffQuestions.reduce((acc, curr) => acc + curr.totalAttempts, 0);
      const correctCount = diffQuestions.reduce((acc, curr) => acc + curr.correctCount, 0);
      const wrongCount = totalAttempts - correctCount;
      const successRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
      const benchmark = BENCHMARK_RATES[diff];
      const totalTime = diffQuestions.reduce((acc, curr) => acc + curr.avgTimeSeconds * curr.totalAttempts, 0);
      const avgTimeSeconds = totalAttempts > 0 ? Math.round((totalTime / totalAttempts) * 10) / 10 : 0;

      const gradeLabels: Record<DifficultyLevel, string> = {
        1: '1. Sınıf Başlangıç',
        2: '1-2. Sınıf Standart',
        3: '2-3. Sınıf Orta Seviye',
        4: '3-4. Sınıf İleri Düzey',
        5: '4. Sınıf BİLSEM Seçme',
        6: 'BİLSEM Üstün Yetenek & Final',
      };

      return {
        difficulty: diff,
        label: DIFFICULTY_LABELS[diff],
        totalAttempts,
        correctCount,
        wrongCount,
        successRate,
        expectedBenchmarkRate: benchmark,
        deltaFromBenchmark: successRate - benchmark,
        avgTimeSeconds,
        recommendedGrade: gradeLabels[diff],
      };
    });

    // 5. Cross Matrix Heatmap (8 Categories x 6 Difficulties)
    const crossMatrix: CrossMatrixCell[] = [];
    ALL_COGNITIVE_CATEGORIES.forEach((cat) => {
      allDifficulties.forEach((diff) => {
        const cellQuestions = questionRecords.filter(
          (r) => r.question.category === cat && r.question.difficulty === diff
        );
        const qCount = cellQuestions.length;
        const totalAttempts = cellQuestions.reduce((acc, curr) => acc + curr.totalAttempts, 0);
        const correctCount = cellQuestions.reduce((acc, curr) => acc + curr.correctCount, 0);
        const wrongCount = totalAttempts - correctCount;
        const successRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
        const totalTime = cellQuestions.reduce((acc, curr) => acc + curr.avgTimeSeconds * curr.totalAttempts, 0);
        const avgTimeSeconds = totalAttempts > 0 ? Math.round((totalTime / totalAttempts) * 10) / 10 : 0;

        let status: 'optimal' | 'moderate' | 'challenging' | 'critical' = 'optimal';
        if (successRate < 50) status = 'critical';
        else if (successRate < 65) status = 'challenging';
        else if (successRate < 78) status = 'moderate';

        crossMatrix.push({
          category: cat,
          difficulty: diff,
          totalAttempts,
          correctCount,
          wrongCount,
          successRate,
          avgTimeSeconds,
          status,
          questionCount: qCount,
          hardestPrompt: cellQuestions[0]?.question.prompt,
        });
      });
    });

    // 6. Overall Metrics
    const totalAllAttempts = questionRecords.reduce((acc, curr) => acc + curr.totalAttempts, 0);
    const totalAllCorrect = questionRecords.reduce((acc, curr) => acc + curr.correctCount, 0);
    const overallSuccessRate =
      totalAllAttempts > 0 ? Math.round((totalAllCorrect / totalAllAttempts) * 100) : 0;
    const totalWeightedTime = questionRecords.reduce((acc, curr) => acc + curr.avgTimeSeconds * curr.totalAttempts, 0);
    const avgTimeSeconds =
      totalAllAttempts > 0 ? Math.round((totalWeightedTime / totalAllAttempts) * 10) / 10 : 0;

    // Hardest & easiest categories
    const sortedCategories = [...byCategory].filter((c) => c.totalAttempts > 0).sort((a, b) => a.successRate - b.successRate);
    const hardestCatItem = sortedCategories[0];
    const hardestCategory = {
      category: hardestCatItem ? hardestCatItem.category : ('spatial' as CognitiveCategory),
      name: hardestCatItem ? hardestCatItem.categoryName : 'Henüz veri yok',
      rate: hardestCatItem ? hardestCatItem.successRate : 0,
    };

    const easiestCatItem = sortedCategories[sortedCategories.length - 1];
    const easiestCategory = {
      category: easiestCatItem ? easiestCatItem.category : ('visual_perception' as CognitiveCategory),
      name: easiestCatItem ? easiestCatItem.categoryName : 'Henüz veri yok',
      rate: easiestCatItem ? easiestCatItem.successRate : 0,
    };

    // Hardest difficulty
    const sortedDifficulties = [...byDifficulty].filter((d) => d.totalAttempts > 0).sort((a, b) => a.successRate - b.successRate);
    const hardestDiffItem = sortedDifficulties[0];
    const hardestDifficulty = {
      difficulty: hardestDiffItem ? hardestDiffItem.difficulty : (6 as DifficultyLevel),
      label: hardestDiffItem ? hardestDiffItem.label : 'Henüz veri yok',
      rate: hardestDiffItem ? hardestDiffItem.successRate : 0,
    };

    // Success Rate list filter
    let challengingList = questionRecords;
    if (filter?.successRateFilter === 'very_easy') {
      challengingList = questionRecords.filter((r) => r.successRate > 85);
    } else if (filter?.successRateFilter === 'very_hard') {
      challengingList = questionRecords.filter((r) => r.successRate < 40);
    }

    // 7. Generate Pedagogical Insights
    const pedagogicalInsights: PedagogicalInsight[] = [];
    if (hardestCatItem) {
      pedagogicalInsights.push({
        id: 'ins_1',
        type: 'critical_warning',
        title: `${hardestCategory.name} için inceleme önerisi`,
        description: `Kaydedilmiş ${hardestCatItem.totalAttempts} simülatör yanıtında başarı oranı %${hardestCategory.rate} olarak ölçüldü.`,
        targetCategory: hardestCategory.category,
        actionRecommendation:
          'Daha güvenilir bir yorum için farklı sorularda ek test yanıtları kaydedin ve çeldirici dağılımını inceleyin.',
      });
    }
    const topDistractor = questionRecords
      .filter((record) => record.wrongCount > 0)
      .sort((a, b) => b.distractorPickRate - a.distractorPickRate)[0];
    if (topDistractor) {
      pedagogicalInsights.push({
        id: 'ins_2',
        type: 'distractor_trap',
        title: 'En sık seçilen çeldirici',
        description: `${topDistractor.question.id} sorusunda yanlış yanıtların %${topDistractor.distractorPickRate} kadarı ${topDistractor.mostCommonDistractorOptionId} seçeneğinde toplandı.`,
        targetCategory: topDistractor.question.category,
        targetDifficulty: topDistractor.question.difficulty,
        actionRecommendation: 'Soru kökünü ve bu çeldiricinin görsel/mantıksal ayrımını yeniden gözden geçirin.',
      });
    }

    return {
      overall: {
        totalQuestions: questionRecords.length,
        totalAttempts: totalAllAttempts,
        overallSuccessRate,
        avgTimeSeconds,
        challengingCount: questionRecords.filter((r) => r.successRate < 65).length,
        criticalCount: questionRecords.filter((r) => r.successRate < 50).length,
        hardestCategory,
        easiestCategory,
        hardestDifficulty,
      },
      byCategory,
      byDifficulty,
      crossMatrix,
      challengingQuestions: challengingList,
      pedagogicalInsights,
    };
  }

  /**
   * Resets any recorded live test attempts
   */
  public resetLiveStats() {
    this.userLiveStats = {};
    safeStorage.removeItem(STORAGE_KEY_USER_STATS);
  }
}

export const questionAnalyticsService = new QuestionAnalyticsService();
