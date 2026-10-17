import {
  CognitiveCategory,
  COGNITIVE_CATEGORY_LABELS,
  ALL_COGNITIVE_CATEGORIES,
  SkillMastery,
  BaseQuestion,
} from '../types';
import { dataService } from './data-service';

export type ReTeachingUrgency = 'critical' | 'warning' | 'proficient' | 'mastery';
export type TimeframeOption = '7days' | '30days' | 'all';
export type MetricType = 'accuracy' | 'error_density' | 'speed' | 'volume';

export interface ClassStudentData {
  id: string;
  name: string;
  avatar: string;
  grade: number;
  overallAccuracy: number;
  questionsSolved: number;
  isCurrentUser: boolean;
  categoryScores: Record<CognitiveCategory, {
    accuracy: number; // 0-100
    attempts: number;
    avgTimeSeconds: number;
    trend: 'up' | 'down' | 'neutral';
  }>;
}

export interface ClassRoomInfo {
  id: string;
  name: string;
  grade: number;
  teacherName: string;
  studentCount: number;
  targetBenchmarkAccuracy: number; // e.g., 75%
  recentActiveDate: string;
}

export interface CategoryHeatmapSummary {
  category: CognitiveCategory;
  categoryLabel: string;
  accuracy: number; // 0 - 100
  errorDensity: number; // 0 - 100
  avgTimeSeconds: number;
  totalAttempts: number;
  urgency: ReTeachingUrgency;
  strugglingStudentsCount: number;
  proficientStudentsCount: number;
  strugglingStudents: { name: string; avatar: string; score: number }[];
  primaryMisconception: string;
  recommendedPedagogy: string;
  recommendedActionSteps: string[];
  suggestedQuestionsCountForReteach: number;
}

export interface ClassPerformanceReport {
  classInfo: ClassRoomInfo;
  timeframe: TimeframeOption;
  overallClassAccuracy: number;
  totalQuestionsSolved: number;
  totalAttempts: number;
  averageSpeedSeconds: number;
  reTeachingNeededCount: number;
  topStrengths: { category: CognitiveCategory; score: number }[];
  topWeaknesses: { category: CognitiveCategory; score: number }[];
  categorySummaries: Record<CognitiveCategory, CategoryHeatmapSummary>;
  students: ClassStudentData[];
}

// Initial Classrooms Roster
export const INITIAL_CLASSES: ClassRoomInfo[] = [
  {
    id: 'class-3a',
    name: '3-A BİLSEM Hazırlık',
    grade: 3,
    teacherName: 'Selin Doğan (BİLSEM Mentor)',
    studentCount: 16,
    targetBenchmarkAccuracy: 75,
    recentActiveDate: 'Bugün, 15:40',
  },
  {
    id: 'class-2b',
    name: '2-B Zeka Kaşifleri',
    grade: 2,
    teacherName: 'Ahmet Yılmaz',
    studentCount: 18,
    targetBenchmarkAccuracy: 72,
    recentActiveDate: 'Bugün, 14:15',
  },
  {
    id: 'class-1a',
    name: '1-A Minik Dahiler',
    grade: 1,
    teacherName: 'Zeynep Kaya',
    studentCount: 14,
    targetBenchmarkAccuracy: 70,
    recentActiveDate: 'Dün',
  },
  {
    id: 'class-4c',
    name: '4-C Üstün Yetenek & Raven',
    grade: 4,
    teacherName: 'Ebru Şahin (Özel Yetenek Uzmanı)',
    studentCount: 15,
    targetBenchmarkAccuracy: 80,
    recentActiveDate: 'Bugün, 16:05',
  },
];

