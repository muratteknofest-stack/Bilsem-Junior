import {
  CognitiveCategory,
  ALL_COGNITIVE_CATEGORIES,
  WeeklyCategoryChallenge,
  WeeklyChallengesState,
  WeeklyBadgeReward,
  Achievement,
  UserProfile,
} from '../types';
import { dataService } from './data-service';
import { safeStorage } from '../lib/storage';

const STORAGE_KEY_CHALLENGES = 'bilsem_weekly_category_challenges_v1';

export class WeeklyChallengesService {
  /**
   * Generates a stable ISO-like week identifier: e.g. "2026-W37"
   */
  getWeekIdentifier(d: Date = new Date()): { weekId: string; year: number; weekNumber: number } {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const year = date.getUTCFullYear();
    return {
      weekId: `${year}-W${weekNo < 10 ? '0' : ''}${weekNo}`,
      year,
      weekNumber: weekNo,
    };
  }

  /**
   * Calculates formatted dates and remaining time for the current week (resets Sunday midnight)
   */
  getWeekTimeContext(d: Date = new Date()) {
    const now = new Date(d);
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday

    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const msRemaining = Math.max(0, sunday.getTime() - now.getTime());
    const hoursRemainingTotal = Math.floor(msRemaining / (1000 * 60 * 60));
    const daysRemaining = Math.floor(hoursRemainingTotal / 24);
    const hoursRemaining = hoursRemainingTotal % 24;

    const formatOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const startDateFormatted = monday.toLocaleDateString('tr-TR', formatOpts);
    const endDateFormatted = sunday.toLocaleDateString('tr-TR', { ...formatOpts, year: 'numeric' });

    return {
      startDateFormatted,
      endDateFormatted,
      daysRemaining,
      hoursRemaining,
    };
  }

