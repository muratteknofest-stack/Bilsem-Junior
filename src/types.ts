export type UserRole = 'student' | 'parent' | 'admin';

export interface StreakMilestone {
  day: number;
  title: string;
  badge: string;
  xpReward: number;
  rewardType: 'xp' | 'shield' | 'badge' | 'crown' | 'trophy';
  description: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  lastLoginAt?: number;
  createdAt?: number;
  updatedAt?: number;
  totalPoints?: number;
  name: string;
  role: UserRole;
  studentCode?: string;
  linkedStudentIds?: string[];
  linkedParentId?: string;
  grade?: number;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  longestStreak?: number;
  lastActiveDate: string;
  todayPracticed?: boolean;
  streakFreezeCount?: number;
  claimedStreakDays?: number[];
  weeklyStreakHistory?: boolean[]; // [Pzt, Sal, Çar, Per, Cum, Cmt, Paz]
  dailyGoalMinutes: number;
  todayMinutesSpent: number;
  dailyGoalQuestions?: number;
  todayQuestionsSolved?: number;
  dailyGoalSessions?: number;
  todaySessionsCompleted?: number;
  soundEnabled: boolean;
  totalQuestionsSolved?: number;
  resolvedMistakesCount?: number;
  featuredBadgeIds?: string[];
  reminderConfig?: StudyReminderConfig;
}

export type ReminderFrequency = 'daily_fixed' | 'interval_3h' | 'smart_goal';

export interface StudyReminderConfig {
  enabled: boolean;
  reminderTime: string; // e.g. "17:30"
  frequency: ReminderFrequency;
  browserPushEnabled: boolean;
  soundAlert: boolean;
  weekendIncluded: boolean;
  customMessage?: string;
  snoozeUntil?: number | null; // Timestamp until which alerts are muted
  lastNotifiedDate?: string; // YYYY-MM-DD
  lastNotifiedHour?: number;
}

export interface ReminderAlertEvent {
  id: string;
  title: string;
  message: string;
  motivationQuote: string;
  remainingMinutes: number;
  dailyGoalMinutes: number;
  currentStreak: number;
  suggestedAction: 'practice' | 'adaptive' | 'mistakes';
  timestamp: number;
}

export type CognitiveCategory =
  | 'visual_perception' // Görsel Algı
  | 'pattern'           // Örüntü ve Dizi
  | 'matrix'            // Matris Tamamlama
  | 'spatial'           // Uzamsal Zeka ve Döndürme
  | 'logic'             // Mantık ve Muhakeme
  | 'attention'         // Dikkat ve Odaklanma
  | 'memory'            // Görsel Bellek
  | 'numerical'
  | 'verbal'
  | 'coding';        // Sayısal Muhakeme

export const ALL_COGNITIVE_CATEGORIES: CognitiveCategory[] = [
  'visual_perception',
  'pattern',
  'matrix',
  'spatial',
  'logic',
  'attention',
  'memory',
  'numerical',
  'verbal',
  'coding',
];

export const COGNITIVE_CATEGORY_LABELS: Record<CognitiveCategory, string> = {
  visual_perception: 'Görsel Algı & Parça Bütün',
  pattern: 'Örüntü ve Dizi Analizi',
  matrix: 'Matris Tamamlama',
  spatial: 'Uzamsal Zeka & Döndürme',
  logic: 'Mantık ve Muhakeme',
  attention: 'Dikkat ve Odaklanma',
  memory: 'Görsel Bellek',
  numerical: 'Sayısal Muhakeme',
  verbal: 'Sözel Mantık & Analoji',
  coding: 'Algoritma & Kodlama',
};

export interface CategoryInfo {
  id: CognitiveCategory;
  name: string;
  description: string;
  iconName: string;
  color: string;
  bgLight: string;
  badge: string;
}

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: 'Çok Kolay',
  2: 'Kolay',
  3: 'Orta',
  4: 'Zor',
  5: 'Çok Zor',
  6: 'Uzman',
};