// Pre-seeded Class Student Names
const STUDENT_NAMES_BY_GRADE: Record<number, { name: string; avatar: string }[]> = {
  1: [
    { name: 'Zeynep Aydın', avatar: '🐼' },
    { name: 'Kaan Polat', avatar: '🦁' },
    { name: 'Ece Demir', avatar: '🐱' },
    { name: 'Alperen Can', avatar: '🦊' },
    { name: 'Miray Şen', avatar: '🐰' },
    { name: 'Yusuf Emre', avatar: '🐨' },
    { name: 'Defne Koç', avatar: '🦄' },
    { name: 'Burak Tan', avatar: '🚀' },
    { name: 'İpek Yıldız', avatar: '🦋' },
    { name: 'Aras Bulut', avatar: '🐶' },
    { name: 'Melis Kurt', avatar: '🌸' },
    { name: 'Baran Çelik', avatar: '🐯' },
    { name: 'Aslı Güneş', avatar: '⭐' },
    { name: 'Doruk Dağ', avatar: '⚡' },
  ],
  2: [
    { name: 'Ayşe Yılmaz', avatar: '🦉' },
    { name: 'Mert Aksoy', avatar: '🦊' },
    { name: 'Zehra Bal', avatar: '🐱' },
    { name: 'Emirhan Kurt', avatar: '🦁' },
    { name: 'Buse Eren', avatar: '🐰' },
    { name: 'Oğuzhan Kaya', avatar: '🐨' },
    { name: 'Nilüfer Gül', avatar: '🦄' },
    { name: 'Kerim Başar', avatar: '🚀' },
    { name: 'Selin Su', avatar: '🦋' },
    { name: 'Tolga Çetin', avatar: '🐶' },
    { name: 'Gözde Saygın', avatar: '🌸' },
    { name: 'Kemal Sunar', avatar: '🐯' },
    { name: 'Eylül Ada', avatar: '⭐' },
    { name: 'Rüzgar Efe', avatar: '⚡' },
    { name: 'Cemre Nur', avatar: '🐼' },
    { name: 'Bora Karaca', avatar: '🦁' },
    { name: 'Elif Sena', avatar: '🐱' },
    { name: 'Berkant Ay', avatar: '🦊' },
  ],
  3: [
    { name: 'Can Demir', avatar: '🦁' },
    { name: 'Elif Su Ak', avatar: '🦄' },
    { name: 'Barış Doğan', avatar: '🚀' },
    { name: 'Ceren Yurt', avatar: '🦊' },
    { name: 'Umut Can', avatar: '🦉' },
    { name: 'Nazlı Ece', avatar: '🦋' },
    { name: 'Kuzey Yıldız', avatar: '⭐' },
    { name: 'Duru Deniz', avatar: '🌸' },
    { name: 'Emre Çakır', avatar: '⚡' },
    { name: 'Berke Kara', avatar: '🐯' },
    { name: 'Sude Naz', avatar: '🐰' },
    { name: 'Hakan Aslan', avatar: '🐶' },
    { name: 'Melike Er', avatar: '🐱' },
    { name: 'Onur Şimşek', avatar: '🐨' },
    { name: 'Gizem Özer', avatar: '🐼' },
  ],
  4: [
    { name: 'Kerem Öztürk', avatar: '🚀' },
    { name: 'Selin Doğu', avatar: '🦉' },
    { name: 'Yiğit Alp', avatar: '🦁' },
    { name: 'Bengi Irmak', avatar: '🦄' },
    { name: 'Alp Tuna', avatar: '🦊' },
    { name: 'Zeynep Naz', avatar: '🦋' },
    { name: 'Demir Erdem', avatar: '⚡' },
    { name: 'Begüm Nur', avatar: '⭐' },
    { name: 'Yağız Kaan', avatar: '🐯' },
    { name: 'İdil Peri', avatar: '🌸' },
    { name: 'Ozan Ege', avatar: '🐶' },
    { name: 'Damla Güven', avatar: '🐰' },
    { name: 'Arda Güler', avatar: '🐱' },
    { name: 'Eren Vural', avatar: '🐨' },
    { name: 'Cemre Su', avatar: '🐼' },
  ],
};

