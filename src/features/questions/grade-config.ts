import { DifficultyLevel, QuestionType, CognitiveCategory } from '../../types';

export interface GradeLevelConfig {
  grade: 1 | 2 | 3 | 4;
  title: string;
  stageName: string;
  subtitle: string;
  defaultDifficulty: DifficultyLevel;
  difficultyRange: DifficultyLevel[];
  recommendedTypes: QuestionType[];
  timeLimitSeconds: number;
  pedagogicalFocus: string;
  targetSkills: string[];
  icon: string;
  badgeColor: string;
  badgeBg: string;
  cardBorder: string;
  accentBg: string;
  primaryColor: string;
}

export const GRADE_CONFIGS: Record<1 | 2 | 3 | 4, GradeLevelConfig> = {
  1: {
    grade: 1,
    title: '1. Sınıf',
    stageName: 'Temel Algı & Somut Mantık',
    subtitle: 'İlkokul 1. Sınıf BİLSEM Genel Yetenek',
    defaultDifficulty: 2,
    difficultyRange: [1, 2],
    recommendedTypes: [
      'odd_one_out',
      'figure_completion',
      'symmetry_completion',
      'visual_sequence',
      'shape_counting',
      'direction_path',
      'visual_attention',
      'shadow_matching',
      'paper_folding',
      'cube_counting',
      'shape_combination',
      'tangram_puzzle',
      'maze_path',
      'detail_detection',
    ],
    timeLimitSeconds: 35,
    pedagogicalFocus:
      'Somut görsel ayrıştırma, basit parça-bütün bütünleme, simetrik şekil eşleme, tangram ve dikkat odağı.',
    targetSkills: [
      'Görsel Ayrıştırma',
      'Parça-Bütün İlişkisi',
      'Temel Örüntü Keşfi',
      'Görsel Dikkat',
      'Tangram İnşası',
    ],
    icon: '🎒',
    badgeColor: 'text-emerald-800',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    cardBorder: 'border-emerald-200',
    accentBg: 'bg-emerald-500',
    primaryColor: 'emerald',
  },
  2: {
    grade: 2,
    title: '2. Sınıf',
    stageName: 'Gelişim & Kural Keşfi',
    subtitle: 'İlkokul 2. Sınıf BİLSEM Genel Yetenek',
    defaultDifficulty: 3,
    difficultyRange: [2, 3],
    recommendedTypes: [
      'matrix_2x2',
      'mirror_reflection',
      'figure_rotation',
      'classification',
      'visual_memory',
      'spatial_relationship',
      'visual_sequence',
      'balance_scale',
      'gear_rotation',
      'venn_diagram',
      'cube_counting',
      'dice_unfold',
      'shape_combination',
      'top_view',
      'tangram_puzzle',
      'maze_path',
      'punch_folding',
      'detail_detection',
      'weight_comparison',
    ],
    timeLimitSeconds: 40,
    pedagogicalFocus:
      '2x2 matris kural ilişkileri, ayna simetrisi kuralları, 90° rotasyon, labirent kodlama ve görsel bellek analizi.',
    targetSkills: [
      '2x2 Matris Mantığı',
      'Ayna Yansıması',
      'Rotasyonel Dönüşüm',
      'Görsel Bellek',
      'Labirent Rota Takibi',
    ],
    icon: '📘',
    badgeColor: 'text-blue-800',
    badgeBg: 'bg-blue-50 border-blue-200',
    cardBorder: 'border-blue-200',
    accentBg: 'bg-blue-600',
    primaryColor: 'blue',
  },
  3: {
    grade: 3,
    title: '3. Sınıf',
    stageName: 'İleri Akıl Yürütme & Analoji',
    subtitle: 'İlkokul 3. Sınıf BİLSEM Genel Yetenek',
    defaultDifficulty: 4,
    difficultyRange: [3, 4],
    recommendedTypes: [
      'visual_analogy',
      'matrix_3x3',
      'number_pattern',
      'symbol_coding',
      'logical_sequence',
      'figure_rotation',
      'spatial_relationship',
      'latin_square',
      'balance_scale',
      'gear_rotation',
      'venn_diagram',
      'paper_folding',
      'cube_counting',
      'dice_unfold',
      'cryptogram',
      'top_view',
      'operation_machine',
      'verbal_analogy',
      'logic_grid',
      'punch_folding',
      'weight_comparison',
      'multiview_perspective',
      'word_scramble_logic',
      'spatial_origami',
    ],
    timeLimitSeconds: 45,
    pedagogicalFocus:
      'Analojik akıl yürütme (A:B :: C:D), sayı-şekil ilişkileri, sembol kodlama, mantık tablosu ve 3B perspektif analizi.',
    targetSkills: [
      'Görsel Analoji',
      'Sayısal Örüntü',
      'Sembolik Şifreleme',
      'Mantık Tablosu Çıkarımı',
      '3B Perspektif',
    ],
    icon: '📙',
    badgeColor: 'text-amber-800',
    badgeBg: 'bg-amber-50 border-amber-200',
    cardBorder: 'border-amber-200',
    accentBg: 'bg-amber-500',
    primaryColor: 'amber',
  },
  4: {
    grade: 4,
    title: '4. Sınıf',
    stageName: 'Üstün Yetenek & Soyut Muhakeme',
    subtitle: 'İlkokul 4. Sınıf BİLSEM Genel Yetenek',
    defaultDifficulty: 5,
    difficultyRange: [4, 5, 6],
    recommendedTypes: [
      'matrix_3x3',
      'logical_sequence',
      'symbol_coding',
      'number_pattern',
      'spatial_relationship',
      'visual_analogy',
      'figure_rotation',
      'shape_equation',
      'latin_square',
      'cube_counting',
      'dice_unfold',
      'cryptogram',
      'top_view',
      'operation_machine',
      'verbal_analogy',
      'number_pyramid',
      'story_logic',
      'logic_grid',
      'punch_folding',
      'weight_comparison',
      'multiview_perspective',
      'raven_matrix',
      'word_scramble_logic',
      'spatial_origami',
    ],
    timeLimitSeconds: 50,
    pedagogicalFocus:
      'Soyut tümevarım, çok adımlı mantık zincirleri, 3B uzamsal rotasyon ve üst düzey matris çözümü.',
    targetSkills: [
      'Karmaşık 3x3 Matris',
      'Çoklu Kural Akışı',
      '3B Uzamsal Muhakeme',
      'Kombinatorik Kodlama',
    ],
    icon: '🎓',
    badgeColor: 'text-purple-800',
    badgeBg: 'bg-purple-50 border-purple-200',
    cardBorder: 'border-purple-200',
    accentBg: 'bg-purple-600',
    primaryColor: 'purple',
  },
};

export const ALL_GRADES: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