export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  1: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  2: 'bg-teal-100 text-teal-800 border-teal-300',
  3: 'bg-blue-100 text-blue-800 border-blue-300',
  4: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  5: 'bg-purple-100 text-purple-800 border-purple-300',
  6: 'bg-rose-100 text-rose-800 border-rose-300',
};

// 18 Formal Procedural Question Types
export type QuestionType =
  | 'odd_one_out'          // 01 Farklı Olanı Bul
  | 'visual_sequence'      // 02 Görsel Örüntü
  | 'matrix_2x2'           // 03 2x2 Matris
  | 'figure_rotation'      // 04 Şekil Döndürme
  | 'mirror_reflection'    // 05 Ayna Simetrisi
  | 'symmetry_completion'  // 06 Simetri Tamamlama
  | 'figure_completion'    // 07 Parça Bütün
  | 'spatial_relationship' // 08 Uzamsal İlişki
  | 'visual_analogy'       // 09 Görsel Analoji
  | 'shape_counting'       // 10 Şekil Sayma
  | 'direction_path'       // 11 Yön ve Rota Takibi
  | 'visual_memory'        // 12 Görsel Bellek
  | 'symbol_coding'        // 13 Sembol Şifreleme
  | 'classification'       // 14 Sınıflandırma
  | 'visual_attention'     // 15 Görsel Dikkat
  | 'number_pattern'       // 16 Sayısal Örüntü
  | 'logical_sequence'     // 17 Mantık Akışı
  | 'matrix_3x3'           // 18 3x3 Matris
  | 'shape_equation'       // 19 Şekil Denklemleri
  | 'latin_square'         // 20 Sudoku / Latin Karesi
  | 'shadow_matching'      // 21 Gölge Eşleştirme
  | 'balance_scale'        // 22 Terazi Dengesi
  | 'gear_rotation'        // 23 Dişli Çarklar
  | 'paper_folding'        // 24 Kağıt Katlama
  | 'venn_diagram'         // 25 Venn Şeması
  | 'cube_counting'        // 26 Küp Sayma
  | 'dice_unfold'          // 27 Küp Açılımı
  | 'cryptogram'           // 28 Şifreli Sözcükler
  | 'operation_machine'    // 29 İşlem Makinesi
  | 'top_view'             // 30 Üstten Görünüş
  | 'shape_combination'    // 31 Şekil Birleştirme
  | 'verbal_analogy'       // 32 Sözel İlişki
  | 'number_pyramid'       // 33 Sayı Piramidi
  | 'story_logic'          // 34 Hikayeli Mantık
  | 'tangram_puzzle'       // 35 Tangram ve Şekil İnşası
  | 'maze_path'            // 36 Labirent ve Rota Kodlama
  | 'logic_grid'           // 37 Mantık Tablosu ve Çıkarım
  | 'punch_folding'        // 38 Katlama ve Delik Açma
  | 'detail_detection'     // 39 Detay Fark Etme ve Eksik Sembol
  | 'weight_comparison'    // 40 Ağırlık Sıralama ve Kütle Dengesi
  | 'multiview_perspective'// 41 3B Perspektif ve Çok Yönlü Görünüş
  | 'raven_matrix'         // 42 Raven İleri Mantık Matrisi
  | 'word_scramble_logic'  // 43 Şifreli Anagram ve Kelime Mantığı
  | 'spatial_origami';     // 44 Zihinsel Kutu ve Açılım Eşleme

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  odd_one_out: '01. Farklı Olanı Bul',
  visual_sequence: '02. Görsel Örüntü & Dizi',
  matrix_2x2: '03. 2x2 Matris Tamamlama',
  figure_rotation: '04. Şekil Döndürme',
  mirror_reflection: '05. Ayna Simetrisi & Yansıma',
  symmetry_completion: '06. Simetri Tamamlama',
  figure_completion: '07. Parça Bütün İlişkisi',
  spatial_relationship: '08. Uzamsal Konum & İlişki',
  visual_analogy: '09. Görsel Analoji',
  shape_counting: '10. Şekil Sayma',
  direction_path: '11. Yön ve Rota Takibi',
  visual_memory: '12. Görsel Bellek',
  symbol_coding: '13. Sembol Şifreleme',
  classification: '14. Sınıflandırma',
  visual_attention: '15. Görsel Dikkat & Odak',
  number_pattern: '16. Sayısal Örüntü',
  logical_sequence: '17. Mantık Akışı',
  matrix_3x3: '18. 3x3 Matris Tamamlama',
  shape_equation: '19. Şekil Denklemleri',
  latin_square: '20. Görsel Sudoku (Latin Karesi)',
  shadow_matching: '21. Gölge Eşleştirme',
  balance_scale: '22. Terazi Dengesi',
  gear_rotation: '23. Dişli Çarklar ve Yön',
  paper_folding: '24. Kağıt Katlama ve Kesme',
  venn_diagram: '25. Kümeler ve Venn Şeması',
  cube_counting: '26. Küp Sayma (3 Boyut)',
  dice_unfold: '27. Küp Açılımı',
  cryptogram: '28. Şifreli Sözcükler',
  operation_machine: '29. İşlem Makinesi',
  top_view: '30. Üstten Görünüş',
  shape_combination: '31. Şekil Birleştirme',
  verbal_analogy: '32. Sözel İlişki ve Analoji',
  number_pyramid: '33. Sayı Piramidi',
  story_logic: '34. Hikayeli Mantık',
  tangram_puzzle: '35. Tangram & Şekil İnşası',
  maze_path: '36. Labirent & Rota Kodlama',
  logic_grid: '37. Mantık Tablosu & Çıkarım',
  punch_folding: '38. Katlama ve Delik Açma',
  detail_detection: '39. Detay Fark Etme & Eksik Sembol',
  weight_comparison: '40. Ağırlık Sıralama & Kütle Dengesi',
  multiview_perspective: '41. 3B Perspektif & Çok Yönlü Görünüm',
  raven_matrix: '42. Raven İleri Mantık Matrisi',
  word_scramble_logic: '43. Şifreli Anagram & Kelime Mantığı',
  spatial_origami: '44. Zihinsel Kutu & Açılım Eşleme',
};

