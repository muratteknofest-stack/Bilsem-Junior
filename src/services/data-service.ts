import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, addDoc, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  UserProfile,
  UserRole,
  CognitiveCategory,
  DifficultyLevel,
  SkillMastery,
  MistakeItem,
  Achievement,
  DailyMission,
  DailyStudyPlan,
  ExamResult,
  BaseQuestion,
  StreakMilestone,
  StudyReminderConfig,
  LeaderboardEntry,
  LeaderboardPeriod,
  WeeklyQuestionProgressData,
  DayQuestionStats,
  WeekComparisonSummary,
  PastWeekTrendItem,
} from '../types';
import { reminderService } from './reminder-service';
import { safeStorage } from '../lib/storage';

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    day: 3,
    title: 'Kıvılcım Ustası',
    badge: '🔥',
    xpReward: 50,
    rewardType: 'xp',
    description: '3 gün aralıksız zeka pratiği yaparak harika bir seri alışkanlığı kazandın!',
  },
  {
    day: 5,
    title: 'Alev Çemberi',
    badge: '⚡',
    xpReward: 100,
    rewardType: 'badge',
    description: '5 günlük seriye ulaştın! Bilişsel hızın ve odaklanman ivme kazanıyor.',
  },
  {
    day: 7,
    title: 'Haftalık Muhafız',
    badge: '🛡️',
    xpReward: 150,
    rewardType: 'shield',
    description: 'Tam 1 hafta kesintisiz çalışma! +1 Seri Koruma Kalkanı ve +150 XP kazandın.',
  },
  {
    day: 14,
    title: 'Zeka Şampiyonu',
    badge: '👑',
    xpReward: 350,
    rewardType: 'crown',
    description: '2 hafta boyunca kesintisiz antrenman! Seviye atlama hızın 2 katına çıktı.',
  },
  {
    day: 30,
    title: 'BİLSEM Efsanesi',
    badge: '🏆',
    xpReward: 1000,
    rewardType: 'trophy',
    description: '1 aylık BİLSEM disiplin abidesi! Özel Altın Kupa rozeti ve 1000 bonus XP.',
  },
];

const STORAGE_KEYS = {
  CURRENT_USER: 'yapyap_user',
  AUTH_SESSION: 'zekapark_auth_session',
  MASTERY: 'yapyap_mastery',
  MISTAKES: 'yapyap_mistakes',
  ACHIEVEMENTS: 'yapyap_achievements',
  MISSIONS: 'yapyap_missions',
  EXAM_RESULTS: 'yapyap_exam_results',
  ACTIVE_EXAM: 'yapyap_active_exam',
  WEEKLY_QUESTIONS: 'yapyap_weekly_questions_v1',
  WEEKLY_CATEGORIES: 'bilsem_weekly_category_challenges_v1',
};

const USER_PROGRESS_KEYS = [
  STORAGE_KEYS.MASTERY,
  STORAGE_KEYS.MISTAKES,
  STORAGE_KEYS.ACHIEVEMENTS,
  STORAGE_KEYS.MISSIONS,
  STORAGE_KEYS.EXAM_RESULTS,
  STORAGE_KEYS.ACTIVE_EXAM,
  STORAGE_KEYS.WEEKLY_QUESTIONS,
  STORAGE_KEYS.WEEKLY_CATEGORIES,
] as const;

const createEmptyMasteries = (): SkillMastery[] =>
  INITIAL_SKILL_MASTERIES.map((item) => ({
    ...item,
    mastery: 0,
    attemptCount: 0,
    accuracy: 0,
    recentTrend: 'neutral',
  }));

const createLockedAchievements = (): Achievement[] =>
  INITIAL_ACHIEVEMENTS.map((item) => ({
    ...item,
    unlocked: false,
    unlockedAt: undefined,
    progress: 0,
    rewardClaimed: false,
  }));

// System Role Accounts

