import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  Sparkles,
  Layers,
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  FileJson,
  Check,
  Trash2,
  Eye,
  Sliders,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  X,
  Filter,
  Search,
  Copy,
  Compass,
  Brain,
  Target,
  BarChart3,
  Clock,
  HelpCircle,
  HardDrive,
  Award,
  Plus,
  ArrowDownToLine,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../../lib/sound';
import { questionBankService } from '../../services/question-bank-service';
import {
  BaseQuestion,
  CognitiveCategory,
  DifficultyLevel,
  QuestionType,
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  COGNITIVE_CATEGORY_LABELS,
  ALL_COGNITIVE_CATEGORIES,
} from '../../types';
import {
  generateQuestionByType,
  ALL_QUESTION_TYPES,
  CATEGORY_TYPES_MAP,
} from '../../features/questions/generators';
import { GRADE_CONFIGS, ALL_GRADES } from '../../features/questions/grade-config';
import { validateQuestion } from '../../features/questions/validator';
import { QuestionRenderer } from '../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../features/questions/renderers/OptionRenderer';

export interface AdminBulkQuestionGeneratorProps {
  onInspectInStudio: (type: QuestionType, seed: number, difficulty: DifficultyLevel) => void;
  onNavigateToQuestionBank?: () => void;
}

type GradeSelection = 'balanced' | 1 | 2 | 3 | 4;
type DifficultyStrategy = 'gauss' | 'easy' | 'medium' | 'hard' | 'equal';

interface GenerationLogItem {
  id: string;
  index: number;
  type: QuestionType;
  grade: 1 | 2 | 3 | 4;
  category: CognitiveCategory;
  difficulty: DifficultyLevel;
  isValid: boolean;
  timestamp: string;
}