export interface VisualOption {
  id: string; // 'A' | 'B' | 'C' | 'D'
  label: string;
  fingerprint: string;
  visualData: any;
}

export interface VisualExplanation {
  summary: string;
  ruleTitle: string;
  steps: string[];
  visualHint?: {
    type: 'arrow' | 'highlight' | 'rotation' | 'diff' | 'matrix_cell';
    coordinates?: { x: number; y: number }[];
    highlightOptionId?: string;
    details?: string;
  };
}

export interface BaseQuestion {
  id: string;
  version: number;
  type: QuestionType;
  category: CognitiveCategory;
  difficulty: DifficultyLevel;
  ageGroup: '1-2' | '3-4' | 'all';
  prompt: string;
  secondaryPrompt?: string;
  options: VisualOption[];
  correctOptionId: string;
  explanation: VisualExplanation;
  estimatedSeconds: number;
  skills: string[];
  seed: number;
  visualConfig: any;
  targetGrade?: 1 | 2 | 3 | 4;
  targetGrades?: (1 | 2 | 3 | 4)[];
  createdAt?: string;
  isCustom?: boolean;
}

export interface PracticeSessionState {
  sessionId: string;
  category: CognitiveCategory | 'mixed';
  difficulty: DifficultyLevel | 'adaptive';
  questions: BaseQuestion[];
  currentIndex: number;
  answers: Record<string, {
    selectedOptionId: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
  }>;
  startedAt: number;
  completedAt?: number;
  status: 'active' | 'completed';
}

export interface MistakeItem {
  id: string;
  questionId: string;
  questionSeed: number;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  category: CognitiveCategory;
  prompt: string;
  createdAt: string;
  reviewed: boolean;
  resolved: boolean;
  resolvedAt?: string;
  cachedQuestion?: BaseQuestion;
}