  /**
   * Builds the curated weekly category challenges configuration
   */
  getDefaultChallengesForWeek(weekId: string): WeeklyCategoryChallenge[] {
    const categoryConfigs: {
      category: CognitiveCategory;
      categoryName: string;
      title: string;
      description: string;
      pedagogicalObjective: string;
      targetQuestions: number;
      initialCompleted: number;
      bonusXP: number;
      badge: WeeklyBadgeReward;
    }[] = [
      {
        category: 'pattern',
        categoryName: 'Örüntü ve Dizi Analizi',
        title: 'Örüntü ve Dizi Dedektifi',
        description: 'Sayısal ve geometrik dizi kurallarını keşfederek 8 örüntü sorusu tamamla.',
        pedagogicalObjective: 'Görsel tekrar kalıplarını, artış-azalış kuralını ve ardışık ilişkileri sezgisel kavrama.',
        targetQuestions: 8,
        initialCompleted: 5,
        bonusXP: 120,
        badge: {
          id: `badge-${weekId}-pattern`,
          title: 'Örüntü Şifre Çözücü',
          badgeIcon: '🧩',
          tier: 'silver',
          rarityLabel: 'Gümüş Rozet',
          description: 'Haftalık Örüntü ve Dizi Meydan Okumasını başarıyla tamamlayarak kazanıldı.',
          pedagogyBenefit: 'Kural türetme ve sıralı örüntü mantığı pekiştirildi.',
          xpReward: 120,
        },
      },
      {
        category: 'matrix',
        categoryName: 'Matris Tamamlama',
        title: 'Matris & Raven Mimarı',
        description: '2x2 ve 3x3 mantık matrislerinde satır-sütun kurallarını çözerek 8 soru tamamla.',
        pedagogicalObjective: 'Raven İleri Progresif Matris formatında çok yönlü analitik kural türetme.',
        targetQuestions: 8,
        initialCompleted: 6,
        bonusXP: 150,
        badge: {
          id: `badge-${weekId}-matrix`,
          title: 'Matris Zirve Muhafızı',
          badgeIcon: '📐',
          tier: 'gold',
          rarityLabel: 'Altın Rozet',
          description: 'Haftalık Matris Meydan Okumasını tam puanla bitirerek kazanıldı.',
          pedagogyBenefit: 'Soyut muhakeme ve matris kesişim analitiği gelişti.',
          xpReward: 150,
        },
      },
      {
        category: 'spatial',
        categoryName: 'Uzamsal Zeka & Döndürme',
        title: '3B Uzamsal Kaşif',
        description: 'Şekil döndürme, küp açılımı ve ayna simetrisinde 6 uzamsal soru tamamla.',
        pedagogicalObjective: 'Zihinde 3 boyutlu nesne canlandırma, perspektif ve zihinsel rotasyon kapasitesi.',
        targetQuestions: 6,
        initialCompleted: 3,
        bonusXP: 140,
        badge: {
          id: `badge-${weekId}-spatial`,
          title: '3B Uzamsal Gezgin',
          badgeIcon: '🧭',
          tier: 'gold',
          rarityLabel: 'Altın Rozet',
          description: 'Haftalık Uzamsal Zeka ve Döndürme hedefini tamamlayarak kazanıldı.',
          pedagogyBenefit: 'Zihinsel rotasyon ve 3 boyutlu koordinat sezgisi pekiştirildi.',
          xpReward: 140,
        },
      },
      {
        category: 'attention',
        categoryName: 'Dikkat ve Odaklanma',
        title: 'Keskin Odak & Detay Şahini',
        description: 'Görsel çeldiricilere takılmadan dikkat ve odaklanma alanında 10 soru tamamla.',
        pedagogicalObjective: 'Seçici görsel dikkat, sınav ortamında çeldiricilere karşı odaklanma kalkanı.',
        targetQuestions: 10,
        initialCompleted: 8,
        bonusXP: 160,
        badge: {
          id: `badge-${weekId}-attention`,
          title: 'Kartal Bakışlı Odak',
          badgeIcon: '👁️',
          tier: 'gold',
          rarityLabel: 'Altın Rozet',
          description: 'Haftalık Dikkat & Odaklanma hedefini tamamlayarak kazanıldı.',
          pedagogyBenefit: 'Sürekli dikkat dayanıklılığı ve ince detay fark etme güçlendi.',
          xpReward: 160,
        },
      },
      {
        category: 'logic',
        categoryName: 'Mantık ve Muhakeme',
        title: 'Analitik Mantık Dehası',
        description: 'Terazi dengesi, işlem makineleri ve mantık çıkarımı alanlarında 7 soru tamamla.',
        pedagogicalObjective: 'Tümdengelim, mantıksal nedensellik ve değişkenler arası denge kurma.',
        targetQuestions: 7,
        initialCompleted: 4,
        bonusXP: 130,
        badge: {
          id: `badge-${weekId}-logic`,
          title: 'Bilişsel Mantık Dehası',
          badgeIcon: '💡',
          tier: 'silver',
          rarityLabel: 'Gümüş Rozet',
          description: 'Haftalık Mantık ve Muhakeme hedefini tamamlayarak kazanıldı.',
          pedagogyBenefit: 'Çok adımlı problem çözme ve mantıksal çıkarım yetkinliği arttı.',
          xpReward: 130,
        },
      },
      {
        category: 'memory',
        categoryName: 'Görsel Bellek',
        title: 'Görsel Hafıza Şampiyonu',
        description: 'Kısa süreli bellek ve sembol hatırlama alanlarında 6 soru tamamla.',
        pedagogicalObjective: 'Çalışma belleği (working memory) derinliği ve görsel kodlama çevikliği.',
        targetQuestions: 6,
        initialCompleted: 2,
        bonusXP: 120,
        badge: {
          id: `badge-${weekId}-memory`,
          title: 'Çelik Bellek Ustası',
          badgeIcon: '🧠',
          tier: 'silver',
          rarityLabel: 'Gümüş Rozet',
          description: 'Haftalık Görsel Bellek hedefini tamamlayarak kazanıldı.',
          pedagogyBenefit: 'Anlık imaj depolama ve çalışma belleği kapasitesi geliştirildi.',
          xpReward: 120,
        },
      },
      {
        category: 'visual_perception',
        categoryName: 'Görsel Algı & Parça Bütün',
        title: 'Görsel Algı Radarı',
        description: 'Farklı olanı bulma, parça tamamlama ve gölge eşleştirmede 8 soru çöz.',
        pedagogicalObjective: 'Gestalt ilkelerine göre görsel sentez, silüet tanıma ve eksik parça tamamlama.',
        targetQuestions: 8,
        initialCompleted: 6,
        bonusXP: 110,
        badge: {
          id: `badge-${weekId}-visual_perception`,
          title: 'Görsel Algı Radarı',
          badgeIcon: '🔍',
          tier: 'bronze',
          rarityLabel: 'Bronz Rozet',
          description: 'Haftalık Görsel Algı ve Parça Bütün hedefini tamamlayarak kazanıldı.',
          pedagogyBenefit: 'Görsel ayrıştırma ve parçadan bütüne ulaşma sezgisi arttı.',
          xpReward: 110,
        },
      },
      {
        category: 'numerical',
        categoryName: 'Sayısal Muhakeme',
        title: 'Sayısal Zeka Fırtınası',
        description: 'Sayı piramitleri, şekil denklemleri ve mantıksal işlem kurgularında 6 soru tamamla.',
        pedagogicalObjective: 'Aritmetik sezgi, sayısal örüntü mantığı ve sembolik denklem kurgulama.',
        targetQuestions: 6,
        initialCompleted: 3,
        bonusXP: 130,
        badge: {
          id: `badge-${weekId}-numerical`,
          title: 'Sayısal Virtüöz',
          badgeIcon: '⚡',
          tier: 'silver',
          rarityLabel: 'Gümüş Rozet',
          description: 'Haftalık Sayısal Muhakeme hedefini tamamlayarak kazanıldı.',
          pedagogyBenefit: 'Sayısal zeka ve matematiksel akıl yürütme becerisi gelişti.',
          xpReward: 130,
        },
      },
    ];

    return categoryConfigs.map((cfg) => {
      const isCompleted = cfg.initialCompleted >= cfg.targetQuestions;
      return {
        id: `challenge-${weekId}-${cfg.category}`,
        weekId,
        category: cfg.category,
        categoryName: cfg.categoryName,
        title: cfg.title,
        description: cfg.description,
        pedagogicalObjective: cfg.pedagogicalObjective,
        targetQuestions: cfg.targetQuestions,
        completedQuestions: cfg.initialCompleted,
        isCompleted,
        rewardClaimed: false,
        badgeReward: cfg.badge,
        bonusXP: cfg.bonusXP,
      };
    });
  }