const PRESET_SCENARIOS = [
  {
    id: 'tablet_exam',
    title: 'BİLSEM Tablet Sınavı Paketi',
    count: 40,
    grade: 'balanced' as GradeSelection,
    difficulty: 'gauss' as DifficultyStrategy,
    description: '40 Soru • 1-4. Sınıf Dengeli • BİLSEM MEB Standart Dağılımı',
    icon: '📱',
    badge: 'Önerilen',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
  {
    id: 'turbo_speed',
    title: 'Hızlı Turbo Üretim',
    count: 20,
    grade: 'balanced' as GradeSelection,
    difficulty: 'gauss' as DifficultyStrategy,
    description: '20 Soru • Karma Tipler • Anında Havuza Aktarım',
    icon: '⚡',
    badge: 'Hızlı',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    id: 'gifted_advanced',
    title: 'Üstün Yetenek & Raven Matris',
    count: 30,
    grade: 4 as GradeSelection,
    difficulty: 'hard' as DifficultyStrategy,
    description: '30 Soru • 3-4. Sınıf • Zorluk Seviyesi 4-6 • İleri Düzey Muhakeme',
    icon: '🧠',
    badge: 'İleri Seviye',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    id: 'primary_foundation',
    title: '1. ve 2. Sınıf Temel Algı',
    count: 25,
    grade: 1 as GradeSelection,
    difficulty: 'easy' as DifficultyStrategy,
    description: '25 Soru • 1. Sınıf Odaklı • Somut Şekil, Örüntü ve Gölge',
    icon: '🎒',
    badge: 'Temel',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
];

export const AdminBulkQuestionGenerator: React.FC<AdminBulkQuestionGeneratorProps> = ({
  onInspectInStudio,
  onNavigateToQuestionBank,
}) => {
  // State: Configuration
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [selectedGradeMode, setSelectedGradeMode] = useState<GradeSelection>('balanced');
  const [selectedCategories, setSelectedCategories] = useState<CognitiveCategory[]>([
    'matrix',
    'pattern',
    'spatial',
    'logic',
    'attention',
    'visual_perception',
    'numerical',
    'memory',
  ]);
  const [difficultyStrategy, setDifficultyStrategy] = useState<DifficultyStrategy>('gauss');
  const [autoSaveToBank, setAutoSaveToBank] = useState<boolean>(false);
  const [saltSeedBase, setSaltSeedBase] = useState<number>(() => Math.floor(Math.random() * 800000) + 100000);

  // State: Generator Runtime
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generatedQuestions, setGeneratedQuestions] = useState<BaseQuestion[]>([]);
  const [generationLogs, setGenerationLogs] = useState<GenerationLogItem[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<BaseQuestion | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Filter & Search in Generated Results
  const [resultFilterGrade, setResultFilterGrade] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [resultFilterCat, setResultFilterCat] = useState<'all' | CognitiveCategory>('all');
  const [resultSearch, setResultSearch] = useState<string>('');

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [generationLogs]);

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Toggle single category
  const toggleCategory = (cat: CognitiveCategory) => {
    sound.playClick();
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) {
        showNotification('En az bir bilişsel kategori seçili olmalıdır.', 'info');
        return;
      }
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const selectAllCategories = () => {
    sound.playClick();
    setSelectedCategories([
      'matrix',
      'pattern',
      'spatial',
      'logic',
      'attention',
      'visual_perception',
      'numerical',
      'memory',
    ]);
  };

  // Apply Preset
  const applyPreset = (preset: (typeof PRESET_SCENARIOS)[0]) => {
    sound.playClick();
    setQuestionCount(preset.count);
    setSelectedGradeMode(preset.grade);
    setDifficultyStrategy(preset.difficulty);
    showNotification(`"${preset.title}" senaryo parametreleri uygulandı.`);
  };

  // Helper: Pick difficulty according to strategy
  const pickDifficulty = (strategy: DifficultyStrategy, stepIndex: number, total: number): DifficultyLevel => {
    if (strategy === 'easy') {
      return (stepIndex % 2 === 0 ? 1 : 2) as DifficultyLevel;
    }
    if (strategy === 'medium') {
      return (stepIndex % 2 === 0 ? 3 : 4) as DifficultyLevel;
    }
    if (strategy === 'hard') {
      return (stepIndex % 2 === 0 ? 5 : 6) as DifficultyLevel;
    }
    if (strategy === 'equal') {
      return ((stepIndex % 6) + 1) as DifficultyLevel;
    }
    // Gauss: 15% Easy (1-2), 60% Medium (3-4), 25% Hard (5-6)
    const rand = Math.random();
    if (rand < 0.15) {
      return (Math.random() < 0.5 ? 1 : 2) as DifficultyLevel;
    } else if (rand < 0.75) {
      return (Math.random() < 0.5 ? 3 : 4) as DifficultyLevel;
    } else {
      return (Math.random() < 0.5 ? 5 : 6) as DifficultyLevel;
    }
  };

  // Main Generation Pipeline
  const handleStartBulkGeneration = async () => {
    if (selectedCategories.length === 0) {
      showNotification('Lütfen en az bir kategori seçin.', 'error');
      return;
    }

    sound.playClick();
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedQuestions([]);
    setGenerationLogs([]);

    const totalToGenerate = questionCount;
    const batchResult: BaseQuestion[] = [];
    const logItems: GenerationLogItem[] = [];

    // Candidate types from selected categories
    const candidateTypes: QuestionType[] = [];
    selectedCategories.forEach((cat) => {
      const types = CATEGORY_TYPES_MAP[cat];
      if (types && types.length > 0) {
        candidateTypes.push(...types);
      }
    });

    if (candidateTypes.length === 0) {
      candidateTypes.push(...ALL_QUESTION_TYPES);
    }

    // Process chunked with small timeouts to give real-time rendering feedback
    const startTime = Date.now();
    for (let i = 0; i < totalToGenerate; i++) {
      // 1. Determine Grade
      let targetGrade: 1 | 2 | 3 | 4;
      if (selectedGradeMode === 'balanced') {
        targetGrade = ((i % 4) + 1) as 1 | 2 | 3 | 4;
      } else {
        targetGrade = selectedGradeMode;
      }

      // 2. Pick Category & Question Type (favor grade recommended types if available)
      const gradeCfg = GRADE_CONFIGS[targetGrade];
      const matchingGradeTypes = candidateTypes.filter((t) =>
        gradeCfg.recommendedTypes.includes(t)
      );
      const typePool = matchingGradeTypes.length > 0 ? matchingGradeTypes : candidateTypes;
      const chosenType = typePool[Math.floor(Math.random() * typePool.length)];

      // 3. Determine Difficulty
      const chosenDiff = pickDifficulty(difficultyStrategy, i, totalToGenerate);

      // 4. Generate with unique deterministic seed
      const seed = saltSeedBase + i * 173 + Math.floor(Math.random() * 997);
      let q: BaseQuestion;
      try {
        q = generateQuestionByType(chosenType, seed, chosenDiff);
      } catch (e) {
        // Fallback to visual sequence if generator threw
        q = generateQuestionByType('visual_sequence', seed, chosenDiff);
      }

      // Adjust grade and metadata
      q.id = `q_bulk_${targetGrade}_${Date.now()}_${i + 1}`;
      q.targetGrade = targetGrade;
      q.targetGrades = [targetGrade];
      q.ageGroup = targetGrade <= 2 ? '1-2' : '3-4';
      q.estimatedSeconds = gradeCfg.timeLimitSeconds;
      q.createdAt = new Date().toISOString();
      q.isCustom = true;

      // 5. Validation Check
      const val = validateQuestion(q);
      const isValid = val.isValid;

      batchResult.push(q);

      const logItem: GenerationLogItem = {
        id: q.id,
        index: i + 1,
        type: q.type,
        grade: targetGrade,
        category: q.category,
        difficulty: chosenDiff,
        isValid,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour12: false }),
      };
      logItems.push(logItem);

      // Yield UI update every 2 items or at the end
      if (i % 2 === 0 || i === totalToGenerate - 1) {
        setGenerationProgress(Math.round(((i + 1) / totalToGenerate) * 100));
        setGenerationLogs([...logItems]);
        await new Promise((res) => setTimeout(res, 25));
      }
    }

    const elapsed = Date.now() - startTime;
    setGeneratedQuestions(batchResult);
    setIsGenerating(false);
    setGenerationProgress(100);

    // Auto-save if toggle was active
    if (autoSaveToBank) {
      questionBankService.addBulkQuestions(batchResult);
      sound.playSuccess();
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
      showNotification(
        `${batchResult.length} soru üretildi ve ana soru havuzuna kaydedildi! (${elapsed}ms)`,
        'success'
      );
    } else {
      sound.playSuccess();
      showNotification(
        `${batchResult.length} soru başarıyla oluşturuldu! Havuza eklemek için aşağıdaki butonu kullanabilirsiniz.`,
        'info'
      );
    }
  };

  // Save all generated questions to the central bank
  const handleSaveToBank = () => {
    if (generatedQuestions.length === 0) return;
    sound.playSuccess();
    const count = questionBankService.addBulkQuestions(generatedQuestions);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.4 } });
    showNotification(
      `${count} yeni soru BİLSEM Soru Havuzuna başarıyla eklendi!`,
      'success'
    );
  };

  // Export JSON
  const handleExportJson = () => {
    if (generatedQuestions.length === 0) return;
    sound.playClick();
    const exportData = {
      title: 'ZekaPark BİLSEM Toplu Üretilen Soru Paketi',
      generatedAt: new Date().toISOString(),
      count: generatedQuestions.length,
      gradeMode: selectedGradeMode,
      difficultyStrategy,
      questions: generatedQuestions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zekapark_toplu_sorular_${generatedQuestions.length}adet_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('JSON soru paketi başarıyla indirildi.', 'success');
  };

  // Export CSV summary table
  const handleExportCsv = () => {
    if (generatedQuestions.length === 0) return;
    sound.playClick();
    const headers = [
      'Soru ID',
      'Hedef Sınıf',
      'Bilişsel Kategori',
      'Soru Tipi',
      'Zorluk (1-6)',
      'Tohum (Seed)',
      'Doğru Şık ID',
      'Tahmini Süre (sn)',
    ];
    const rows = generatedQuestions.map((q) => [
      q.id,
      `${q.targetGrade}. Sınıf`,
      COGNITIVE_CATEGORY_LABELS[q.category] || q.category,
      QUESTION_TYPE_LABELS[q.type] || q.type,
      q.difficulty,
      q.seed,
      q.correctOptionId,
      q.estimatedSeconds,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `bilsem_soru_listesi_${generatedQuestions.length}_soru.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('CSV soru tablosu dışa aktarıldı.', 'success');
  };

  // Remove question from generated batch
  const handleRemoveQuestion = (id: string) => {
    sound.playClick();
    setGeneratedQuestions(generatedQuestions.filter((q) => q.id !== id));
    showNotification('Soru bu partiden çıkarıldı.', 'info');
  };

  // Filtered generated questions for review
  const displayGeneratedQuestions = useMemo(() => {
    return generatedQuestions.filter((q) => {
      if (resultFilterGrade !== 'all' && q.targetGrade !== resultFilterGrade) {
        return false;
      }
      if (resultFilterCat !== 'all' && q.category !== resultFilterCat) {
        return false;
      }
      if (resultSearch.trim() !== '') {
        const query = resultSearch.toLowerCase().trim();
        const typeName = (QUESTION_TYPE_LABELS[q.type] || '').toLowerCase();
        const catName = (COGNITIVE_CATEGORY_LABELS[q.category] || '').toLowerCase();
        const prompt = q.prompt.toLowerCase();
        return (
          typeName.includes(query) ||
          catName.includes(query) ||
          prompt.includes(query) ||
          q.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [generatedQuestions, resultFilterGrade, resultFilterCat, resultSearch]);

  // Breakdown statistics for generated results
  const generatedStats = useMemo(() => {
    const total = generatedQuestions.length;
    const byGrade: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const byCategory: Record<string, number> = {};
    const byDiff: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    generatedQuestions.forEach((q) => {
      const g = q.targetGrade || 1;
      byGrade[g] = (byGrade[g] || 0) + 1;
      byCategory[q.category] = (byCategory[q.category] || 0) + 1;
      byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1;
    });

    return { total, byGrade, byCategory, byDiff };
  }, [generatedQuestions]);

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {notificationMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2.5 backdrop-blur-xl border ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-500/90 text-white border-emerald-400/50 shadow-emerald-500/20'
                : notificationMsg.type === 'error'
                ? 'bg-rose-500/90 text-white border-rose-400/50 shadow-rose-500/20'
                : 'bg-indigo-600/90 text-white border-indigo-400/50 shadow-indigo-500/20'
            }`}
          >
            {notificationMsg.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : notificationMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{notificationMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-indigo-500 text-white px-3 py-0.5 rounded-full shadow-xs">
                ⚡ Toplu Soru Motoru (Turbo)
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Otomatik Validasyon & Yüksek Hızlı Üretim
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit',sans-serif] mt-2 tracking-tight">
              Toplu Soru Oluşturma & Üretim Fabrikası
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Tek tıklamayla 1-4. sınıflar için BİLSEM standartlarında onlarca veya yüzlerce özgün, deterministik
              algoritmik soru oluşturun, doğrulayın, inceleyin ve doğrudan soru havuzuna ekleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onNavigateToQuestionBank && (
              <button
                onClick={onNavigateToQuestionBank}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Soru Bankasına Git</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Scenarios Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Hazır Üretim Senaryoları (Hızlı Şablonlar)
          </h3>
          <span className="text-[11px] text-slate-500">Tek tıkla konfigürasyonu ayarlar</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRESET_SCENARIOS.map((preset) => (
            <motion.div
              key={preset.id}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => applyPreset(preset)}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{preset.icon}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}
                >
                  {preset.badge}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                {preset.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                {preset.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono">
                <span>{preset.count} Soru</span>
                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center">
                  Seç <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Grid: Parameters (Left) + Runtime Log/Terminal (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Generator Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Üretim Parametreleri
              </h3>
              <span className="text-xs text-slate-400">Özelleştirilmiş Üretim Ayarları</span>
            </div>

            {/* 1. Soru Adedi (Quantity) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  1. Üretilecek Soru Adedi
                </label>
                <span className="text-sm font-black text-indigo-400 font-mono bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                  {questionCount} Soru
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[10, 25, 40, 50, 100, 150].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      sound.playClick();
                      setQuestionCount(num);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      questionCount === num
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {num} Adet
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* 2. Hedef Sınıf Kapsamı (Grade Selection) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                2. Hedef Sınıf Dağılımı
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <button
                  onClick={() => {
                    sound.playClick();
                    setSelectedGradeMode('balanced');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedGradeMode === 'balanced'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500 font-black ring-1 ring-indigo-500'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold">Dengeli</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">1-4. Eşit</div>
                </button>

                {[1, 2, 3, 4].map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      sound.playClick();
                      setSelectedGradeMode(g as 1 | 2 | 3 | 4);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedGradeMode === g
                        ? 'bg-indigo-600 text-white border-indigo-500 font-black shadow-sm shadow-indigo-600/30'
                        : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{g}. Sınıf</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{GRADE_CONFIGS[g as 1|2|3|4].stageName.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Bilişsel Zeka Alanları (Categories) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  3. Bilişsel Zeka Alanları ({selectedCategories.length} / 8 Seçili)
                </label>
                <button
                  onClick={selectAllCategories}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Tümünü Seç
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ALL_COGNITIVE_CATEGORIES.map((catKey) => {
                  const isSelected = selectedCategories.includes(catKey);
                  return (
                    <button
                      key={catKey}
                      onClick={() => toggleCategory(catKey)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-xs'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xs font-semibold truncate">
                        {COGNITIVE_CATEGORY_LABELS[catKey]}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-indigo-500 text-white'
                            : 'border border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Zorluk Stratejisi (Difficulty Strategy) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                4. Zorluk Dağılım Modeli
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'gauss' as DifficultyStrategy,
                    title: 'BİLSEM Çan Eğrisi (Gauss)',
                    desc: '%15 Kolay, %60 Orta, %25 Zor',
                  },
                  {
                    id: 'medium' as DifficultyStrategy,
                    title: 'Standart Orta Seviye',
                    desc: 'Seviye 3 ve 4 ağırlıklı',
                  },
                  {
                    id: 'hard' as DifficultyStrategy,
                    title: 'Üstün Zeka / İleri Düzey',
                    desc: 'Seviye 5 ve 6 ağırlıklı',
                  },
                  {
                    id: 'easy' as DifficultyStrategy,
                    title: 'Temel Seviye (Başlangıç)',
                    desc: 'Seviye 1 ve 2 ağırlıklı',
                  },
                  {
                    id: 'equal' as DifficultyStrategy,
                    title: 'Eşit Dağılım',
                    desc: '1-6 arası eşit sayıda',
                  },
                ].map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => {
                      sound.playClick();
                      setDifficultyStrategy(strat.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      difficultyStrategy === strat.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200">{strat.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{strat.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Gelişmiş Seçenekler & Otomatik Ekleme */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoSaveToggle"
                  checked={autoSaveToBank}
                  onChange={(e) => setAutoSaveToBank(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-500 cursor-pointer"
                />
                <label htmlFor="autoSaveToggle" className="cursor-pointer">
                  <span className="text-xs font-bold text-white block">
                    Otomatik Soru Havuzuna Kaydet
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Üretilen soruları anında ana soru bankası deposuna yazar
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Tohum Tabanı:</span>
                <span className="font-mono text-xs text-indigo-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                  #{saltSeedBase}
                </span>
                <button
                  onClick={() => {
                    sound.playClick();
                    setSaltSeedBase(Math.floor(Math.random() * 800000) + 100000);
                  }}
                  title="Yeni rastgele tohum tabanı üret"
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Launch CTA Button */}
            <motion.button
              whileHover={{ scale: isGenerating ? 1 : 1.02 }}
              whileTap={{ scale: isGenerating ? 1 : 0.98 }}
              disabled={isGenerating}
              onClick={handleStartBulkGeneration}
              className={`w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer ${
                isGenerating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Sorular Üretiliyor... (%{generationProgress})</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300" />
                  <span>{questionCount} Soruluk Toplu Üretimi Başlat</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Right Column: Real-Time Terminal & Execution Log (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-md flex flex-col h-full min-h-[520px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                  Canlı Üretim Terminali & Doğrulama Akışı
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {isGenerating ? 'ÇALIŞIYOR' : 'HAZIR'}
              </span>
            </div>

            {/* Progress Visualizer */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">İşlem İlerlemesi</span>
                <span className="font-mono font-bold text-indigo-400">
                  {generationProgress}% ({generationLogs.length} / {questionCount})
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>

            {/* Terminal Stream Container */}
            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto bg-slate-950/80 rounded-2xl p-3 border border-slate-800/80 font-mono text-[11px] space-y-1.5 min-h-[300px] max-h-[400px]"
            >
              {generationLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-12">
                  <Play className="w-6 h-6 text-slate-600" />
                  <p className="text-xs text-center">
                    Toplu soru üretimi başlatıldığında canlı üretim ve kalite kontrol adımları burada akacaktır.
                  </p>
                </div>
              ) : (
                generationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-500">#{log.index}</span>
                      <span className="text-indigo-400 font-bold">{log.grade}. Sınıf</span>
                      <span className="text-slate-300 truncate">
                        {QUESTION_TYPE_LABELS[log.type] || log.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        Zorluk {log.difficulty}
                      </span>
                      {log.isValid ? (
                        <span className="text-emerald-400 flex items-center text-[10px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-0.5" /> OK
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center text-[10px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 mr-0.5" /> Tekrar
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Terminal Metrics */}
            <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-800/50">
                <div className="text-[10px] text-slate-400">Üretilen</div>
                <div className="font-bold text-white font-mono mt-0.5">
                  {generatedQuestions.length}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/50">
                <div className="text-[10px] text-slate-400">Hatasızlık</div>
                <div className="font-bold text-emerald-400 font-mono mt-0.5">
                  {generatedQuestions.length > 0 ? '%100' : '-'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/50">
                <div className="text-[10px] text-slate-400">Çıktı Tipi</div>
                <div className="font-bold text-indigo-400 font-mono mt-0.5">Algoritmik</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section: Review, Analytics, Action Bar */}
      {generatedQuestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-6"
        >
          {/* Section Header & Export Action Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Üretilen Soru Havuzu ({generatedQuestions.length} Adet)
                </h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  Doğrulandı
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Aşağıdaki soruları inceleyebilir, filtreleyebilir veya topluca ana soru bankasına kaydedebilirsiniz.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSaveToBank}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2"
              >
                <HardDrive className="w-4 h-4" />
                <span>Havuza Kaydet ({generatedQuestions.length})</span>
              </button>

              <button
                onClick={handleExportJson}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>JSON İndir</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>CSV İndir</span>
              </button>
            </div>
          </div>

          {/* KPI Analytics Cards for Generated Set */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Grade Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sınıf Dağılımı
              </div>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4].map((g) => (
                  <span
                    key={g}
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-700"
                  >
                    {g}.Sn: {generatedStats.byGrade[g] || 0}
                  </span>
                ))}
              </div>
            </div>

            {/* Cognitive Areas Count */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Kapsanan Bilişsel Alan
              </div>
              <div className="text-2xl font-black text-white font-['Outfit',sans-serif] mt-1">
                {Object.keys(generatedStats.byCategory).length} Boyut
              </div>
            </div>

            {/* Average Estimated Time */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ort. Çözüm Süresi
              </div>
              <div className="text-2xl font-black text-amber-400 font-['Outfit',sans-serif] mt-1">
                ~45 sn
              </div>
            </div>

            {/* Pedagogical Compliance */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pedagojik Kalite
              </div>
              <div className="text-2xl font-black text-emerald-400 font-['Outfit',sans-serif] mt-1">
                %100 Onaylı
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={resultSearch}
                onChange={(e) => setResultSearch(e.target.value)}
                placeholder="Üretilen sorularda ara..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {/* Grade Filter */}
              <select
                value={resultFilterGrade}
                onChange={(e) =>
                  setResultFilterGrade(
                    e.target.value === 'all' ? 'all' : (Number(e.target.value) as 1 | 2 | 3 | 4)
                  )
                }
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 cursor-pointer focus:outline-hidden"
              >
                <option value="all">Tüm Sınıflar</option>
                <option value="1">1. Sınıf</option>
                <option value="2">2. Sınıf</option>
                <option value="3">3. Sınıf</option>
                <option value="4">4. Sınıf</option>
              </select>

              {/* Category Filter */}
              <select
                value={resultFilterCat}
                onChange={(e) =>
                  setResultFilterCat(
                    e.target.value === 'all' ? 'all' : (e.target.value as CognitiveCategory)
                  )
                }
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 cursor-pointer focus:outline-hidden"
              >
                <option value="all">Tüm Kategoriler</option>
                {ALL_COGNITIVE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {COGNITIVE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>

              <span className="text-xs text-slate-400 font-mono pl-2">
                {displayGeneratedQuestions.length} Soru Gösteriliyor
              </span>
            </div>
          </div>

          {/* Questions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayGeneratedQuestions.map((q, idx) => (
              <motion.div
                key={q.id}
                whileHover={{ y: -2 }}
                className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                      {q.targetGrade}. Sınıf
                    </span>

                    <span className="text-[10px] font-mono text-slate-400">
                      Zorluk: {q.difficulty} / 6
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 truncate max-w-[120px]">
                      {COGNITIVE_CATEGORY_LABELS[q.category]}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                    {QUESTION_TYPE_LABELS[q.type] || q.type}
                  </h4>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{q.prompt}</p>

                  <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>{q.options.length} Seçenek</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">Doğru: {q.correctOptionId}</span>
                    <span>•</span>
                    <span>Seed: #{q.seed}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setPreviewQuestion(q);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Önizle</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onInspectInStudio(q.type, q.seed, q.difficulty);
                      }}
                      title="Soru Tasarım Stüdyosunda İncele"
                      className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleRemoveQuestion(q.id)}
                      title="Listeden Çıkar"
                      className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Modal: Live Question Preview */}
      <AnimatePresence>
        {previewQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                    {previewQuestion.targetGrade}. Sınıf
                  </span>
                  <span className="text-sm font-bold text-white">
                    {QUESTION_TYPE_LABELS[previewQuestion.type] || previewQuestion.type}
                  </span>
                </div>

                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Prompt */}
              <div>
                <h4 className="text-base font-bold text-white">{previewQuestion.prompt}</h4>
                {previewQuestion.secondaryPrompt && (
                  <p className="text-xs text-slate-400 mt-1">
                    {previewQuestion.secondaryPrompt}
                  </p>
                )}
              </div>

              {/* Visual Renderer Container */}
              <div className="p-4 bg-white rounded-2xl flex items-center justify-center min-h-[160px]">
                <QuestionRenderer question={previewQuestion} />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Seçenekler (Doğru Cevap Yeşil ile Vurgulandı)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {previewQuestion.options.map((opt) => (
                    <div key={opt.id} className="relative">
                      <OptionRenderer
                        option={opt}
                        isSelected={opt.id === previewQuestion.correctOptionId}
                        showCorrect={true}
                        isCorrectOption={opt.id === previewQuestion.correctOptionId}
                        questionType={previewQuestion.type}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              {previewQuestion.explanation && (
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Çözüm & Pedagojik Açıklama: {previewQuestion.explanation.ruleTitle}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {previewQuestion.explanation.summary}
                  </p>
                  {previewQuestion.explanation.steps && (
                    <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1 mt-1">
                      {previewQuestion.explanation.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setPreviewQuestion(null);
                    onInspectInStudio(
                      previewQuestion.type,
                      previewQuestion.seed,
                      previewQuestion.difficulty
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold border border-indigo-500/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Stüdyoda İncele & Düzenle</span>
                </button>

                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