export const INITIAL_SKILL_MASTERIES: SkillMastery[] = [
  { category: 'pattern', categoryName: 'Örüntü ve Dizi', mastery: 72, attemptCount: 45, accuracy: 78, recentTrend: 'up' },
  { category: 'matrix', categoryName: 'Matris Tamamlama', mastery: 58, attemptCount: 32, accuracy: 65, recentTrend: 'up' },
  { category: 'attention', categoryName: 'Dikkat ve Odaklanma', mastery: 81, attemptCount: 50, accuracy: 88, recentTrend: 'neutral' },
  { category: 'spatial', categoryName: 'Uzamsal Zeka ve Döndürme', mastery: 64, attemptCount: 38, accuracy: 70, recentTrend: 'up' },
  { category: 'logic', categoryName: 'Mantık ve Muhakeme', mastery: 69, attemptCount: 40, accuracy: 74, recentTrend: 'neutral' },
  { category: 'memory', categoryName: 'Görsel Bellek', mastery: 76, attemptCount: 28, accuracy: 82, recentTrend: 'up' },
  { category: 'visual_perception', categoryName: 'Görsel Algı', mastery: 78, attemptCount: 42, accuracy: 84, recentTrend: 'up' },
  { category: 'numerical', categoryName: 'Sayısal Muhakeme', mastery: 65, attemptCount: 25, accuracy: 68, recentTrend: 'neutral' },
  { category: 'verbal', categoryName: 'Sözel Mantık ve Analoji', mastery: 0, attemptCount: 0, accuracy: 0, recentTrend: 'neutral' },
  { category: 'coding', categoryName: 'Algoritma ve Kodlama', mastery: 0, attemptCount: 0, accuracy: 0, recentTrend: 'neutral' },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  // 1. SÜREKLİLİK & ALIŞKANLIK ROZETLERİ (Continuity & Streak)
  {
    id: 'streak_3',
    title: 'Ateşli Seri',
    description: '3 gün üst üste zeka pratiği yap.',
    iconName: 'Flame',
    category: 'streak',
    tier: 'bronze',
    rarityLabel: 'Bronz',
    pedagogyNote: 'Üst üste 3 gün pratik yapmak, zihinsel disiplin ve kalıcı öğrenme alışkanlığının ilk temel taşıdır.',
    criteriaLabel: '3 Gün Kesintisiz Çalışma',
    unlocked: true,
    unlockedAt: '2026-09-08',
    progress: 5,
    maxProgress: 3,
    rewardXP: 50,
    badgeIcon: '🔥',
    rewardClaimed: true,
  },
  {
    id: 'streak_5',
    title: 'Alev Çemberi',
    description: '5 günlük seriye ulaş ve odaklanma ivmesi yakala.',
    iconName: 'Zap',
    category: 'streak',
    tier: 'silver',
    rarityLabel: 'Gümüş',
    pedagogyNote: '5 gün boyunca düzenli antrenman, dikkat sürdürülebilirliğini ve bilişsel hızlanmayı destekler.',
    criteriaLabel: '5 Gün Kesintisiz Çalışma',
    unlocked: true,
    unlockedAt: '2026-09-10',
    progress: 5,
    maxProgress: 5,
    rewardXP: 100,
    badgeIcon: '⚡',
    rewardClaimed: false,
  },
  {
    id: 'streak_7',
    title: 'Haftalık Muhafız',
    description: 'Tam 1 hafta (7 gün) kesintisiz çalışma serisini tamamla.',
    iconName: 'ShieldCheck',
    category: 'streak',
    tier: 'gold',
    rarityLabel: 'Altın',
    pedagogyNote: 'Haftanın her günü zeka egzersizi yapmak, nörolojik esnekliği ve hafıza konsolidasyonunu pekiştirir.',
    criteriaLabel: '7 Gün Kesintisiz Çalışma',
    unlocked: false,
    progress: 5,
    maxProgress: 7,
    rewardXP: 150,
    badgeIcon: '🛡️',
  },
  {
    id: 'streak_14',
    title: 'Zeka Şampiyonu',
    description: '2 hafta (14 gün) boyunca her gün zihnini çalıştır.',
    iconName: 'Crown',
    category: 'streak',
    tier: 'gold',
    rarityLabel: 'Altın',
    pedagogyNote: '14 günlük kesintisiz çalışma, BİLSEM hazırlığında soru çözmeyi zihinsel bir reflekse dönüştürür.',
    criteriaLabel: '14 Gün Kesintisiz Çalışma',
    unlocked: false,
    progress: 5,
    maxProgress: 14,
    rewardXP: 350,
    badgeIcon: '👑',
  },
  {
    id: 'streak_30',
    title: 'BİLSEM Efsanesi',
    description: '30 gün kesintisiz çalışma serisi ile BİLSEM disiplin abidesi ol.',
    iconName: 'Trophy',
    category: 'streak',
    tier: 'diamond',
    rarityLabel: 'Elmas & Efsanevi',
    pedagogyNote: '1 aylık düzenli pratik, üstün yetenekli çocuklarda öz-düzenlemeli öğrenme (self-regulation) zirvesidir.',
    criteriaLabel: '30 Gün Kesintisiz Maraton',
    unlocked: false,
    progress: 5,
    maxProgress: 30,
    rewardXP: 1000,
    badgeIcon: '🏆',
  },
  {
    id: 'weekend_warrior',
    title: 'Hafta Sonu Azmi',
    description: 'Cumartesi ve Pazar günleri pratik yaparak seriyi hafta sonunda da koru.',
    iconName: 'Sparkles',
    category: 'streak',
    tier: 'silver',
    rarityLabel: 'Gümüş',
    pedagogyNote: 'Hafta sonu tatillerinde bile zihni aktif tutmak bilişsel zindeliği üst düzeyde muhafaza eder.',
    criteriaLabel: 'Hafta Sonu Günlük Hedefi',
    unlocked: false,
    progress: 1,
    maxProgress: 2,
    rewardXP: 80,
    badgeIcon: '🚀',
  },

  // 2. SORU SAYISI & PRATİK ROZETLERİ (Questions & Milestones)
  {
    id: 'first_step',
    title: 'İlk Adım',
    description: 'Platformdaki ilk sorunu başarıyla çöz.',
    iconName: 'Sparkles',
    category: 'questions',
    tier: 'bronze',
    rarityLabel: 'Bronz',
    pedagogyNote: 'Her büyük başarı cesur bir ilk adımla başlar. Doğru cevap motivasyonun anahtarıdır.',
    criteriaLabel: '1 Soru Çözümü',
    unlocked: true,
    unlockedAt: '2026-09-08',
    progress: 1,
    maxProgress: 1,
    rewardXP: 25,
    badgeIcon: '🌟',
    rewardClaimed: true,
  },
  {
    id: 'questions_10',
    title: 'Zeka Çırağı',
    description: 'Toplam 10 zeka sorusu çöz.',
    iconName: 'Award',
    category: 'questions',
    tier: 'bronze',
    rarityLabel: 'Bronz',
    pedagogyNote: '10 soru çözerek farklı soru tiplerine aşinalık ve test formatı uyumu kazanılır.',
    criteriaLabel: '10 Soru Çözümü',
    unlocked: true,
    unlockedAt: '2026-09-08',
    progress: 10,
    maxProgress: 10,
    rewardXP: 50,
    badgeIcon: '🥉',
    rewardClaimed: true,
  },
  {
    id: 'questions_25',
    title: 'Zeka Kaşifi',
    description: 'Toplam 25 zeka sorusuna ulaş.',
    iconName: 'Compass',
    category: 'questions',
    tier: 'silver',
    rarityLabel: 'Gümüş',
    pedagogyNote: '25 soru ile örüntü, matris ve uzamsal soru kalıpları arasındaki geçişler hızlanır.',
    criteriaLabel: '25 Soru Çözümü',
    unlocked: false,
    progress: 24,
    maxProgress: 25,
    rewardXP: 100,
    badgeIcon: '🥈',
  },
  {
    id: 'questions_50',
    title: 'Soru Canavarı',
    description: 'Toplam 50 zeka sorusu çöz.',
    iconName: 'Zap',
    category: 'questions',
    tier: 'gold',
    rarityLabel: 'Altın',
    pedagogyNote: '50 soru çözümü görsel ayrıştırma, soyutlama ve eleme yeteneğini belirgin oranda geliştirir.',
    criteriaLabel: '50 Soru Çözümü',
    unlocked: false,
    progress: 24,
    maxProgress: 50,
    rewardXP: 200,
    badgeIcon: '🥇',
  },
  {
    id: 'questions_100',
    title: 'BİLSEM Maratoncusu',
    description: '100 soruluk büyük zeka maratonunu tamamla.',
    iconName: 'Crown',
    category: 'questions',
    tier: 'gold',
    rarityLabel: 'Altın',
    pedagogyNote: '100 soru çözmek sınav kondisyonunu, yüksek dikkat dayanıklılığını ve özgüveni garanti eder.',
    criteriaLabel: '100 Soru Çözümü',
    unlocked: false,
    progress: 24,
    maxProgress: 100,
    rewardXP: 500,
    badgeIcon: '💎',
  },
  {
    id: 'questions_250',
    title: 'Bilişsel Dahi',
    description: 'Toplam 250 soruya ulaşarak platformun zirve öğrencisi ol.',
    iconName: 'Star',
    category: 'questions',
    tier: 'diamond',
    rarityLabel: 'Elmas & Efsanevi',
    pedagogyNote: '250 soru çözümü geniş bir bilişsel repertuvar ve zengin analitik problem çözme stratejisi kazandırır.',
    criteriaLabel: '250 Soru Çözümü',
    unlocked: false,
    progress: 24,
    maxProgress: 250,
    rewardXP: 1200,
    badgeIcon: '🌌',
  },

  // 3. HATA DEFTERİ & AZİM ROZETLERİ (Mistake Recovery & Resilience)
  {
    id: 'error_hunter',
    title: 'Hata Avcısı',
    description: 'Hata defterindeki bir soruyu tekrar çözerek öğren.',
    iconName: 'BookCheck',
    category: 'special',
    tier: 'bronze',
    rarityLabel: 'Bronz',
    pedagogyNote: 'Hatalardan öğrenmek (metabilişsel farkındalık) çocukta yapıcı öğrenme psikolojisini inşa eder.',
    criteriaLabel: '1 Hatalı Soruyu Öğrenip Düzelt',
    unlocked: true,
    unlockedAt: '2026-09-09',
    progress: 1,
    maxProgress: 1,
    rewardXP: 40,
    badgeIcon: '🎯',
    rewardClaimed: true,
  },
  {
    id: 'mistakes_solved_5',
    title: 'Kusursuz Zihin',
    description: 'Hata defterinden toplam 5 hatayı inceleyip öğrenerek çöz.',
    iconName: 'ShieldCheck',
    category: 'special',
    tier: 'silver',
    rarityLabel: 'Gümüş',
    pedagogyNote: 'Tekrarlanan hataları gidermek öğrencinin kavramsal kör noktalarını kalıcı olarak temizler.',
    criteriaLabel: '5 Hatayı Telafi Et',
    unlocked: false,
    progress: 1,
    maxProgress: 5,
    rewardXP: 100,
    badgeIcon: '🛡️',
  },
  {
    id: 'clean_notebook',
    title: 'Tertemiz Defter',
    description: 'Hata defterindeki tüm yanlışları çöz ve defteri tamamen sıfırla!',
    iconName: 'CheckCircle2',
    category: 'special',
    tier: 'gold',
    rarityLabel: 'Altın',
    pedagogyNote: 'Tüm hataları temizlemek, eksik konunun kalmadığının ve üstün kavrama becerisinin tescilidir.',
    criteriaLabel: 'Hata Defterinde 0 Hata Bırak',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    rewardXP: 200,
    badgeIcon: '✨',
  },

  // 4. BİLİŞSEL ALAN USTALIĞI (Cognitive Mastery)
  {
    id: 'pattern_master',
    title: 'Örüntü Dedektifi',
    description: 'Örüntü ve Dizi kategorisinde 10 doğru cevap ver.',
    iconName: 'Shapes',
    category: 'mastery',
    tier: 'silver',
    rarityLabel: 'Gümüş',
    pedagogyNote: 'Örüntü tanıma beynin matematiksel ve sembolik ilişkileri sezgisel olarak kavramasını sağlar.',
    criteriaLabel: 'Örüntüde 10 Doğru',
    unlocked: true,
    unlockedAt: '2026-09-09',
    progress: 10,
    maxProgress: 10,
    rewardXP: 80,
    badgeIcon: '🧩',
    rewardClaimed: true,
  },
  {
    id: 'matrix_master',
    title: 'Matris Mimarı',
    description: '2x2 ve 3x3 Matris Tamamlama kategorilerinde %70+ ustalık puanına ulaş.',
    iconName: 'Target',
    category: 'mastery',
    tier: 'gold',
    rarityLabel: 'Altın',
    pedagogyNote: 'Raven Matris mantığı, BİLSEM genel zihinsel yetenek değerlendirmelerinin en kritik omurgasıdır.',
    criteriaLabel: 'Matris Ustalığı %70+',
    unlocked: false,
    progress: 58,
    maxProgress: 70,
    rewardXP: 150,
    badgeIcon: '📐',
  },
  {
    id: 'spatial_hero',
    title: 'Uzamsal Kaptan',
    description: 'Şekil Döndürme, Katlama ve Ayna Simetrisinde 10 doğru soru çöz.',
    iconName: 'Compass',
    category: 'mastery',
    tier: 'silver',
    rarityLabel: 'Gümüş',
    pedagogyNote: '3 boyutlu zihinsel canlandırma ve uzamsal akıl yürütme geometri ve fen zekasını destekler.',
    criteriaLabel: 'Uzamsal Alanda 10 Doğru',
    unlocked: false,
    progress: 7,
    maxProgress: 10,
    rewardXP: 90,
    badgeIcon: '🧭',
  },
  {
    id: 'eagle_eyes',
    title: 'Kartal Gözler',
    description: 'Görsel Dikkat ve Gizli Detay testlerinde yüksek ustalık puanına (%80) ulaş.',
    iconName: 'Brain',
    category: 'mastery',
    tier: 'gold',
    rarityLabel: 'Altın',
    pedagogyNote: 'Seçici görsel dikkat, sınav ortamındaki yanıltıcı çeldiricilere aldanmayı engeller.',
    criteriaLabel: 'Dikkat Ustalığı %80+',
    unlocked: true,
    unlockedAt: '2026-09-09',
    progress: 81,
    maxProgress: 80,
    rewardXP: 120,
    badgeIcon: '👁️',
    rewardClaimed: false,
  },
  {
    id: 'brain_power',
    title: 'Süper Zeka',
    description: 'Zor veya Uzman seviyede 5 soruyu doğru bil.',
    iconName: 'Brain',
    category: 'mastery',
    tier: 'gold',
    rarityLabel: 'Altın',
    pedagogyNote: 'Yüksek zorluktaki soruları çözmek, derin odaklanma ve çok adımlı mantık yürütmeyi pekiştirir.',
    criteriaLabel: '5 İleri Düzey Soru Çöz',
    unlocked: false,
    progress: 2,
    maxProgress: 5,
    rewardXP: 150,
    badgeIcon: '💡',
  },

  // 5. DENEME SINAVI & HIZ ROZETLERİ (Exam & Trial Mastery)
  {
    id: 'exam_finisher',
    title: 'Sınav Şampiyonu',
    description: 'Bir BİLSEM Deneme Sınavını süreye dikkat ederek başarıyla tamamla.',
    iconName: 'Trophy',
    category: 'exam',
    tier: 'silver',
    rarityLabel: 'Gümüş',
    pedagogyNote: 'Gerçek sınav simülasyonu zaman baskısı altında sakin ve odaklı kalma becerisi kazandırır.',
    criteriaLabel: '1 Deneme Sınavı Tamamla',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    rewardXP: 150,
    badgeIcon: '🏅',
  },
  {
    id: 'perfectionist',
    title: 'Tam İsabet (%100)',
    description: 'Bir pratik seansında veya denemede tüm soruları eksiksiz ve %100 doğru çöz.',
    iconName: 'Award',
    category: 'exam',
    tier: 'diamond',
    rarityLabel: 'Elmas & Efsanevi',
    pedagogyNote: 'Kusursuz odaklanma ve sıfır hata toleransı ile sergilenen zirve zeka performansı.',
    criteriaLabel: 'Bir Testte %100 Doğruluk',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    rewardXP: 500,
    badgeIcon: '🎯',
  },
];