export interface ExamSessionState {
  examId: string;
  title: string;
  totalDurationSeconds: number;
  remainingSeconds: number;
  questions: BaseQuestion[];
  currentIndex: number;
  answers: Record<string, string>; // questionId -> optionId
  flags: Record<string, boolean>;  // questionId -> isFlagged
  startedAt: number;
  status: 'in_progress' | 'completed';
}

export interface ExamResult {
  examId: string;
  title: string;
  date: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  scorePercentage: number;
  totalTimeSeconds: number;
  categoryBreakdown: Record<CognitiveCategory, {
    total: number;
    correct: number;
  }>;
}

export interface SkillMastery {
  category: CognitiveCategory;
  categoryName: string;
  mastery: number; // 0 - 100
  attemptCount: number;
  accuracy: number; // percentage 0 - 100
  recentTrend: 'up' | 'down' | 'neutral';
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface WeeklyBadgeReward {
  id: string;
  title: string;
  badgeIcon: string;
  tier: BadgeTier;
  rarityLabel: string;
  description: string;
  pedagogyBenefit: string;
  xpReward: number;
}

export interface WeeklyCategoryChallenge {
  id: string;
  weekId: string;
  category: CognitiveCategory;
  categoryName: string;
  title: string;
  description: string;
  pedagogicalObjective: string;
  targetQuestions: number;
  completedQuestions: number;
  isCompleted: boolean;
  rewardClaimed: boolean;
  badgeReward: WeeklyBadgeReward;
  bonusXP: number;
  difficultyGuidance?: string;
}

export interface WeeklyChallengesState {
  weekId: string;
  weekNumber: number;
  year: number;
  startDateFormatted: string;
  endDateFormatted: string;
  daysRemaining: number;
  hoursRemaining: number;
  challenges: WeeklyCategoryChallenge[];
  totalQuestionsCompleted: number;
  totalTargetQuestions: number;
  completedChallengesCount: number;
  grandChallenge: {
    id: string;
    title: string;
    description: string;
    requiredCategoriesCount: number;
    badgeReward: WeeklyBadgeReward;
    isCompleted: boolean;
    rewardClaimed: boolean;
  };
  weeklyStreakWeeks: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'streak' | 'questions' | 'exam' | 'mastery' | 'special' | 'weekly';
  cognitiveCategory?: CognitiveCategory;
  weeklyChallengeId?: string;
  tier?: BadgeTier;
  rarityLabel?: string;
  pedagogyNote?: string;
  criteriaLabel?: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  rewardXP?: number;
  badgeIcon?: string;
  rewardClaimed?: boolean;
}

export interface DailyMission {
  id: string;
  title: string;
  rewardXP: number;
  current: number;
  target: number;
  completed: boolean;
}

export interface DailyPlanTask {
  id: string;
  title: string;
  description: string;
  category: CognitiveCategory | 'mistakes' | 'adaptive';
  targetCount: number;
  completedCount: number;
  rewardXP: number;
  isCompleted: boolean;
  priority: 'high' | 'medium' | 'bonus';
  actionType: 'practice_category' | 'review_mistakes' | 'adaptive_session';
}

export interface AiPlanWeaknessFocus {
  category: CognitiveCategory;
  categoryName: string;
  reason: string;
  currentMastery: number;
  mistakeCount: number;
}

export interface AiPersonalizedDailyPlan {
  dateKey: string; // 'YYYY-MM-DD'
  formattedDate: string; // e.g. '11 Eylül Cuma'
  generatedAtTimestamp: number;
  greetingTitle: string;
  morningCoachMessage: string;
  motivationalQuote: string;
  focusWeaknesses: AiPlanWeaknessFocus[];
  tasks: DailyPlanTask[];
  totalTargetQuestions: number;
  totalCompletedQuestions: number;
  estimatedMinutes: number;
  dailySuperpowerTarget: string;
  isAiGenerated: boolean;
  modelUsed?: string;
}

export interface DailyStudyPlan {
  date: string;
  targetQuestions: number;
  estimatedMinutes: number;
  targetCategories: {
    category: CognitiveCategory;
    count: number;
  }[];
  completedQuestions: number;
  aiPlan?: AiPersonalizedDailyPlan;
}

export type LeaderboardPeriod = 'daily' | 'weekly';

export interface LeaderboardEntry {
  id: string;
  anonymousAlias: string; // e.g. "Zeki Tilki 🦊", "Astronot Deniz 🚀"
  avatar: string;
  grade: number;
  rank: number;
  isCurrentUser: boolean;
  xpEarned: number;
  questionsSolved: number;
  minutesSpent: number;
  streak: number;
  accuracy: number;
  clapsCount: number;
  specialBadge?: string;
}

export type GlossaryDemoType =
  | 'matrix_demo'
  | 'symmetry_demo'
  | 'rotation_demo'
  | 'pattern_demo'
  | 'folding_demo'
  | 'analogy_demo'
  | 'shadow_demo'
  | 'odd_demo';

export interface GlossaryTerm {
  id: string;
  term: string;
  englishTerm: string;
  category: CognitiveCategory;
  badge: string;
  shortDefinition: string;
  detailedExplanation: string;
  bilsemTip: string;
  exampleScenario: string;
  demoType: GlossaryDemoType;
  tags: string[];
  practiceCategory?: string;
}

export interface AiHintStep {
  stepNumber: number;
  title: string;
  type: 'focus' | 'rule' | 'elimination';
  content: string;
  keyObservation?: string;
  suggestedAction?: string;
}

export interface QuestionAiHint {
  questionId: string;
  category: CognitiveCategory;
  questionType: string;
  difficulty: number;
  totalSteps: number;
  unlockedSteps: number;
  introEncouragement: string;
  steps: AiHintStep[];
  isAiGenerated: boolean;
  modelUsed?: string;
}

export interface AiMistakeExplanation {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  category: CognitiveCategory;
  questionType: string;
  difficulty: number;
  empatheticIntro: string;
  misconceptionTrap: string;
  differenceAnalysis: string;
  goldenRuleTip: string;
  bilsemSuperPower: string;
  isAiGenerated: boolean;
  modelUsed?: string;
}

export interface AiExplanationStep {
  stepNumber: number;
  title: string;
  badge: string; // e.g. "Görsel Odak", "Mantık & Kural", "Eleme & Seçim", "Bilişsel Altın Taktik"
  type: 'focus' | 'rule' | 'elimination' | 'tactic';
  explanation: string;
  keyObservation?: string;
  visualAnchor?: string;
}

export interface AiStepByStepExplanation {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  category: CognitiveCategory;
  questionType: string;
  difficulty: number;
  headlineTitle: string;
  pedagogicalSummary: string;
  steps: AiExplanationStep[];
  isAiGenerated: boolean;
  modelUsed?: string;
}

export interface DayQuestionStats {
  dayIndex: number; // 0: Mon ... 6: Sun
  dayName: string;
  shortDay: string;
  thisWeek: number;
  lastWeek: number;
  isToday: boolean;
}

export interface WeekComparisonSummary {
  thisWeekTotal: number;
  lastWeekTotal: number;
  difference: number;
  percentChange: number;
  direction: 'up' | 'down' | 'same';
  weeklyTarget: number;
  targetCompletionRate: number;
  dailyAverage: number;
  bestDay: {
    dayName: string;
    shortDay: string;
    count: number;
  };
}

export interface PastWeekTrendItem {
  id: string;
  weekLabel: string;
  shortLabel: string;
  dateRange: string;
  totalQuestions: number;
  targetGoal: number;
  isCurrentWeek: boolean;
}

export interface WeeklyQuestionProgressData {
  summary: WeekComparisonSummary;
  dailyStats: DayQuestionStats[];
  fourWeeksTrend: PastWeekTrendItem[];
  allTimeTotal: number;
}