  /**
   * Retrieves the current Weekly Challenges state from persistence or seeds fresh
   */
  getWeeklyChallenges(): WeeklyChallengesState {
    const { weekId, year, weekNumber } = this.getWeekIdentifier();
    const timeCtx = this.getWeekTimeContext();

    const raw = safeStorage.getItem(STORAGE_KEY_CHALLENGES);
    let state: WeeklyChallengesState | null = null;

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as WeeklyChallengesState;
        if (parsed && parsed.weekId === weekId && Array.isArray(parsed.challenges)) {
          state = parsed;
        }
      } catch {}
    }

    if (!state) {
      const defaultChallenges = this.getDefaultChallengesForWeek(weekId);
      const totalQuestionsCompleted = defaultChallenges.reduce((acc, c) => acc + c.completedQuestions, 0);
      const totalTargetQuestions = defaultChallenges.reduce((acc, c) => acc + c.targetQuestions, 0);
      const completedChallengesCount = defaultChallenges.filter((c) => c.isCompleted).length;

      state = {
        weekId,
        weekNumber,
        year,
        startDateFormatted: timeCtx.startDateFormatted,
        endDateFormatted: timeCtx.endDateFormatted,
        daysRemaining: timeCtx.daysRemaining,
        hoursRemaining: timeCtx.hoursRemaining,
        challenges: defaultChallenges,
        totalQuestionsCompleted,
        totalTargetQuestions,
        completedChallengesCount,
        grandChallenge: {
          id: `grand-challenge-${weekId}`,
          title: 'Haftalık BİLSEM Bilişsel Şampiyonu',
          description: 'Bu hafta en az 6 bilişsel kategorideki meydan okumayı tamamlayarak elmas şampiyonluk tacını tak!',
          requiredCategoriesCount: 6,
          badgeReward: {
            id: `badge-${weekId}-grand-champion`,
            title: 'BİLSEM Haftalık Grand Şampiyon',
            badgeIcon: '🌌',
            tier: 'diamond',
            rarityLabel: 'Elmas & Efsanevi',
            description: 'Tüm bilişsel alanlarda haftalık zeka maratonunu zirvede tamamlayarak kazanıldı.',
            pedagogyBenefit: 'Tüm bilişsel alanlarda eksiksiz zihinsel denge ve üstün performans.',
            xpReward: 500,
          },
          isCompleted: completedChallengesCount >= 6,
          rewardClaimed: false,
        },
        weeklyStreakWeeks: 3,
      };

      safeStorage.setItem(STORAGE_KEY_CHALLENGES, JSON.stringify(state));
    } else {
      // Refresh time calculation
      state.daysRemaining = timeCtx.daysRemaining;
      state.hoursRemaining = timeCtx.hoursRemaining;
      state.startDateFormatted = timeCtx.startDateFormatted;
      state.endDateFormatted = timeCtx.endDateFormatted;
    }

    return state;
  }

  /**
   * Saves updated state to storage
   */
  private saveState(state: WeeklyChallengesState) {
    state.totalQuestionsCompleted = state.challenges.reduce((acc, c) => acc + c.completedQuestions, 0);
    state.completedChallengesCount = state.challenges.filter((c) => c.isCompleted).length;
    state.grandChallenge.isCompleted = state.completedChallengesCount >= state.grandChallenge.requiredCategoriesCount;
    safeStorage.setItem(STORAGE_KEY_CHALLENGES, JSON.stringify(state));
  }

  /**
   * Records that a question was solved in a specific cognitive category
   */
  recordCategoryQuestionSolved(
    category: CognitiveCategory,
    count: number = 1
  ): {
    state: WeeklyChallengesState;
    newlyCompletedChallenges: WeeklyCategoryChallenge[];
    newlyCompletedGrand: boolean;
  } {
    const state = this.getWeeklyChallenges();
    const newlyCompletedChallenges: WeeklyCategoryChallenge[] = [];
    let wasGrandCompletedBefore = state.grandChallenge.isCompleted;

    const challenge = state.challenges.find((c) => c.category === category);
    if (challenge) {
      const prevCompleted = challenge.isCompleted;
      challenge.completedQuestions = Math.min(challenge.targetQuestions, challenge.completedQuestions + count);

      if (!prevCompleted && challenge.completedQuestions >= challenge.targetQuestions) {
        challenge.isCompleted = true;
        newlyCompletedChallenges.push(challenge);
      }
    }

    this.saveState(state);

    const newlyCompletedGrand = !wasGrandCompletedBefore && state.grandChallenge.isCompleted;

    return {
      state,
      newlyCompletedChallenges,
      newlyCompletedGrand,
    };
  }

  /**
   * Claims the badge and XP reward for a completed category challenge
   */
  claimChallengeReward(challengeId: string): {
    success: boolean;
    state: WeeklyChallengesState;
    user: UserProfile;
    badge: Achievement;
    xpAwarded: number;
  } {
    const state = this.getWeeklyChallenges();
    const challenge = state.challenges.find((c) => c.id === challengeId);
    const user = dataService.getCurrentUser();

    if (!challenge || !challenge.isCompleted || challenge.rewardClaimed) {
      return {
        success: false,
        state,
        user,
        badge: {} as Achievement,
        xpAwarded: 0,
      };
    }

    challenge.rewardClaimed = true;
    const xpAwarded = challenge.bonusXP || 100;
    dataService.addXP(xpAwarded);

    // Register into achievements system
    const achievement: Achievement = {
      id: challenge.badgeReward.id,
      title: challenge.badgeReward.title,
      description: challenge.badgeReward.description,
      iconName: 'Award',
      category: 'weekly',
      cognitiveCategory: challenge.category,
      weeklyChallengeId: challenge.id,
      tier: challenge.badgeReward.tier,
      rarityLabel: challenge.badgeReward.rarityLabel,
      pedagogyNote: challenge.badgeReward.pedagogyBenefit,
      criteriaLabel: `${challenge.targetQuestions} ${challenge.categoryName} Sorusu`,
      unlocked: true,
      unlockedAt: new Date().toISOString().split('T')[0],
      progress: challenge.targetQuestions,
      maxProgress: challenge.targetQuestions,
      rewardXP: challenge.badgeReward.xpReward,
      badgeIcon: challenge.badgeReward.badgeIcon,
      rewardClaimed: true,
    };

    this.syncBadgeToAchievements(achievement);
    this.saveState(state);

    return {
      success: true,
      state,
      user: dataService.getCurrentUser(),
      badge: achievement,
      xpAwarded,
    };
  }

  /**
   * Claims the Grand Challenge Diamond Badge reward
   */
  claimGrandChallengeReward(): {
    success: boolean;
    state: WeeklyChallengesState;
    user: UserProfile;
    badge: Achievement;
    xpAwarded: number;
  } {
    const state = this.getWeeklyChallenges();
    const grand = state.grandChallenge;
    const user = dataService.getCurrentUser();

    if (!grand.isCompleted || grand.rewardClaimed) {
      return {
        success: false,
        state,
        user,
        badge: {} as Achievement,
        xpAwarded: 0,
      };
    }

    grand.rewardClaimed = true;
    const xpAwarded = grand.badgeReward.xpReward || 500;
    dataService.addXP(xpAwarded);

    const grandBadge: Achievement = {
      id: grand.badgeReward.id,
      title: grand.badgeReward.title,
      description: grand.badgeReward.description,
      iconName: 'Crown',
      category: 'weekly',
      weeklyChallengeId: grand.id,
      tier: 'diamond',
      rarityLabel: grand.badgeReward.rarityLabel,
      pedagogyNote: grand.badgeReward.pedagogyBenefit,
      criteriaLabel: `${grand.requiredCategoriesCount} Bilişsel Alanda Meydan Okuma`,
      unlocked: true,
      unlockedAt: new Date().toISOString().split('T')[0],
      progress: grand.requiredCategoriesCount,
      maxProgress: grand.requiredCategoriesCount,
      rewardXP: grand.badgeReward.xpReward,
      badgeIcon: grand.badgeReward.badgeIcon,
      rewardClaimed: true,
    };

    this.syncBadgeToAchievements(grandBadge);
    this.saveState(state);

    return {
      success: true,
      state,
      user: dataService.getCurrentUser(),
      badge: grandBadge,
      xpAwarded,
    };
  }

  /**
   * Quick simulator: Advance 1 question in a challenge directly from the UI for instant testing
   */
  simulateSolveQuestion(challengeId: string): {
    state: WeeklyChallengesState;
    newlyCompleted: boolean;
    challenge: WeeklyCategoryChallenge;
  } {
    const state = this.getWeeklyChallenges();
    const challenge = state.challenges.find((c) => c.id === challengeId);

    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    const prevCompleted = challenge.isCompleted;
    challenge.completedQuestions = Math.min(challenge.targetQuestions, challenge.completedQuestions + 1);
    challenge.isCompleted = challenge.completedQuestions >= challenge.targetQuestions;

    this.saveState(state);

    // Also update student total solved questions and category mastery
    dataService.recordQuestionSolved(true);
    dataService.updateSkillMastery(challenge.category, true, 3);

    return {
      state,
      newlyCompleted: !prevCompleted && challenge.isCompleted,
      challenge,
    };
  }

  /**
   * Quick simulator: Complete an entire challenge instantly
   */
  instantCompleteChallenge(challengeId: string): {
    state: WeeklyChallengesState;
    challenge: WeeklyCategoryChallenge;
  } {
    const state = this.getWeeklyChallenges();
    const challenge = state.challenges.find((c) => c.id === challengeId);

    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    challenge.completedQuestions = challenge.targetQuestions;
    challenge.isCompleted = true;

    this.saveState(state);
    return { state, challenge };
  }

  /**
   * Syncs weekly badges into dataService achievements array so other badge views see them
   */
  private syncBadgeToAchievements(badge: Achievement) {
    const achievements = dataService.getAchievements();
    const existingIndex = achievements.findIndex((a) => a.id === badge.id);

    if (existingIndex !== -1) {
      achievements[existingIndex] = { ...achievements[existingIndex], ...badge };
    } else {
      achievements.unshift(badge);
    }

    safeStorage.setItem('bilsem_achievements', JSON.stringify(achievements));
  }
}

export const weeklyChallengesService = new WeeklyChallengesService();