export const INITIAL_MISSIONS: DailyMission[] = [
  { id: 'm1', title: 'Bugün 5 soru çöz', rewardXP: 30, current: 3, target: 5, completed: false },
  { id: 'm2', title: 'Matris kategorisinde 2 soru tamamla', rewardXP: 40, current: 1, target: 2, completed: false },
  { id: 'm3', title: 'Hata Defterinden 1 soruyu tekrar dene', rewardXP: 50, current: 0, target: 1, completed: false },
];

export const INITIAL_MISTAKES: MistakeItem[] = [
  {
    id: 'mistake-1',
    questionId: 'rot-10492-4',
    questionSeed: 10492,
    questionType: 'figure_rotation',
    difficulty: 4,
    category: 'spatial',
    prompt: 'Yukarıdaki şekil saat yönünün tersine 90° döndürüldüğünde hangisi elde edilir?',
    createdAt: 'Dün, 16:40',
    reviewed: false,
    resolved: false,
  },
  {
    id: 'mistake-2',
    questionId: 'mat2-8371-3',
    questionSeed: 8371,
    questionType: 'matrix_2x2',
    difficulty: 3,
    category: 'matrix',
    prompt: 'Matristeki satır ve sütun ilişkisine göre soru işareti yerine hangi şekil gelmelidir?',
    createdAt: '2 gün önce',
    reviewed: true,
    resolved: false,
  },
  {
    id: 'mistake-3',
    questionId: 'seq-4912-3',
    questionSeed: 4912,
    questionType: 'visual_sequence',
    difficulty: 3,
    category: 'pattern',
    prompt: 'Dizideki şekil ve renk kuralına göre soru işareti yerine hangi öge gelmelidir?',
    createdAt: '3 gün önce',
    reviewed: false,
    resolved: false,
  },
  {
    id: 'mistake-4',
    questionId: 'sym-7193-4',
    questionSeed: 7193,
    questionType: 'symbol_coding',
    difficulty: 4,
    category: 'logic',
    prompt: 'Sembol şifreleme kuralına göre verilen hece dizisi hangi şekil grubuna karşılık gelir?',
    createdAt: '3 gün önce',
    reviewed: true,
    resolved: true,
    resolvedAt: '2026-09-09',
  },
  {
    id: 'mistake-5',
    questionId: 'cnt-3829-2',
    questionSeed: 3829,
    questionType: 'shape_counting',
    difficulty: 2,
    category: 'attention',
    prompt: 'Yukarıdaki iç içe geçmiş figürde toplam kaç adet üçgen bulunmaktadır?',
    createdAt: '4 gün önce',
    reviewed: false,
    resolved: false,
  },
  {
    id: 'mistake-6',
    questionId: 'mir-5521-3',
    questionSeed: 5521,
    questionType: 'mirror_reflection',
    difficulty: 3,
    category: 'spatial',
    prompt: 'Verilen figürün dikey ayna eksenine göre simetrik yansıması hangisidir?',
    createdAt: '5 gün önce',
    reviewed: true,
    resolved: false,
  },
];