// Pedagogical Diagnostic Knowledge Base per Cognitive Category
export const CATEGORY_PEDAGOGY_DATA: Record<CognitiveCategory, {
  misconceptions: string[];
  recommendedPedagogies: string[];
  actionSteps: string[];
  baseDifficultyModifier: number;
}> = {
  spatial: {
    misconceptions: [
      'Saat yönü tersine dönüşlerde (özellikle 90° ve 135°) açısal yön kaybı yaşanıyor.',
      'Öğrencilerin %58\'i 3B küp açılımlarında bitişik ve karşılıklı yüzeyleri birbirine karıştırıyor.',
      'Ayna simetrisi ile zihinsel döndürme işlemini birbirine karıştırıp simetrik şıkkı işaretleme eğilimi.',
    ],
    recommendedPedagogies: [
      'Somut manipülatifler (Birim ahşap küpler, katlanabilir origami kâğıtları) ile 2 ders saati uygulamalı atölye.',
      'Soru Tasarım Stüdyosu\'nda şekil döndürme animasyonları üzerinden adım adım açı takip çalışmaları.',
      'Ayna simetrisi vs. Döndürme ayrımını pekiştiren karşılaştırmalı ikili kart oyunları.',
    ],
    actionSteps: [
      'Sınıfa 15 soruluk Seviye 2 "Temel Döndürme ve Ayna Ayrımı" çalışma yaprağı dağıtın.',
      'Akıllı tahtada 3B döndürme simülasyonu ile her öğrenciye yön tahmin ettirin.',
      'Hata yapan öğrencilere bireysel kâğıt katlama egzersizi yaptırın.',
    ],
    baseDifficultyModifier: -14,
  },
  matrix: {
    misconceptions: [
      'Öğrenciler yalnızca satır kuralını inceliyor, sütun kuralındaki değişimi doğrulamadan cevap seçiyor.',
      'Üst üste binme (XOR mantığı) ve eleman birleştirme sorularında şekillerin silinmesini kavrayamama.',
      'Renk değişimi ile şekil rotasyonunun aynı anda uygulandığı çoklu kurallı matrislerde kural aşırı yüklenmesi.',
    ],
    recommendedPedagogies: [
      'Matris analizinde "Önce Satır, Sonra Sütun, En Son Çapraz Doğrulama" 3\'lü kontrol protokolü.',
      'Raven mantık matrislerinde şeffaf katman asetatları ile kuralları adım adım üst üste koyma.',
      'Tersine mühendislik: Öğrencilerin boş matris tasarlayıp sıra arkadaşına çözdürmesi.',
    ],
    actionSteps: [
      'Satır-Sütun 2x2 temel matrislerden 3x3 ileri matrislere kademeli 20 soru çözün.',
      'Soru çözümlerinde doğru şıkkı bulmadan önce 3 yanlış şıkkı gerekçesiyle eletin.',
      'Matris mantık tablosunu sınıf panosuna asın.',
    ],
    baseDifficultyModifier: -10,
  },
  pattern: {
    misconceptions: [
      'Ardışık artış yerine yalnızca son iki elemanın farkına odaklanma (örüntü genişliğini görememe).',
      'Atlamalı çift dizilerde (ör. 2, 10, 4, 12, 6...) iki bağımsız örüntünün varlığını fark edememe.',
      'Geometrik dönüşümlü dizilerde şekil adedinin artışı ile yönün dönüşünü karıştırma.',
    ],
    recommendedPedagogies: [
      'Ritmik sayma ve görsel ritim şablonları ile örüntü periyodunu belirleme egzersizleri.',
      'Farklı renkli kalemlerle atlamalı adımları eşleştirerek iki bağımsız kuralı görselleştirme.',
    ],
    actionSteps: [
      'Dizi kuralını sözlü olarak ifade ettirme (ör. "1 büyüyor, 90 derece sağa dönüyor").',
      'Eksik parça tamamlama kartları ile hızlı 10 dakikalık ısınma maratonu.',
    ],
    baseDifficultyModifier: -2,
  },
  logic: {
    misconceptions: [
      'Öncüllerden biri sağlanmadığı halde ilk mantıklı gelen şıkka sezgisel atlama.',
      'Terazi ve denge problemlerinde kütle yerine şekil büyüklüğüne aldanma yanılgısı.',
      'Olumsuz soru köklerini ("hangisi olamaz / hangisi yanlıştır") gözden kaçırma.',
    ],
    recommendedPedagogies: [
      'Mantık tablosu (Logic Grid) çizerek verilen ipuçlarına "+" ve "-" koyma alışkanlığı kazandırma.',
      'Terazi denklemlerinde sadeleştirme ve yerine koyma metodunun canlandırılması.',
    ],
    actionSteps: [
      'Soru köklerindeki kritik şart kelimelerini renkli fosforlu kalemle çizdirin.',
      'Sözel mantıkta her öncülü madde imleriyle şematize ettirin.',
    ],
    baseDifficultyModifier: -8,
  },
  attention: {
    misconceptions: [
      'Benzer detayların olduğu kalabalık figürlerde aceleci tarama yaparak mikro farkı atlama.',
      'Zaman baskısı altında göz yorgunluğu ve odak sıçramaları nedeniyle son seçenekleri okumama.',
    ],
    recommendedPedagogies: [
      'Sistematik göz tarama tekniği: Soldan sağa, yukarıdan aşağıya satır satır izleme.',
      'Derin nefes ve 3 saniyelik odaklanma duraklaması ile dürtüsel tıklamayı frenleme.',
    ],
    actionSteps: [
      'Farklı olanı bul ve eksik parça detay oyunları ile 10 dakikalık dikkat jimnastiği yapın.',
      'Zaman sınırlı değil, tam doğruluk odaklı yavaşlatılmış antrenman seansı düzenleyin.',
    ],
    baseDifficultyModifier: +4,
  },
  visual_perception: {
    misconceptions: [
      'Karmaşık görselde parça-bütün ilişkisini kurarken parçanın ölçek veya döndürülmüş halini tanıyamama.',
      'Gölge eşleştirmede figürün iç detaylarına odaklanıp dış silüet hatlarını incelememe.',
    ],
    recommendedPedagogies: [
      'Silüet ve gölge kartları ile dış hat algısını geliştirme çalışmaları.',
      'Tangram parçalarıyla hedef şekil oluşturma ve zihinde ayrıştırma egzersizleri.',
    ],
    actionSteps: [
      'Tangram ve şekil parçalama egzersizlerini içeren 12 soruluk pekiştirme seti.',
      'Silüet eşleme çalışmasını akıllı tahtada eş zamanlı yarışma olarak yürütün.',
    ],
    baseDifficultyModifier: +6,
  },
  memory: {
    misconceptions: [
      'Kısa süreli görsel bellekte sembollerin konumunu hatırlarken renklerini unutma.',
      'Öğe sayısı 5\'in üzerine çıktığında zihinsel gruplama (chunking) yapamama.',
    ],
    recommendedPedagogies: [
      'Zihinsel kodlama ve hikâyeleme tekniği (öğeleri bir senaryoya bağlama).',
      'Görsel haritada sembolleri 2\'şerli ve 3\'erli öbeklere (chunking) ayırma stratejisi.',
    ],
    actionSteps: [
      '3 saniye gösterip kapatılan ızgara hafıza oyununu sınıfla interaktif oynayın.',
      'Öğrencilere gördüklerini kâğıda anında çizdirme (Görsel Dikte) yaptırın.',
    ],
    baseDifficultyModifier: +5,
  },
  numerical: {
    misconceptions: [
      'Sayı piramitlerinde ve işlem makinelerinde kuralları ters yönde işletirken işlem hatası yapma.',
      'Şekil denklemlerinde sembolün katı ile üssünü birbirine karıştırma.',
    ],
    recommendedPedagogies: [
      'İşlem makinelerini kutu simülasyonu olarak tahtada canlandırma.',
      'Şekil denkleminde sembolün yerine doğrudan değerini yazarak sadeleştirme.',
    ],
    actionSteps: [
      '10 soruluk sayı piramidi ve terazi denklem çalışma kâğıdı uygulayın.',
      'Matematiksel mantık adımlarını arkadaşına açıklama tekniğini uygulayın.',
    ],
    baseDifficultyModifier: -6,
  },
  verbal: {
    misconceptions: [
      'Kavramlar arasındaki hiyerarşik (tür-cins) ilişki ile işlevsel ilişkiyi birbirine karıştırma.',
      'Sözcük analojilerinde yön sırasını ters algılama (A:B ilişkisi ile B:A ilişkisini karıştırma).',
    ],
    recommendedPedagogies: [
      'İlişki köprüsü kurma tekniği (Örnek: "Göz görür ise Kulak duyar").',
      'Kavram haritaları ve anlam ağları üzerinden zıtlık, eş anlam ve parça-bütün ilişkisi analizi.',
    ],
    actionSteps: [
      'Sözel analoji cümle tamamlama egzersizleri uygulayın.',
      'Kelime şifreleme ve anagram bulmacaları ile sözcük dağarcığını pekiştirin.',
    ],
    baseDifficultyModifier: +2,
  },
  coding: {
    misconceptions: [
      'Karakterin yönü değiştikçe "kendi solum" ile "karakterin solu" arasındaki göreli yön karmaşası.',
      'Döngü (tekrar) komutlarında kaç adım atılacağını sayarken başlangıç karesini de sayma hatası.',
    ],
    recommendedPedagogies: [
      'Sınıf zemininde labirent oluşturup öğrencilerin birbirini komutlarla yönlendirmesi (Somut Kodlama).',
      'Robotik yön kartları ile göreli yön (karakterin bakış açısı) adaptasyon çalışmaları.',
    ],
    actionSteps: [
      'Labirent ve rota kodlama çalışma kağıdı dağıtın.',
      'Akıllı tahtada blok kodlama ile yön bulma yarışması yapın.',
    ],
    baseDifficultyModifier: -5,
  },
};

// Heatmap Color & Tier Helper
export function getUrgencyTier(accuracy: number): ReTeachingUrgency {
  if (accuracy < 55) return 'critical';
  if (accuracy < 70) return 'warning';
  if (accuracy < 85) return 'proficient';
  return 'mastery';
}

export function getHeatmapColorClasses(urgency: ReTeachingUrgency): {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  label: string;
  darkBg: string;
} {
  switch (urgency) {
    case 'critical':
      return {
        bg: 'bg-rose-500/20 hover:bg-rose-500/30',
        border: 'border-rose-500/50',
        text: 'text-rose-400',
        badgeBg: 'bg-rose-500/20',
        badgeText: 'text-rose-300',
        label: 'Kritik Telafi Gerekli',
        darkBg: 'bg-gradient-to-br from-rose-950/70 to-slate-900',
      };
    case 'warning':
      return {
        bg: 'bg-amber-500/20 hover:bg-amber-500/30',
        border: 'border-amber-500/50',
        text: 'text-amber-400',
        badgeBg: 'bg-amber-500/20',
        badgeText: 'text-amber-300',
        label: 'Pekiştirme Önerilir',
        darkBg: 'bg-gradient-to-br from-amber-950/60 to-slate-900',
      };
    case 'proficient':
      return {
        bg: 'bg-indigo-500/20 hover:bg-indigo-500/30',
        border: 'border-indigo-500/40',
        text: 'text-indigo-300',
        badgeBg: 'bg-indigo-500/20',
        badgeText: 'text-indigo-300',
        label: 'Yetkin / Hedefe Uygun',
        darkBg: 'bg-gradient-to-br from-indigo-950/60 to-slate-900',
      };
    case 'mastery':
      return {
        bg: 'bg-emerald-500/20 hover:bg-emerald-500/30',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/20',
        badgeText: 'text-emerald-300',
        label: 'Üstün / Pekiştirilmiş',
        darkBg: 'bg-gradient-to-br from-emerald-950/60 to-slate-900',
      };
  }
}