class ZekaParkDataService {
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  private clearUserProgress() {
    USER_PROGRESS_KEYS.forEach((key) => safeStorage.removeItem(key));
  }

  private scheduleProgressPersist() {
    if (!auth.currentUser) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      void this.persistUserStateToFirebase().catch((error) => {
        console.error('Kullanıcı ilerlemesi senkronize edilemedi.', error);
      });
    }, 400);
  }

  private setProgressItem(key: (typeof USER_PROGRESS_KEYS)[number], value: string) {
    safeStorage.setItem(key, value);
    this.scheduleProgressPersist();
  }

  private removeProgressItem(key: (typeof USER_PROGRESS_KEYS)[number]) {
    safeStorage.removeItem(key);
    this.scheduleProgressPersist();
  }

  private async persistUserStateToFirebase() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const values = Object.fromEntries(
      USER_PROGRESS_KEYS.map((key) => [key, safeStorage.getItem(key)]).filter(([, value]) => value !== null),
    );
    await setDoc(
      doc(db, 'users', currentUser.uid, 'private', 'state'),
      { values, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  private markPracticeForToday(user: UserProfile, minutesSpent: number): boolean {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const previousDate = user.lastActiveDate?.slice(0, 10) || '';
    const isNewCalendarDay = previousDate !== today;

    if (isNewCalendarDay) {
      user.todayMinutesSpent = 0;
      user.todayQuestionsSolved = 0;
      user.todaySessionsCompleted = 0;
      user.todayPracticed = false;
    }

    let streakIncreased = false;
    if (!user.todayPracticed) {
      const previousTime = previousDate ? new Date(`${previousDate}T00:00:00`).getTime() : Number.NaN;
      const todayTime = new Date(`${today}T00:00:00`).getTime();
      const dayGap = Number.isFinite(previousTime) ? Math.round((todayTime - previousTime) / 86_400_000) : Number.NaN;

      if (!previousDate || user.streak <= 0) {
        user.streak = 1;
      } else if (dayGap === 1) {
        user.streak += 1;
      } else if (dayGap === 2 && (user.streakFreezeCount || 0) > 0) {
        user.streakFreezeCount = (user.streakFreezeCount || 0) - 1;
        user.streak += 1;
      } else if (dayGap > 1) {
        user.streak = 1;
      } else if (previousDate === today && user.streak <= 0) {
        user.streak = 1;
      }
      streakIncreased = true;
    }

    user.todayPracticed = true;
    user.todayMinutesSpent = (user.todayMinutesSpent || 0) + Math.max(0, minutesSpent);
    user.lastActiveDate = now.toISOString();
    user.longestStreak = Math.max(user.longestStreak || 0, user.streak || 0);
    const dayIndex = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayIndex);
    monday.setHours(0, 0, 0, 0);
    const previousWasBeforeThisWeek = previousDate
      ? new Date(`${previousDate}T00:00:00`).getTime() < monday.getTime()
      : true;
    const history = previousWasBeforeThisWeek
      ? [false, false, false, false, false, false, false]
      : [...(user.weeklyStreakHistory || [false, false, false, false, false, false, false])];
    history[dayIndex] = true;
    user.weeklyStreakHistory = history;
    return streakIncreased;
  }

  async hydrateUserStateFromFirebase(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const snapshot = await getDoc(doc(db, 'users', currentUser.uid, 'private', 'state'));
    this.clearUserProgress();
    const values = snapshot.data()?.values;
    if (values && typeof values === 'object') {
      USER_PROGRESS_KEYS.forEach((key) => {
        const value = (values as Record<string, unknown>)[key];
        if (typeof value === 'string') safeStorage.setItem(key, value);
      });
    }
  }

  async loadRemoteProgressForUser(userId: string): Promise<{
    masteries: SkillMastery[];
    weeklyQuestions: unknown | null;
    examResults: ExamResult[];
  }> {
    const snapshot = await getDoc(doc(db, 'users', userId, 'private', 'state'));
    const values = (snapshot.data()?.values || {}) as Record<string, unknown>;
    const parse = <T>(key: string, fallback: T): T => {
      const raw = values[key];
      if (typeof raw !== 'string') return fallback;
      try { return JSON.parse(raw) as T; } catch { return fallback; }
    };
    return {
      masteries: parse(STORAGE_KEYS.MASTERY, createEmptyMasteries()),
      weeklyQuestions: parse<unknown | null>(STORAGE_KEYS.WEEKLY_QUESTIONS, null),
      examResults: parse(STORAGE_KEYS.EXAM_RESULTS, []),
    };
  }

  // Hybrid Firebase Sync
  syncUserFromFirebase(profile: UserProfile | null) {
    if (profile) {
      // Keep local in sync
      safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(profile));
      safeStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
    } else {
      safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      safeStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
  }

  async _updateFirebaseProfile(updates: Partial<UserProfile>) {
    if (!auth.currentUser) return;
    try {
      const ref = doc(db, 'users', auth.currentUser.uid);
      const definedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      );
      await updateDoc(ref, { ...definedUpdates, updatedAt: Date.now() });
    } catch (e) {
      console.error('Failed to update firebase', e);
    }
  }

  // 1. User Management
  getCurrentUser(): UserProfile {
    const raw = safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (raw) {
      try {
        let parsed = JSON.parse(raw); if (!parsed || typeof parsed !== "object") throw new Error('Invalid profile');
        if (!parsed.claimedStreakDays) parsed.claimedStreakDays = [];
        if (parsed.streakFreezeCount === undefined) parsed.streakFreezeCount = 0;
        if (parsed.longestStreak === undefined) parsed.longestStreak = parsed.streak || 0;
        if (parsed.totalQuestionsSolved === undefined) parsed.totalQuestionsSolved = 0;
        if (parsed.resolvedMistakesCount === undefined) parsed.resolvedMistakesCount = 0;
        if (parsed.dailyGoalQuestions === undefined) parsed.dailyGoalQuestions = 10;
        if (parsed.todayQuestionsSolved === undefined) parsed.todayQuestionsSolved = 0;
        if (parsed.dailyGoalSessions === undefined) parsed.dailyGoalSessions = 2;
        if (parsed.todaySessionsCompleted === undefined) parsed.todaySessionsCompleted = 0;
        if (!parsed.weeklyStreakHistory) parsed.weeklyStreakHistory = [false, false, false, false, false, false, false];
        return parsed;
      } catch {}
    }
    return {
      id: 'guest', name: 'Misafir', role: 'student', avatar: '🦊', grade: 1,
      level: 1, xp: 0, streak: 0, lastActiveDate: '', dailyGoalMinutes: 15,
      todayMinutesSpent: 0, soundEnabled: true, totalQuestionsSolved: 0,
      todayQuestionsSolved: 0, dailyGoalQuestions: 10, dailyGoalSessions: 2,
      todaySessionsCompleted: 0,
    };
  }

  setCurrentUser(user: UserProfile) {
    safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    const {
      avatar, level, xp, streak, longestStreak, lastActiveDate, todayPracticed,
      streakFreezeCount, claimedStreakDays, weeklyStreakHistory, dailyGoalMinutes,
      todayMinutesSpent, dailyGoalQuestions, todayQuestionsSolved, dailyGoalSessions,
      todaySessionsCompleted, soundEnabled, totalQuestionsSolved, resolvedMistakesCount,
      featuredBadgeIds, reminderConfig,
    } = user;
    void this._updateFirebaseProfile({
      avatar, level, xp, streak, longestStreak, lastActiveDate, todayPracticed,
      streakFreezeCount, claimedStreakDays, weeklyStreakHistory, dailyGoalMinutes,
      todayMinutesSpent, dailyGoalQuestions, todayQuestionsSolved, dailyGoalSessions,
      todaySessionsCompleted, soundEnabled, totalQuestionsSolved, resolvedMistakesCount,
      featuredBadgeIds, reminderConfig,
    });
  }

  isAuthenticated(): boolean {
    return auth.currentUser !== null && safeStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true';
  }

  loginAs(role: UserRole, customUser?: UserProfile): UserProfile {
    if (!customUser || customUser.role !== role || customUser.id !== auth.currentUser?.uid) {
      throw new Error('Kimliği doğrulanmamış yerel oturum engellendi.');
    }
    const previous = safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (previous) {
      try {
        if ((JSON.parse(previous) as UserProfile).id !== customUser.id) this.clearUserProgress();
      } catch { this.clearUserProgress(); }
    }
    const user = customUser;
    safeStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
    this.setCurrentUser(user);
    return user;
  }

  logout(): void {
    safeStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.clearUserProgress();
  }

  // Daily Streak Counter & Rewards Methods
  getStreakMilestones(): StreakMilestone[] {
    return STREAK_MILESTONES;
  }

  recordPracticeSession(minutesSpent = 2): { user: UserProfile; streakIncreased: boolean } {
    const user = this.getCurrentUser();
    const streakIncreased = this.markPracticeForToday(user, minutesSpent);
    user.todaySessionsCompleted = (user.todaySessionsCompleted || 0) + 1;
    this.setCurrentUser(user);
    return { user, streakIncreased };
  }

  claimStreakReward(day: number): { success: boolean; xpAwarded: number; milestone?: StreakMilestone; user: UserProfile } {
    const user = this.getCurrentUser();
    const milestone = STREAK_MILESTONES.find((m) => m.day === day);
    if (!milestone) return { success: false, xpAwarded: 0, user };

    const claimed = user.claimedStreakDays || [];
    if (claimed.includes(day)) {
      return { success: false, xpAwarded: 0, milestone, user };
    }

    if (user.streak < day) {
      return { success: false, xpAwarded: 0, milestone, user };
    }

    // Award XP
    this.addXP(milestone.xpReward);
    const updatedUser = this.getCurrentUser();

    if (milestone.rewardType === 'shield') {
      updatedUser.streakFreezeCount = (updatedUser.streakFreezeCount || 0) + 1;
    }

    updatedUser.claimedStreakDays = [...claimed, day];
    this.setCurrentUser(updatedUser);

    return {
      success: true,
      xpAwarded: milestone.xpReward,
      milestone,
      user: updatedUser,
    };
  }

  useStreakFreeze(): { success: boolean; user: UserProfile } {
    const user = this.getCurrentUser();
    if ((user.streakFreezeCount || 0) <= 0) {
      return { success: false, user };
    }
    user.streakFreezeCount = (user.streakFreezeCount || 0) - 1;
    this.setCurrentUser(user);
    return { success: true, user };
  }

  // 2. Skill Mastery
  getSkillMasteries(): SkillMastery[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.MASTERY);
    if (raw) {
      try {
        let parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : createEmptyMasteries();
      } catch {}
    }
    const initial = createEmptyMasteries();
    this.setProgressItem(STORAGE_KEYS.MASTERY, JSON.stringify(initial));
    return initial;
  }

  updateSkillMastery(category: CognitiveCategory, isCorrect: boolean, difficulty: DifficultyLevel) {
    const masteries = this.getSkillMasteries();
    const idx = masteries.findIndex((m) => m.category === category);
    if (idx !== -1) {
      const item = masteries[idx];
      item.attemptCount += 1;
      const delta = isCorrect ? Math.max(1, Math.round(difficulty * 0.8)) : -Math.max(1, Math.round(difficulty * 0.4));
      item.mastery = Math.min(100, Math.max(10, item.mastery + delta));
      item.recentTrend = isCorrect ? 'up' : 'down';
      masteries[idx] = item;
      this.setProgressItem(STORAGE_KEYS.MASTERY, JSON.stringify(masteries));
    }
  }

  updateWeeklyCategoryProgress(category: CognitiveCategory, count: number = 1) {
    const raw = safeStorage.getItem(STORAGE_KEYS.WEEKLY_CATEGORIES);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      if (!state || !Array.isArray(state.challenges)) return;
      const ch = state.challenges.find((c: any) => c.category === category);
      if (ch) {
        ch.completedQuestions = Math.min(ch.targetQuestions, (ch.completedQuestions || 0) + count);
        ch.isCompleted = ch.completedQuestions >= ch.targetQuestions;
        state.totalQuestionsCompleted = state.challenges.reduce((acc: number, c: any) => acc + (c.completedQuestions || 0), 0);
        state.completedChallengesCount = state.challenges.filter((c: any) => c.isCompleted).length;
        if (state.grandChallenge) {
          state.grandChallenge.isCompleted = state.completedChallengesCount >= (state.grandChallenge.requiredCategoriesCount || 6);
        }
        this.setProgressItem(STORAGE_KEYS.WEEKLY_CATEGORIES, JSON.stringify(state));
      }
    } catch {}
  }

  // 3. XP & Progression
  addXP(amount: number): { newXP: number; newLevel: number; leveledUp: boolean } {
    const user = this.getCurrentUser();
    const oldLevel = user.level;
    user.xp += amount;
    const newLevel = Math.floor(user.xp / 250) + 1;
    const leveledUp = newLevel > oldLevel;
    user.level = newLevel;
    this.setCurrentUser(user);
    return { newXP: user.xp, newLevel, leveledUp };
  }

  // 4. Mistakes Notebook
  getMistakes(): MistakeItem[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.MISTAKES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {}
    }
    this.setProgressItem(STORAGE_KEYS.MISTAKES, JSON.stringify([]));
    return [];
  }

  addMistake(question: BaseQuestion) {
    const mistakes = this.getMistakes();
    // The type/version/difficulty/seed combination uniquely identifies a question.
    if (mistakes.some((m) => m.questionId === question.id)) return;

    const item: MistakeItem = {
      id: `mistake-${Date.now()}`,
      questionId: question.id,
      questionSeed: question.seed,
      questionType: question.type,
      difficulty: question.difficulty,
      category: question.category,
      prompt: question.prompt,
      createdAt: 'Az önce',
      reviewed: false,
      resolved: false,
      cachedQuestion: question,
    };
    mistakes.unshift(item);
    this.setProgressItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));
  }

  resolveMistake(mistakeId: string): {
    success: boolean;
    unresolvedCount: number;
    newlyUnlocked: Achievement[];
  } {
    const mistakes = this.getMistakes();
    const idx = mistakes.findIndex((m) => m.id === mistakeId);
    const newlyUnlocked: Achievement[] = [];

    if (idx !== -1) {
      mistakes[idx].resolved = true;
      mistakes[idx].resolvedAt = new Date().toLocaleDateString('tr-TR');
      this.setProgressItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));

      const user = this.getCurrentUser();
      user.resolvedMistakesCount = (user.resolvedMistakesCount || 0) + 1;
      this.setCurrentUser(user);

      // Trigger achievement: Hata Avcısı
      const ach1 = this.unlockAchievement('error_hunter');
      if (ach1) newlyUnlocked.push(ach1);

      // Trigger achievement: Kusursuz Zihin (5 hata)
      const achievements = this.getAchievements();
      const item5 = achievements.find((a) => a.id === 'mistakes_solved_5');
      if (item5) {
        item5.progress = Math.min(item5.maxProgress, user.resolvedMistakesCount);
        if (user.resolvedMistakesCount >= item5.maxProgress && !item5.unlocked) {
          item5.unlocked = true;
          item5.unlockedAt = new Date().toISOString().split('T')[0];
          if (item5.rewardXP) this.addXP(item5.rewardXP);
          newlyUnlocked.push(item5);
        }
        this.setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
      }

      // Trigger achievement: Tertemiz Defter (if 0 unresolved mistakes remain)
      const unresolvedLeft = mistakes.filter((m) => !m.resolved).length;
      if (unresolvedLeft === 0) {
        const cleanAch = this.unlockAchievement('clean_notebook');
        if (cleanAch) newlyUnlocked.push(cleanAch);
      }

      return { success: true, unresolvedCount: unresolvedLeft, newlyUnlocked };
    }
    return { success: false, unresolvedCount: mistakes.filter((m) => !m.resolved).length, newlyUnlocked };
  }

  clearAllMistakes(): {
    unresolvedCount: number;
    newlyUnlocked: Achievement[];
    user: UserProfile;
  } {
    const mistakes = this.getMistakes();
    mistakes.forEach((m) => {
      m.resolved = true;
      m.resolvedAt = new Date().toLocaleDateString('tr-TR');
    });
    this.setProgressItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));

    const newlyUnlocked: Achievement[] = [];
    const a1 = this.unlockAchievement('clean_notebook');
    if (a1) newlyUnlocked.push(a1);
    const a2 = this.unlockAchievement('error_hunter');
    if (a2) newlyUnlocked.push(a2);

    return { unresolvedCount: 0, newlyUnlocked, user: this.getCurrentUser() };
  }

  // 5. Question solving tracking for badges
  recordQuestionSolved(isCorrect: boolean = true, category?: CognitiveCategory): {
    user: UserProfile;
    newlyUnlocked: Achievement[];
    totalSolved: number;
  } {
    const user = this.getCurrentUser();
    this.markPracticeForToday(user, 0);
    user.totalQuestionsSolved = (user.totalQuestionsSolved || 0) + 1;
    user.todayQuestionsSolved = (user.todayQuestionsSolved || 0) + 1;
    this.setCurrentUser(user);

    if (category) {
      this.updateWeeklyCategoryProgress(category, 1);
    }

    const newlyUnlocked: Achievement[] = [];
    const achievements = this.getAchievements();
    const qCount = user.totalQuestionsSolved;

    const checkMilestone = (id: string, target: number) => {
      const item = achievements.find((a) => a.id === id);
      if (item) {
        item.progress = Math.min(target, qCount);
        if (qCount >= target && !item.unlocked) {
          item.unlocked = true;
          item.unlockedAt = new Date().toISOString().split('T')[0];
          if (item.rewardXP) {
            this.addXP(item.rewardXP);
            item.rewardClaimed = true;
          }
          newlyUnlocked.push(item);
        }
      }
    };

    checkMilestone('first_step', 1);
    checkMilestone('questions_10', 10);
    checkMilestone('questions_25', 25);
    checkMilestone('questions_50', 50);
    checkMilestone('questions_100', 100);

    this.setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));

    // Update real-time weekly solved questions chart storage
    this.incrementWeeklyQuestionCount();

    return {
      user: this.getCurrentUser(),
      newlyUnlocked,
      totalSolved: user.totalQuestionsSolved,
    };
  }

  // Weekly Question Progress & Comparison Engine
  getWeeklyQuestionProgressData(passedUser?: UserProfile, remoteData?: unknown): WeeklyQuestionProgressData {
    const user = passedUser || this.getCurrentUser();
    const raw = remoteData ? JSON.stringify(remoteData) : safeStorage.getItem(STORAGE_KEYS.WEEKLY_QUESTIONS);
    
    const now = new Date();
    const todayIdx = (now.getDay() + 6) % 7; // 0: Mon ... 6: Sun

    let data: {
      thisWeekDays: number[];
      lastWeekDays: number[];
      pastWeeks: number[];
      weekStart?: string;
    };

    if (raw) {
      try {
        data = JSON.parse(raw);
        if (!Array.isArray(data.thisWeekDays) || data.thisWeekDays.length !== 7) {
          data = this.getDefaultWeeklyQuestionsData(user, todayIdx);
        }
      } catch {
        data = this.getDefaultWeeklyQuestionsData(user, todayIdx);
      }
    } else {
      data = this.getDefaultWeeklyQuestionsData(user, todayIdx);
      this.setProgressItem(STORAGE_KEYS.WEEKLY_QUESTIONS, JSON.stringify(data));
    }

    const rolledData = this.rollWeeklyQuestionData(data);
    if (rolledData !== data) {
      data = rolledData;
      if (!remoteData) this.setProgressItem(STORAGE_KEYS.WEEKLY_QUESTIONS, JSON.stringify(data));
    }

    const DAY_CONFIG = [
      { dayIndex: 0, dayName: 'Pazartesi', shortDay: 'Pzt' },
      { dayIndex: 1, dayName: 'Salı', shortDay: 'Sal' },
      { dayIndex: 2, dayName: 'Çarşamba', shortDay: 'Çar' },
      { dayIndex: 3, dayName: 'Perşembe', shortDay: 'Per' },
      { dayIndex: 4, dayName: 'Cuma', shortDay: 'Cum' },
      { dayIndex: 5, dayName: 'Cumartesi', shortDay: 'Cmt' },
      { dayIndex: 6, dayName: 'Pazar', shortDay: 'Paz' },
    ];

    const dailyStats: DayQuestionStats[] = DAY_CONFIG.map((d) => ({
      dayIndex: d.dayIndex,
      dayName: d.dayName,
      shortDay: d.shortDay,
      thisWeek: data.thisWeekDays[d.dayIndex] || 0,
      lastWeek: data.lastWeekDays[d.dayIndex] || 0,
      isToday: d.dayIndex === todayIdx,
    }));

    const thisWeekTotal = data.thisWeekDays.reduce((a, b) => a + b, 0);
    const lastWeekTotal = data.lastWeekDays.reduce((a, b) => a + b, 0);
    const difference = thisWeekTotal - lastWeekTotal;
    const percentChange = lastWeekTotal > 0
      ? Math.round((difference / lastWeekTotal) * 100)
      : thisWeekTotal > 0 ? 100 : 0;
    
    const direction: 'up' | 'down' | 'same' =
      difference > 0 ? 'up' : difference < 0 ? 'down' : 'same';

    const activeDaysCount = Math.max(1, todayIdx + 1);
    const dailyAverage = Math.round((thisWeekTotal / activeDaysCount) * 10) / 10;

    let bestDay = { dayName: 'Pazartesi', shortDay: 'Pzt', count: 0 };
    dailyStats.forEach((d) => {
      if (d.thisWeek > bestDay.count) {
        bestDay = { dayName: d.dayName, shortDay: d.shortDay, count: d.thisWeek };
      }
    });

    const weeklyTarget = 50;
    const targetCompletionRate = Math.min(100, Math.round((thisWeekTotal / weeklyTarget) * 100));

    const fourWeeksTrend: PastWeekTrendItem[] = [
      {
        id: 'w-1',
        weekLabel: '3 Hafta Önce',
        shortLabel: '1. Hafta',
        dateRange: '3 Hafta Önce',
        totalQuestions: data.pastWeeks?.[0] ?? 0,
        targetGoal: 45,
        isCurrentWeek: false,
      },
      {
        id: 'w-2',
        weekLabel: '2 Hafta Önce',
        shortLabel: '2. Hafta',
        dateRange: '2 Hafta Önce',
        totalQuestions: data.pastWeeks?.[1] ?? 0,
        targetGoal: 45,
        isCurrentWeek: false,
      },
      {
        id: 'w-3',
        weekLabel: 'Geçen Hafta',
        shortLabel: 'Geçen Hafta',
        dateRange: 'Geçen Hafta',
        totalQuestions: lastWeekTotal,
        targetGoal: 50,
        isCurrentWeek: false,
      },
      {
        id: 'w-4',
        weekLabel: 'Bu Hafta',
        shortLabel: 'Bu Hafta',
        dateRange: 'Güncel Hafta',
        totalQuestions: thisWeekTotal,
        targetGoal: 50,
        isCurrentWeek: true,
      },
    ];

    return {
      summary: {
        thisWeekTotal,
        lastWeekTotal,
        difference,
        percentChange,
        direction,
        weeklyTarget,
        targetCompletionRate,
        dailyAverage,
        bestDay,
      },
      dailyStats,
      fourWeeksTrend,
      allTimeTotal: Math.max(user.totalQuestionsSolved || 0, thisWeekTotal),
    };
  }

  private getDefaultWeeklyQuestionsData(user: UserProfile, todayIdx: number) {
    const thisWeek = [0, 0, 0, 0, 0, 0, 0];
    const lastWeek = [0, 0, 0, 0, 0, 0, 0];
    if (user.todayPracticed) thisWeek[todayIdx] = user.todayQuestionsSolved || 0;

    return {
      thisWeekDays: thisWeek,
      lastWeekDays: lastWeek,
      pastWeeks: [0, 0],
      weekStart: this.getWeekStartKey(),
    };
  }

  private getWeekStartKey(date = new Date()): string {
    const monday = new Date(date);
    const dayIndex = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dayIndex);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  }

  private rollWeeklyQuestionData(data: any) {
    const currentWeekStart = this.getWeekStartKey();
    if (data.weekStart === currentWeekStart) return data;

    const priorWeekStart = typeof data.weekStart === 'string'
      ? new Date(`${data.weekStart}T00:00:00`).getTime()
      : Number.NaN;
    const currentWeekTime = new Date(`${currentWeekStart}T00:00:00`).getTime();
    const isImmediatelyPreviousWeek = Number.isFinite(priorWeekStart)
      && Math.round((currentWeekTime - priorWeekStart) / 86_400_000) === 7;
    const completedWeekTotal = Array.isArray(data.thisWeekDays)
      ? data.thisWeekDays.reduce((sum: number, count: unknown) => sum + (Number(count) || 0), 0)
      : 0;

    return {
      thisWeekDays: [0, 0, 0, 0, 0, 0, 0],
      lastWeekDays: isImmediatelyPreviousWeek && Array.isArray(data.thisWeekDays)
        ? [...data.thisWeekDays]
        : [0, 0, 0, 0, 0, 0, 0],
      pastWeeks: isImmediatelyPreviousWeek
        ? [data.pastWeeks?.[1] || 0, completedWeekTotal]
        : [0, 0],
      weekStart: currentWeekStart,
    };
  }

  private incrementWeeklyQuestionCount() {
    try {
      const now = new Date();
      const todayIdx = (now.getDay() + 6) % 7;
      const raw = safeStorage.getItem(STORAGE_KEYS.WEEKLY_QUESTIONS);
      let data: any;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = this.getDefaultWeeklyQuestionsData(this.getCurrentUser(), todayIdx);
        }
      } else {
        data = this.getDefaultWeeklyQuestionsData(this.getCurrentUser(), todayIdx);
      }
      if (!Array.isArray(data.thisWeekDays) || data.thisWeekDays.length !== 7) {
        data.thisWeekDays = [0, 0, 0, 0, 0, 0, 0];
      }
      data = this.rollWeeklyQuestionData(data);
      data.thisWeekDays[todayIdx] = (data.thisWeekDays[todayIdx] || 0) + 1;
      this.setProgressItem(STORAGE_KEYS.WEEKLY_QUESTIONS, JSON.stringify(data));
    } catch {}
  }

  // 6. Achievements & Badge System
  getAchievements(): Achievement[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (raw) {
      try {
        const stored: Achievement[] = JSON.parse(raw);
        let changed = false;
        // Merge missing achievements or updated rich metadata
        INITIAL_ACHIEVEMENTS.forEach((initAch) => {
          const exists = stored.find((s) => s.id === initAch.id);
          if (!exists) {
            stored.push({ ...initAch });
            changed = true;
          } else {
            // Update metadata fields if missing or changed
            if (exists.tier !== initAch.tier && initAch.tier) {
              exists.tier = initAch.tier;
              changed = true;
            }
            if (exists.rarityLabel !== initAch.rarityLabel && initAch.rarityLabel) {
              exists.rarityLabel = initAch.rarityLabel;
              changed = true;
            }
            if (exists.pedagogyNote !== initAch.pedagogyNote && initAch.pedagogyNote) {
              exists.pedagogyNote = initAch.pedagogyNote;
              changed = true;
            }
            if (exists.criteriaLabel !== initAch.criteriaLabel && initAch.criteriaLabel) {
              exists.criteriaLabel = initAch.criteriaLabel;
              changed = true;
            }
            if (exists.rewardXP === undefined && initAch.rewardXP) {
              exists.rewardXP = initAch.rewardXP;
              changed = true;
            }
            if (exists.badgeIcon === undefined && initAch.badgeIcon) {
              exists.badgeIcon = initAch.badgeIcon;
              changed = true;
            }
            if (exists.title !== initAch.title) {
              exists.title = initAch.title;
              changed = true;
            }
            if (exists.description !== initAch.description) {
              exists.description = initAch.description;
              changed = true;
            }
          }
        });
        if (changed) {
          this.setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(stored));
        }
        return stored;
      } catch {}
    }
    const initial = createLockedAchievements();
    this.setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(initial));
    return initial;
  }

  unlockAchievement(id: string): Achievement | null {
    const items = this.getAchievements();
    const idx = items.findIndex((a) => a.id === id);
    if (idx !== -1 && !items[idx].unlocked) {
      items[idx].unlocked = true;
      items[idx].unlockedAt = new Date().toISOString().split('T')[0];
      items[idx].progress = items[idx].maxProgress;
      if (items[idx].rewardXP && !items[idx].rewardClaimed) {
        items[idx].rewardClaimed = true;
        this.addXP(items[idx].rewardXP);
      }
      this.setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(items));
      return items[idx];
    }
    return null;
  }

  claimBadgeReward(id: string): { success: boolean; xpAwarded: number; achievement: Achievement | null; user: UserProfile } {
    const items = this.getAchievements();
    const idx = items.findIndex((a) => a.id === id);
    if (idx !== -1 && items[idx].unlocked && !items[idx].rewardClaimed) {
      items[idx].rewardClaimed = true;
      const xp = items[idx].rewardXP || 50;
      this.addXP(xp);
      this.setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(items));
      return { success: true, xpAwarded: xp, achievement: items[idx], user: this.getCurrentUser() };
    }
    return { success: false, xpAwarded: 0, achievement: items[idx] || null, user: this.getCurrentUser() };
  }

  equipBadge(badgeId: string): { success: boolean; user: UserProfile; message?: string } {
    const user = this.getCurrentUser();
    const achievements = this.getAchievements();
    const badge = achievements.find((a) => a.id === badgeId);

    if (!badge || !badge.unlocked) {
      return { success: false, user, message: 'Bu rozet henüz kazanılmadı.' };
    }

    const currentFeatured = [...(user.featuredBadgeIds || [])];
    if (currentFeatured.includes(badgeId)) {
      return { success: true, user }; // Already equipped
    }

    if (currentFeatured.length >= 3) {
      // Replace oldest
      currentFeatured.shift();
    }
    currentFeatured.push(badgeId);

    user.featuredBadgeIds = currentFeatured;
    this.setCurrentUser(user);
    return { success: true, user };
  }

  unequipBadge(badgeId: string): { success: boolean; user: UserProfile } {
    const user = this.getCurrentUser();
    const currentFeatured = (user.featuredBadgeIds || []).filter((id) => id !== badgeId);
    user.featuredBadgeIds = currentFeatured;
    this.setCurrentUser(user);
    return { success: true, user };
  }

  syncBadgesWithProgress(): Achievement[] {
    const user = this.getCurrentUser();
    const achievements = this.getAchievements();
    const mistakes = this.getMistakes();
    const masteries = this.getSkillMasteries();
    let changed = false;

    // 1. Streak badges
    const streak = user.streak || 0;
    const streakMap: Record<string, number> = {
      streak_3: 3,
      streak_5: 5,
      streak_7: 7,
      streak_14: 14,
      streak_30: 30,
    };
    Object.entries(streakMap).forEach(([id, target]) => {
      const b = achievements.find((a) => a.id === id);
      if (b) {
        b.progress = Math.min(b.maxProgress, streak);
        if (streak >= target && !b.unlocked) {
          b.unlocked = true;
          b.unlockedAt = new Date().toISOString().split('T')[0];
          changed = true;
        }
      }
    });

    // 2. Question badges
    const qCount = user.totalQuestionsSolved || 0;
    const qMap: Record<string, number> = {
      first_step: 1,
      questions_10: 10,
      questions_25: 25,
      questions_50: 50,
      questions_100: 100,
      questions_250: 250,
    };
    Object.entries(qMap).forEach(([id, target]) => {
      const b = achievements.find((a) => a.id === id);
      if (b) {
        b.progress = Math.min(b.maxProgress, qCount);
        if (qCount >= target && !b.unlocked) {
          b.unlocked = true;
          b.unlockedAt = new Date().toISOString().split('T')[0];
          changed = true;
        }
      }
    });

    // 3. Mistake badges
    const resolvedCount = user.resolvedMistakesCount || 0;
    const m5 = achievements.find((a) => a.id === 'mistakes_solved_5');
    if (m5) {
      m5.progress = Math.min(m5.maxProgress, resolvedCount);
      if (resolvedCount >= m5.maxProgress && !m5.unlocked) {
        m5.unlocked = true;
        m5.unlockedAt = new Date().toISOString().split('T')[0];
        changed = true;
      }
    }

    const unresolvedLeft = mistakes.filter((m) => !m.resolved).length;
    if (unresolvedLeft === 0 && mistakes.length > 0) {
      const cleanB = achievements.find((a) => a.id === 'clean_notebook');
      if (cleanB && !cleanB.unlocked) {
        cleanB.unlocked = true;
        cleanB.progress = 1;
        cleanB.unlockedAt = new Date().toISOString().split('T')[0];
        changed = true;
      }
    }

    // 4. Mastery badges
    const matrixMastery = masteries.find((m) => m.category === 'matrix')?.mastery || 0;
    const mmB = achievements.find((a) => a.id === 'matrix_master');
    if (mmB) {
      mmB.progress = matrixMastery;
      if (matrixMastery >= mmB.maxProgress && !mmB.unlocked) {
        mmB.unlocked = true;
        mmB.unlockedAt = new Date().toISOString().split('T')[0];
        changed = true;
      }
    }

    const attentionMastery = masteries.find((m) => m.category === 'attention')?.mastery || 0;
    const eeB = achievements.find((a) => a.id === 'eagle_eyes');
    if (eeB) {
      eeB.progress = attentionMastery;
      if (attentionMastery >= eeB.maxProgress && !eeB.unlocked) {
        eeB.unlocked = true;
        eeB.unlockedAt = new Date().toISOString().split('T')[0];
        changed = true;
      }
    }

    if (changed) {
      this.setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    }
    return achievements;
  }

  // 6. Daily Study Plan
  getDailyPlan(): DailyStudyPlan {
    const user = this.getCurrentUser();
    const masteries = this.getSkillMasteries();
    // Sort to find weaker skills
    const sorted = [...masteries].sort((a, b) => a.mastery - b.mastery);
    const weak1 = sorted[0]?.category || 'matrix';
    const weak2 = sorted[1]?.category || 'pattern';
    const other = sorted[2]?.category || 'spatial';

    return {
      date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
      targetQuestions: user.dailyGoalQuestions || 10,
      estimatedMinutes: user.dailyGoalMinutes || 15,
      completedQuestions: user.todayQuestionsSolved ?? 0,
      targetCategories: [
        { category: weak1, count: 4 },
        { category: weak2, count: 3 },
        { category: other, count: 3 },
      ],
    };
  }

  updateDailyGoal(questions?: number, minutes?: number, sessions?: number): UserProfile {
    const user = this.getCurrentUser();
    if (questions !== undefined) user.dailyGoalQuestions = questions;
    if (minutes !== undefined) user.dailyGoalMinutes = minutes;
    if (sessions !== undefined) user.dailyGoalSessions = sessions;
    this.setCurrentUser(user);
    return user;
  }

  // 7. Exam Results History
  getExamResults(): ExamResult[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.EXAM_RESULTS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    this.setProgressItem(STORAGE_KEYS.EXAM_RESULTS, JSON.stringify([]));
    return [];
  }

  saveExamResult(result: ExamResult) {
    const list = this.getExamResults();
    list.unshift(result);
    this.setProgressItem(STORAGE_KEYS.EXAM_RESULTS, JSON.stringify(list));
    this.unlockAchievement('exam_finisher');
  }

  // Active Exam state persistence (survival on refresh)
  getActiveExam() {
    const raw = safeStorage.getItem(STORAGE_KEYS.ACTIVE_EXAM);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveActiveExam(state: any) {
    this.setProgressItem(STORAGE_KEYS.ACTIVE_EXAM, JSON.stringify(state));
  }

  clearActiveExam() {
    this.removeProgressItem(STORAGE_KEYS.ACTIVE_EXAM);
  }

  // Study Reminder Configuration
  getReminderConfig(): StudyReminderConfig {
    return reminderService.getConfig();
  }

  saveReminderConfig(config: Partial<StudyReminderConfig>): StudyReminderConfig {
    return reminderService.saveConfig(config);
  }

  // Anonymous Gamified Leaderboard ("Günün En İyileri" & "Haftanın Çalışkanları")
  getLeaderboard(period: LeaderboardPeriod = 'daily', gradeFilter: number | 'all' = 'all'): LeaderboardEntry[] {
    const user = this.getCurrentUser();

    // A public multi-user ranking requires a server-maintained, anonymized aggregate.
    // Until that backend exists, only authenticated first-party progress is shown.
    if (gradeFilter !== 'all' && user.grade !== gradeFilter) return [];
    return [{
      id: user.id,
      rank: 1,
      anonymousAlias: `${user.name} (Sen)`,
      avatar: user.avatar || '🦊',
      grade: user.grade ?? 1,
      isCurrentUser: true,
      xpEarned: period === 'daily' ? 0 : user.xp,
      questionsSolved: period === 'daily' ? (user.todayQuestionsSolved || 0) : (user.totalQuestionsSolved || 0),
      minutesSpent: user.todayMinutesSpent || 0,
      streak: user.streak || 0,
      accuracy: 0,
      clapsCount: 0,
    }];

  }

  upsertAchievement(achievement: Achievement): void {
    const achievements = this.getAchievements();
    const existingIndex = achievements.findIndex((item) => item.id === achievement.id);
    if (existingIndex >= 0) achievements[existingIndex] = { ...achievements[existingIndex], ...achievement };
    else achievements.unshift(achievement);
    this.setProgressItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  }
}

export const dataService = new ZekaParkDataService();