class TeacherAnalyticsService {
  private cache: Map<string, ClassPerformanceReport> = new Map();

  getClasses(): ClassRoomInfo[] {
    return INITIAL_CLASSES;
  }

  getClassById(classId: string): ClassRoomInfo {
    return INITIAL_CLASSES.find((c) => c.id === classId) || INITIAL_CLASSES[0];
  }

  /**
   * Generates or retrieves realistic classroom performance data
   * and blends real user mastery data seamlessly!
   */
  getClassReport(classId: string, timeframe: TimeframeOption = '30days'): ClassPerformanceReport {
    const cacheKey = `${classId}_${timeframe}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const classInfo = this.getClassById(classId);
    const currentUser = dataService.getCurrentUser();
    const userMasteries = dataService.getSkillMasteries();
    const studentNames = STUDENT_NAMES_BY_GRADE[classInfo.grade] || STUDENT_NAMES_BY_GRADE[3];

    // Seed students
    const students: ClassStudentData[] = [];

    // 1. Current user as active student (if grade matches or default in 3-A)
    const isCurrentUserInThisClass = (classInfo.grade === (currentUser.grade || 3));
    if (isCurrentUserInThisClass) {
      const userCategoryScores: Record<CognitiveCategory, any> = {} as any;
      ALL_COGNITIVE_CATEGORIES.forEach((cat) => {
        const found = userMasteries.find((m) => m.category === cat);
        const masteryVal = found ? found.mastery : 75;
        userCategoryScores[cat] = {
          accuracy: masteryVal,
          attempts: found ? found.attemptCount || 12 : 12,
          avgTimeSeconds: Math.round(18 + Math.random() * 14),
          trend: found ? found.recentTrend : 'up',
        };
      });

      const totalAccuracy = Math.round(
        Object.values(userCategoryScores).reduce((acc: number, cur: any) => acc + cur.accuracy, 0) /
        ALL_COGNITIVE_CATEGORIES.length
      );

      students.push({
        id: currentUser.id,
        name: `${currentUser.name || 'Deniz Kaya'} (Ben)`,
        avatar: currentUser.avatar || '🦊',
        grade: classInfo.grade,
        overallAccuracy: totalAccuracy,
        questionsSolved: currentUser.totalQuestionsSolved || 38,
        isCurrentUser: true,
        categoryScores: userCategoryScores,
      });
    }

    // 2. Generate peers with consistent pseudo-realistic variances
    studentNames.slice(0, classInfo.studentCount - (isCurrentUserInThisClass ? 1 : 0)).forEach((st, idx) => {
      // Seeded base ability for this student
      const studentBaseAbility = 62 + ((idx * 17) % 32); // 62% to 94%

      const catScores: Record<CognitiveCategory, any> = {} as any;
      ALL_COGNITIVE_CATEGORIES.forEach((cat) => {
        const catPedagogy = CATEGORY_PEDAGOGY_DATA[cat];
        const categoryModifier = catPedagogy?.baseDifficultyModifier || 0;
        
        // Timeframe slight drift
        const timeframeModifier = timeframe === '7days' ? -2 : timeframe === '30days' ? 0 : 3;

        // Specific intentional weakness patterns to ensure real collective re-teaching needs exist!
        let specificClassDrop = 0;
        if (classInfo.id === 'class-3a') {
          if (cat === 'spatial') specificClassDrop = -28; // 3-A struggles heavily in spatial!
          if (cat === 'matrix') specificClassDrop = -18;  // 3-A needs re-teaching in matrix
        } else if (classInfo.id === 'class-2b') {
          if (cat === 'pattern') specificClassDrop = -24; // 2-B struggles in pattern
          if (cat === 'logic') specificClassDrop = -20;
        } else if (classInfo.id === 'class-1a') {
          if (cat === 'attention') specificClassDrop = -22;
          if (cat === 'visual_perception') specificClassDrop = -16;
        } else if (classInfo.id === 'class-4c') {
          if (cat === 'numerical') specificClassDrop = -22;
          if (cat === 'coding') specificClassDrop = -19;
        }

        const score = Math.max(
          28,
          Math.min(99, Math.round(studentBaseAbility + categoryModifier + specificClassDrop + timeframeModifier + ((idx * 7 + cat.length) % 15) - 7))
        );

        catScores[cat] = {
          accuracy: score,
          attempts: 10 + ((idx * 3 + cat.length) % 25),
          avgTimeSeconds: Math.round(22 - (score / 10) + ((idx * 2) % 8)),
          trend: score >= 75 ? 'up' : score >= 55 ? 'neutral' : 'down',
        };
      });

      const overall = Math.round(
        Object.values(catScores).reduce((acc: number, cur: any) => acc + cur.accuracy, 0) /
        ALL_COGNITIVE_CATEGORIES.length
      );

      students.push({
        id: `peer-${classInfo.id}-${idx}`,
        name: st.name,
        avatar: st.avatar,
        grade: classInfo.grade,
        overallAccuracy: overall,
        questionsSolved: 24 + ((idx * 11) % 80),
        isCurrentUser: false,
        categoryScores: catScores,
      });
    });

    // 3. Compute Category Summaries for the Whole Class
    const categorySummaries: Record<CognitiveCategory, CategoryHeatmapSummary> = {} as any;
    let totalAttemptsAll = 0;
    let totalCorrectAll = 0;
    let totalTimeSum = 0;

    ALL_COGNITIVE_CATEGORIES.forEach((cat) => {
      let catTotalScore = 0;
      let catAttempts = 0;
      let catTime = 0;
      const strugglingList: { name: string; avatar: string; score: number }[] = [];
      let proficientCount = 0;

      students.forEach((st) => {
        const studentCat = st.categoryScores[cat];
        catTotalScore += studentCat.accuracy;
        catAttempts += studentCat.attempts;
        catTime += studentCat.avgTimeSeconds;

        if (studentCat.accuracy < 60) {
          strugglingList.push({
            name: st.name,
            avatar: st.avatar,
            score: studentCat.accuracy,
          });
        } else if (studentCat.accuracy >= 75) {
          proficientCount++;
        }
      });

      const avgAccuracy = Math.round(catTotalScore / students.length);
      const avgTime = Math.round(catTime / students.length);
      const urgency = getUrgencyTier(avgAccuracy);
      const ped = CATEGORY_PEDAGOGY_DATA[cat];

      totalAttemptsAll += catAttempts;
      totalCorrectAll += Math.round((catAttempts * avgAccuracy) / 100);
      totalTimeSum += avgTime;

      categorySummaries[cat] = {
        category: cat,
        categoryLabel: COGNITIVE_CATEGORY_LABELS[cat] || cat,
        accuracy: avgAccuracy,
        errorDensity: 100 - avgAccuracy,
        avgTimeSeconds: avgTime,
        totalAttempts: catAttempts,
        urgency,
        strugglingStudentsCount: strugglingList.length,
        proficientStudentsCount: proficientCount,
        strugglingStudents: strugglingList.sort((a, b) => a.score - b.score),
        primaryMisconception: ped?.misconceptions[0] || 'Bu alanda kavram yanılgıları gözlemleniyor.',
        recommendedPedagogy: ped?.recommendedPedagogies[0] || 'Somut materyaller ve adım adım rehberli çalışma önerilir.',
        recommendedActionSteps: ped?.actionSteps || [
          'Sınıfa 15 soruluk pekiştirme çalışma yaprağı dağıtın.',
          'Konuyu akıllı tahtada modelleyerek birlikte çözün.',
        ],
        suggestedQuestionsCountForReteach: urgency === 'critical' ? 20 : urgency === 'warning' ? 12 : 8,
      };
    });

    // Sort strengths and weaknesses
    const sortedCategories = ALL_COGNITIVE_CATEGORIES.map((cat) => ({
      category: cat,
      score: categorySummaries[cat].accuracy,
    })).sort((a, b) => a.score - b.score);

    const topWeaknesses = sortedCategories.slice(0, 3);
    const topStrengths = [...sortedCategories].reverse().slice(0, 3);

    const reTeachingNeededCount = Object.values(categorySummaries).filter(
      (c) => c.urgency === 'critical' || c.urgency === 'warning'
    ).length;

    const overallClassAccuracy = Math.round(
      Object.values(categorySummaries).reduce((acc, c) => acc + c.accuracy, 0) /
      ALL_COGNITIVE_CATEGORIES.length
    );

    const report: ClassPerformanceReport = {
      classInfo,
      timeframe,
      overallClassAccuracy,
      totalQuestionsSolved: Math.round(totalAttemptsAll * 0.85),
      totalAttempts: totalAttemptsAll,
      averageSpeedSeconds: Math.round(totalTimeSum / ALL_COGNITIVE_CATEGORIES.length),
      reTeachingNeededCount,
      topStrengths,
      topWeaknesses,
      categorySummaries,
      students,
    };

    this.cache.set(cacheKey, report);
    return report;
  }

  /**
   * Clears cache and regenerates simulated fresh assessment
   */
  refreshClassData(classId: string): ClassPerformanceReport {
    this.cache.clear();
    return this.getClassReport(classId);
  }

  /**
   * Multi-Class comparison matrix for all classes
   */
  getAllClassesComparison(metric: MetricType = 'accuracy') {
    const classes = this.getClasses();
    const rows = classes.map((c) => {
      const report = this.getClassReport(c.id);
      const catValues: Record<CognitiveCategory, number> = {} as any;
      ALL_COGNITIVE_CATEGORIES.forEach((cat) => {
        const sum = report.categorySummaries[cat];
        if (metric === 'accuracy') catValues[cat] = sum.accuracy;
        else if (metric === 'error_density') catValues[cat] = sum.errorDensity;
        else if (metric === 'speed') catValues[cat] = sum.avgTimeSeconds;
        else catValues[cat] = sum.totalAttempts;
      });
      return {
        classInfo: c,
        overallAccuracy: report.overallClassAccuracy,
        reTeachingCount: report.reTeachingNeededCount,
        categoryScores: catValues,
      };
    });

    return rows;
  }
}

export const teacherAnalyticsService = new TeacherAnalyticsService();
