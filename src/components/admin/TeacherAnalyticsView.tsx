import React, { useState, useMemo } from 'react';
import {
  CognitiveCategory,
  COGNITIVE_CATEGORY_LABELS,
  ALL_COGNITIVE_CATEGORIES,
  QuestionType,
  DifficultyLevel,
} from '../../types';
import {
  teacherAnalyticsService,
  ClassRoomInfo,
  ClassPerformanceReport,
  CategoryHeatmapSummary,
  ClassStudentData,
  TimeframeOption,
  MetricType,
  ReTeachingUrgency,
  getHeatmapColorClasses,
  getUrgencyTier,
} from '../../services/teacher-analytics-service';
import { sound } from '../../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Users,
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Flame,
  Printer,
  Download,
  RefreshCw,
  Zap,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  Layers,
  Grid,
  Compass,
  Eye,
  Target,
  FileText,
  Copy,
  Check,
  X,
  Lightbulb,
  ShieldAlert,
  SlidersHorizontal,
  Info,
  Award,
} from 'lucide-react';

interface TeacherAnalyticsViewProps {
  onInspectInStudio?: (type: QuestionType, seed: number, diff: DifficultyLevel) => void;
  onNavigateToBulkGenerator?: () => void;
}

const CATEGORY_ICONS: Record<CognitiveCategory, React.ReactNode> = {
  visual_perception: <Eye className="w-4 h-4" />,
  pattern: <Layers className="w-4 h-4" />,
  matrix: <Grid className="w-4 h-4" />,
  spatial: <Compass className="w-4 h-4" />,
  logic: <Brain className="w-4 h-4" />,
  attention: <Target className="w-4 h-4" />,
  memory: <Zap className="w-4 h-4" />,
  numerical: <Sparkles className="w-4 h-4" />,
  verbal: <BookOpen className="w-4 h-4" />,
  coding: <SlidersHorizontal className="w-4 h-4" />,
};

// Default mapping from category to representative QuestionType for studio preview
const CATEGORY_DEFAULT_QUESTION_TYPE: Record<CognitiveCategory, QuestionType> = {
  spatial: 'figure_rotation',
  matrix: 'matrix_2x2',
  pattern: 'visual_sequence',
  logic: 'logical_sequence',
  attention: 'visual_attention',
  visual_perception: 'figure_completion',
  memory: 'visual_memory',
  numerical: 'number_pattern',
  verbal: 'verbal_analogy',
  coding: 'maze_path',
};

export const TeacherAnalyticsView: React.FC<TeacherAnalyticsViewProps> = ({
  onInspectInStudio,
  onNavigateToBulkGenerator,
}) => {
  // State
  const [selectedClassId, setSelectedClassId] = useState<string>('class-3a');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30days');
  const [viewMode, setViewMode] = useState<'class_heatmap' | 'all_classes' | 'student_drilldown'>('class_heatmap');
  const [metric, setMetric] = useState<MetricType>('accuracy');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc'); // asc to see struggling students first
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<CategoryHeatmapSummary | null>(null);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedPlanCat, setCopiedPlanCat] = useState<string | null>(null);

  const classes = useMemo(() => teacherAnalyticsService.getClasses(), []);
  const currentClassInfo = useMemo(() => teacherAnalyticsService.getClassById(selectedClassId), [selectedClassId]);

  // Active Class Performance Report
  const classReport = useMemo(() => {
    return teacherAnalyticsService.getClassReport(selectedClassId, timeframe);
  }, [selectedClassId, timeframe, isRefreshing]);

  // All Classes Comparison Matrix
  const allClassesMatrix = useMemo(() => {
    return teacherAnalyticsService.getAllClassesComparison(metric);
  }, [metric, isRefreshing]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleRefresh = () => {
    sound.playClick();
    setIsRefreshing(true);
    setTimeout(() => {
      teacherAnalyticsService.refreshClassData(selectedClassId);
      setIsRefreshing(false);
      showToast('Sınıf bilişsel verileri ve değerlendirme skorları güncellendi.');
    }, 600);
  };

  const handleCopyLessonPlan = (category: CategoryHeatmapSummary) => {
    sound.playClick();
    const planText = `BİLSEM KOLEKTİF YENİDEN ÖĞRETİM DERS PLANI
Sınıf: ${currentClassInfo.name} (${currentClassInfo.grade}. Sınıf)
Kategori: ${category.categoryLabel}
Sınıf Başarı Ortalaması: %${category.accuracy} (Hedef Eşik: %${currentClassInfo.targetBenchmarkAccuracy})
Durum: ${category.urgency.toUpperCase()}
--------------------------------------------------
1. KAVRAM YANILGISI TESPİTİ:
${category.primaryMisconception}

2. ÖNERİLEN PEDAGOJİK YÖNTEM:
${category.recommendedPedagogy}

3. UYGULAMA ADIMLARI:
${category.recommendedActionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

4. DESTEK GEREKEN ÖĞRENCİLER (${category.strugglingStudentsCount} Kişi):
${category.strugglingStudents.map((s) => `- ${s.name} (%${s.score})`).join('\n')}

5. ÖNERİLEN TELAFİ SORU HACMİ: ${category.suggestedQuestionsCountForReteach} Soru`;

    navigator.clipboard.writeText(planText);
    setCopiedPlanCat(category.category);
    showToast('Pedagojik ders planı panoya kopyalandı.');
    setTimeout(() => setCopiedPlanCat(null), 2500);
  };

  // Filtered and sorted students
  const filteredStudents = useMemo(() => {
    return classReport.students
      .filter((st) => st.name.toLowerCase().includes(studentSearch.toLowerCase()))
      .sort((a, b) => {
        return studentSortOrder === 'asc'
          ? a.overallAccuracy - b.overallAccuracy
          : b.overallAccuracy - a.overallAccuracy;
      });
  }, [classReport.students, studentSearch, studentSortOrder]);

  // Categories sorted by urgency (critical first)
  const prioritizedCategories: CategoryHeatmapSummary[] = useMemo(() => {
    return (Object.values(classReport.categorySummaries) as CategoryHeatmapSummary[]).sort(
      (a, b) => a.accuracy - b.accuracy
    );
  }, [classReport.categorySummaries]);

  const criticalCategories = useMemo(() => {
    return prioritizedCategories.filter((c) => c.urgency === 'critical');
  }, [prioritizedCategories]);

  const warningCategories = useMemo(() => {
    return prioritizedCategories.filter((c) => c.urgency === 'warning');
  }, [prioritizedCategories]);

  const masteredCategories = useMemo(() => {
    return prioritizedCategories.filter((c) => c.urgency === 'proficient' || c.urgency === 'mastery');
  }, [prioritizedCategories]);

  return (
    <div className="space-y-8 font-sans">

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 bg-indigo-600 text-white font-medium text-xs rounded-2xl shadow-xl border border-indigo-400/40 flex items-center gap-2.5 backdrop-blur-md"
          >
            <Check className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header Section */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5 shadow-xs">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                Öğretmen Analitiği & Bilişsel Isı Haritası
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {currentClassInfo.name} • {currentClassInfo.studentCount} Öğrenci • {currentClassInfo.teacherName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit',sans-serif] mt-2 tracking-tight">
              Sınıf Bilişsel Performans Isı Haritası & Toplu Yeniden Öğretim
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Sınıfınızın 8 temel BİLSEM zeka alanındaki başarı ve hata yoğunluğu ısı haritasını inceleyin. Kritik pedagojik boşlukları tespit ederek hangi konuların tüm sınıfa yeniden anlatılması (toplu telafi) gerektiğini anında keşfedin.
            </p>
          </div>

          {/* Quick Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              title="Verileri Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setShowPrintReportModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Telafi Raporu Yazdır</span>
            </button>

            {onNavigateToBulkGenerator && (
              <button
                onClick={() => {
                  sound.playClick();
                  onNavigateToBulkGenerator();
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Toplu Soru Motoru</span>
              </button>
            )}
          </div>
        </div>

        {/* Classroom Switcher Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" /> Sınıf Seçimi:
            </span>
            {classes.map((cls) => {
              const isSelected = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  onClick={() => {
                    sound.playClick();
                    setSelectedClassId(cls.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <span>{cls.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {cls.grade}. Snf
                  </span>
                </button>
              );
            })}
          </div>

          {/* Timeframe Filter */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: '7days', label: 'Son 7 Gün' },
                { id: '30days', label: 'Son 30 Gün' },
                { id: 'all', label: 'Tüm Dönem' },
              ] as const
            ).map((tf) => (
              <button
                key={tf.id}
                onClick={() => {
                  sound.playClick();
                  setTimeframe(tf.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Re-Teaching Diagnostic Alert (If any critical category exists) */}
      {criticalCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/40 border border-rose-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                  Acil Pedagojik Müdahale Uyarısı
                </span>
                <span className="text-xs text-rose-400 font-bold">
                  {criticalCategories.length} Bilişsel Alanda Başarı %55 Altında!
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {currentClassInfo.name} genelinde <strong className="text-rose-300">{criticalCategories.map(c => c.categoryLabel).join(', ')}</strong> konularında sınıf ortalaması kritik eşiğin altına düşmüştür. Bireysel etüt yerine <strong>tüm sınıfa kolektif yeniden öğretim</strong> yapılması önerilir.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <button
              onClick={() => {
                sound.playClick();
                setSelectedCategoryModal(criticalCategories[0]);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-600/30 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Telafi Reçetesini Aç</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Toplu Tekrar Gerektiren Konu Sayısı */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Yeniden Öğretim İhtiyacı</span>
            <div className={`p-2 rounded-xl ${
              criticalCategories.length > 0
                ? 'bg-rose-500/20 text-rose-400'
                : warningCategories.length > 0
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-['Outfit',sans-serif] ${
                criticalCategories.length > 0 ? 'text-rose-400' : warningCategories.length > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {criticalCategories.length + warningCategories.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ 10 Kategori</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {criticalCategories.length} Acil Müdahale • {warningCategories.length} Pekiştirme
            </p>
          </div>
        </div>

        {/* Card 2: Genel Sınıf Başarı Ortalaması */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Sınıf Başarı Ortalaması</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-['Outfit',sans-serif]">
                %{classReport.overallClassAccuracy}
              </span>
              <span className={`text-xs font-bold ${
                classReport.overallClassAccuracy >= currentClassInfo.targetBenchmarkAccuracy
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {classReport.overallClassAccuracy >= currentClassInfo.targetBenchmarkAccuracy ? '+' : ''}
                {classReport.overallClassAccuracy - currentClassInfo.targetBenchmarkAccuracy}% Eşik
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  classReport.overallClassAccuracy >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, classReport.overallClassAccuracy)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Hedef Eşik: %{currentClassInfo.targetBenchmarkAccuracy} (MEB BİLSEM)
            </p>
          </div>
        </div>

        {/* Card 3: En Güçlü Bilişsel Alan */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">En Güçlü Alan</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-['Outfit',sans-serif]">
                %{classReport.topStrengths[0]?.score || 0}
              </span>
              <span className="text-xs font-bold text-emerald-300">Pekiştirilmiş</span>
            </div>
            <p className="text-xs font-bold text-slate-200 mt-1 truncate">
              {COGNITIVE_CATEGORY_LABELS[classReport.topStrengths[0]?.category]}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Sınıfın %85+ üstün yetkinliği var</p>
          </div>
        </div>

        {/* Card 4: En Zayıf / Kritik Alan */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">En Düşük / Kritik Alan</span>
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400 font-['Outfit',sans-serif]">
                %{classReport.topWeaknesses[0]?.score || 0}
              </span>
              <span className="text-xs font-bold text-rose-300">Telafi Şart</span>
            </div>
            <p className="text-xs font-bold text-slate-200 mt-1 truncate">
              {COGNITIVE_CATEGORY_LABELS[classReport.topWeaknesses[0]?.category]}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {classReport.categorySummaries[classReport.topWeaknesses[0]?.category]?.strugglingStudentsCount} öğrenci destek bekliyor
            </p>
          </div>
        </div>
      </div>

      {/* Main Heatmap Section */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-6">
        
        {/* Heatmap Controls Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2.5">
              <Grid className="w-5 h-5 text-indigo-400" />
              Bilişsel Kategori Performans Isı Matrisi
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hücrelere tıklayarak pedagojik kavram yanılgılarını ve öğrenci dökümünü inceleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => {
                  sound.playClick();
                  setViewMode('class_heatmap');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'class_heatmap'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kategori Özeti
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setViewMode('student_drilldown');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'student_drilldown'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Öğrenci Dökümü</span>
                <span className="text-[10px] px-1 py-0.2 bg-indigo-500/30 text-indigo-200 rounded-md">
                  {classReport.students.length}
                </span>
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setViewMode('all_classes');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'all_classes'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tüm Şubeler Karşılaştırma
              </button>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-500 pl-2 font-medium">Metrik:</span>
              {(
                [
                  { id: 'accuracy', label: 'Başarı %' },
                  { id: 'error_density', label: 'Hata %' },
                  { id: 'speed', label: 'Süre (sn)' },
                  { id: 'volume', label: 'Soru Adedi' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    sound.playClick();
                    setMetric(m.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    metric === m.id
                      ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-slate-500" />
            <span className="font-semibold">Isı Skalası Renk Rehberi:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-rose-500/30 border border-rose-500/60" />
              <span className="text-slate-300 font-medium">Kritik (&lt; %55) - Kolektif Telafi Gerekli</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-500/30 border border-amber-500/60" />
              <span className="text-slate-300 font-medium">Pekiştirme (%55 - %69)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-indigo-500/30 border border-indigo-500/60" />
              <span className="text-slate-300 font-medium">Yetkin (%70 - %84)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/30 border border-emerald-500/60" />
              <span className="text-slate-300 font-medium">Üstün Başarı (%85+)</span>
            </div>
          </div>
        </div>

        {/* VIEW MODE 1: CLASS HEATMAP SUMMARY (CARDS & COMPACT MATRIX) */}
        {viewMode === 'class_heatmap' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {ALL_COGNITIVE_CATEGORIES.map((cat) => {
              const summary = classReport.categorySummaries[cat];
              if (!summary) return null;
              const style = getHeatmapColorClasses(summary.urgency);

              return (
                <motion.div
                  key={cat}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    sound.playClick();
                    setSelectedCategoryModal(summary);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${style.darkBg} ${style.border} shadow-md`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${style.badgeBg} ${style.text}`}>
                        {CATEGORY_ICONS[cat]}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white leading-tight">
                          {COGNITIVE_CATEGORY_LABELS[cat]}
                        </h4>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {summary.totalAttempts} Soru Girişimi
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-black font-['Outfit',sans-serif] ${style.text}`}>
                          {metric === 'accuracy'
                            ? `%${summary.accuracy}`
                            : metric === 'error_density'
                            ? `%${summary.errorDensity}`
                            : metric === 'speed'
                            ? `${summary.avgTimeSeconds}s`
                            : summary.totalAttempts}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badgeBg} ${style.badgeText} border border-current/20`}>
                        {style.label}
                      </span>
                    </div>

                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2.5">
                      <div
                        className={`h-full rounded-full ${
                          summary.urgency === 'critical'
                            ? 'bg-rose-500'
                            : summary.urgency === 'warning'
                            ? 'bg-amber-500'
                            : summary.urgency === 'proficient'
                            ? 'bg-indigo-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, summary.accuracy)}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Destek Gereken: <strong className={summary.strugglingStudentsCount > 0 ? 'text-rose-400' : 'text-slate-300'}>{summary.strugglingStudentsCount} Kişi</strong></span>
                      <span className="text-indigo-400 flex items-center gap-0.5 hover:underline">
                        İncele <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* VIEW MODE 2: STUDENT DRILLDOWN MATRIX */}
        {viewMode === 'student_drilldown' && (
          <div className="space-y-4">
            {/* Search and Sort controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Öğrenci adı ile ara..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Sıralama:</span>
                <button
                  onClick={() => {
                    sound.playClick();
                    setStudentSortOrder(studentSortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {studentSortOrder === 'asc' ? 'En Çok Zorlananlar Önce' : 'En Başarılılar Önce'}
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 sticky left-0 bg-slate-900 z-10 w-44">Öğrenci Adı</th>
                    <th className="p-3 text-center">Genel Ort.</th>
                    {ALL_COGNITIVE_CATEGORIES.map((cat) => (
                      <th key={cat} className="p-3 text-center min-w-[90px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-slate-400">{CATEGORY_ICONS[cat]}</span>
                          <span className="truncate max-w-[80px]" title={COGNITIVE_CATEGORY_LABELS[cat]}>
                            {COGNITIVE_CATEGORY_LABELS[cat].split(' ')[0]}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="p-3 sticky left-0 bg-slate-950/95 z-10 font-bold text-white flex items-center gap-2">
                        <span className="text-base">{st.avatar}</span>
                        <div className="truncate">
                          <span className="truncate block">{st.name}</span>
                          {st.isCurrentUser && (
                            <span className="text-[9px] px-1 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono">
                              Aktif Kullanıcı
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center font-black">
                        <span className={`px-2 py-1 rounded-lg ${
                          st.overallAccuracy >= 75
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : st.overallAccuracy >= 60
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          %{st.overallAccuracy}
                        </span>
                      </td>
                      {ALL_COGNITIVE_CATEGORIES.map((cat) => {
                        const scoreData = st.categoryScores[cat];
                        const urgency = getUrgencyTier(scoreData.accuracy);
                        const style = getHeatmapColorClasses(urgency);

                        return (
                          <td key={cat} className="p-2 text-center">
                            <div
                              onClick={() => {
                                sound.playClick();
                                const summary = classReport.categorySummaries[cat];
                                if (summary) setSelectedCategoryModal(summary);
                              }}
                              className={`py-1.5 px-2 rounded-xl font-black text-center cursor-pointer transition-transform hover:scale-105 border ${style.bg} ${style.border} ${style.text}`}
                              title={`${st.name} • ${COGNITIVE_CATEGORY_LABELS[cat]}: %${scoreData.accuracy} (${scoreData.attempts} Soru)`}
                            >
                              %{scoreData.accuracy}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW MODE 3: ALL CLASSES COMPARISON MATRIX */}
        {viewMode === 'all_classes' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 sticky left-0 bg-slate-900 z-10 w-48">Şube / Sınıf</th>
                  <th className="p-3 text-center">Genel Başarı</th>
                  <th className="p-3 text-center">Telafi Konuları</th>
                  {ALL_COGNITIVE_CATEGORIES.map((cat) => (
                    <th key={cat} className="p-3 text-center min-w-[95px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-slate-400">{CATEGORY_ICONS[cat]}</span>
                        <span className="truncate max-w-[85px]" title={COGNITIVE_CATEGORY_LABELS[cat]}>
                          {COGNITIVE_CATEGORY_LABELS[cat].split(' ')[0]}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {allClassesMatrix.map((row) => (
                  <tr
                    key={row.classInfo.id}
                    className={`hover:bg-slate-850/40 transition-colors ${
                      row.classInfo.id === selectedClassId ? 'bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="p-3 sticky left-0 bg-slate-950/95 z-10 font-bold text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block">{row.classInfo.name}</span>
                          <span className="text-[10px] text-slate-500">{row.classInfo.teacherName}</span>
                        </div>
                        {row.classInfo.id === selectedClassId && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">
                            Seçili
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-black">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold">
                        %{row.overallAccuracy}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        row.reTeachingCount > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {row.reTeachingCount} Konu
                      </span>
                    </td>
                    {ALL_COGNITIVE_CATEGORIES.map((cat) => {
                      const val = row.categoryScores[cat];
                      const urgency = getUrgencyTier(val);
                      const style = getHeatmapColorClasses(urgency);

                      return (
                        <td key={cat} className="p-2 text-center">
                          <div
                            onClick={() => {
                              sound.playClick();
                              setSelectedClassId(row.classInfo.id);
                              setViewMode('class_heatmap');
                            }}
                            className={`py-2 px-2.5 rounded-xl font-black text-center cursor-pointer transition-transform hover:scale-105 border ${style.bg} ${style.border} ${style.text}`}
                            title={`${row.classInfo.name} • ${COGNITIVE_CATEGORY_LABELS[cat]}: %${val}`}
                          >
                            %{val}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* COLLECTIVE RE-TEACHING PEDAGOGICAL HUB */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white font-['Outfit',sans-serif] flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-amber-400" />
              Kolektif Yeniden Öğretim (Re-Teaching) & Telafi Eylem Planları
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              BİLSEM müfredatı ve CHC zeka modeline uygun olarak sınıfın kavram yanılgılarını giderecek hazır ders reçeteleri.
            </p>
          </div>
        </div>

        {/* Priority 1: Critical Intervention Cards */}
        {criticalCategories.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>1. Öncelik: Acil Kolektif Telafi Gerektiren Alanlar ({criticalCategories.length})</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {criticalCategories.map((catSummary) => (
                <div
                  key={catSummary.category}
                  className="p-6 rounded-3xl bg-gradient-to-br from-rose-950/50 via-slate-900 to-slate-900 border border-rose-500/40 shadow-xl space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        {CATEGORY_ICONS[catSummary.category]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">
                            {catSummary.categoryLabel}
                          </h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            %{catSummary.accuracy} Başarı
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Sınıftaki {catSummary.strugglingStudentsCount} öğrenci kritik seviyede desteğe muhtaç.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Misconception Diagnostic Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-500/20 space-y-1.5">
                    <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      Tespit Edilen Sınıf Kavram Yanılgısı:
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      "{catSummary.primaryMisconception}"
                    </p>
                  </div>

                  {/* Recommended Pedagogy & Steps */}
                  <div className="space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      Önerilen Pedagojik Eylem Planı:
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {catSummary.recommendedPedagogy}
                    </p>
                    <ul className="space-y-1.5 mt-2">
                      {catSummary.recommendedActionSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Struggling Students Avatars */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Öncelikli Öğrenciler:</span>
                      <div className="flex items-center -space-x-1.5">
                        {catSummary.strugglingStudents.slice(0, 5).map((st, i) => (
                          <div
                            key={i}
                            title={`${st.name} (%${st.score})`}
                            className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs shadow-sm cursor-help"
                          >
                            {st.avatar}
                          </div>
                        ))}
                      </div>
                      {catSummary.strugglingStudents.length > 5 && (
                        <span className="text-[10px] text-slate-500 font-bold ml-1">
                          +{catSummary.strugglingStudents.length - 5}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLessonPlan(catSummary)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                        title="Ders Planını Kopyala"
                      >
                        {copiedPlanCat === catSummary.category ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Planı Kopyala</span>
                          </>
                        )}
                      </button>

                      {onInspectInStudio && (
                        <button
                          onClick={() => {
                            sound.playClick();
                            const targetType = CATEGORY_DEFAULT_QUESTION_TYPE[catSummary.category];
                            onInspectInStudio(targetType, 101, 3);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Stüdyo Sorusunu Gör</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Harika! Acil Müdahale Gerektiren Kritik Alan Yok</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentClassInfo.name} genelinde tüm kategoriler %55 başarı eşiğinin üzerindedir. Aşağıdaki pekiştirme önerilerini takip edebilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Priority 2: Warning / Reinforcement Cards */}
        {warningCategories.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>2. Öncelik: Pekiştirme & Güçlendirme Önerilen Alanlar ({warningCategories.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warningCategories.map((catSummary) => (
                <div
                  key={catSummary.category}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {CATEGORY_ICONS[catSummary.category]}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{catSummary.categoryLabel}</h4>
                        <span className="text-[11px] font-bold text-amber-400">%{catSummary.accuracy} Başarı</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {catSummary.primaryMisconception}
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {catSummary.strugglingStudentsCount} Öğrenci Destek Bekliyor
                    </span>
                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedCategoryModal(catSummary);
                      }}
                      className="text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Reçeteyi Aç</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* DETAIL MODAL FOR A CATEGORY */}
      <AnimatePresence>
        {selectedCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setSelectedCategoryModal(null);
                }}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-2xl ${getHeatmapColorClasses(selectedCategoryModal.urgency).badgeBg} ${getHeatmapColorClasses(selectedCategoryModal.urgency).text} border border-current/30`}>
                  {CATEGORY_ICONS[selectedCategoryModal.category]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${getHeatmapColorClasses(selectedCategoryModal.urgency).badgeBg} ${getHeatmapColorClasses(selectedCategoryModal.urgency).badgeText} border border-current/20`}>
                      {getHeatmapColorClasses(selectedCategoryModal.urgency).label}
                    </span>
                    <span className="text-xs text-slate-400">{currentClassInfo.name}</span>
                  </div>
                  <h2 className="text-xl font-black text-white mt-1">
                    {selectedCategoryModal.categoryLabel}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sınıf Başarı Ortalaması: <strong className="text-white">%{selectedCategoryModal.accuracy}</strong> • Ortalama Süre: <strong className="text-white">{selectedCategoryModal.avgTimeSeconds} saniye</strong>
                  </p>
                </div>
              </div>

              {/* Misconception Diagnostic */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Sınıfta Gözlemlenen Temel Kavram Yanılgısı:
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  {selectedCategoryModal.primaryMisconception}
                </p>
              </div>

              {/* Pedagogy Plan */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Önerilen Pedagojik Reçete & Sınıf İçi Uygulama:
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
                  {selectedCategoryModal.recommendedPedagogy}
                </p>
                <div className="space-y-2">
                  {selectedCategoryModal.recommendedActionSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Struggling Students Roster */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Öncelikli Bireysel Takip Listesi ({selectedCategoryModal.strugglingStudents.length} Öğrenci)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Başarı &lt; %60</span>
                </h3>
                {selectedCategoryModal.strugglingStudents.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {selectedCategoryModal.strugglingStudents.map((st, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{st.avatar}</span>
                          <span className="text-xs font-bold text-slate-200 truncate max-w-[90px]">{st.name}</span>
                        </div>
                        <span className="text-xs font-black text-rose-400">%{st.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Bu kategoride kritik seviyede zorlanan öğrenci bulunmuyor.</p>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => handleCopyLessonPlan(selectedCategoryModal)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Ders Planını Kopyala</span>
                </button>

                {onInspectInStudio && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      const targetType = CATEGORY_DEFAULT_QUESTION_TYPE[selectedCategoryModal.category];
                      onInspectInStudio(targetType, 101, 3);
                      setSelectedCategoryModal(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Soru Stüdyosunda İncele</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT REPORT MODAL */}
      <AnimatePresence>
        {showPrintReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto relative print:p-0 print:shadow-none"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowPrintReportModal(false);
                }}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer print:hidden"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Formal Report Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-indigo-700">
                    ZEKAPARK EĞİTİM YÖNETİM SİSTEMİ • BİLSEM MÜFREDATI
                  </div>
                  <h1 className="text-2xl font-black text-slate-950 mt-1">
                    Öğretmen Sınıf Bilişsel Gelişim & Kolektif Telafi Raporu
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} • Şube: {currentClassInfo.name} ({currentClassInfo.grade}. Sınıf)
                  </p>
                </div>
                <div className="text-right text-xs text-slate-700 font-bold">
                  <div>Öğretmen: {currentClassInfo.teacherName}</div>
                  <div>Mevcut: {currentClassInfo.studentCount} Öğrenci</div>
                </div>
              </div>

              {/* Executive Summary in Report */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-600 font-bold block">Sınıf Başarı Ortalaması</span>
                  <span className="text-2xl font-black text-slate-900">%{classReport.overallClassAccuracy}</span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[11px] text-rose-700 font-bold block">Kritik Telafi Konuları</span>
                  <span className="text-2xl font-black text-rose-800">{criticalCategories.length} Alan</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] text-emerald-700 font-bold block">Pekiştirilmiş Alanlar</span>
                  <span className="text-2xl font-black text-emerald-800">{masteredCategories.length} Alan</span>
                </div>
              </div>

              {/* Formal Category Breakdown Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Bilişsel Alanlar Başarı ve Eylem Tablosu:
                </h3>
                <table className="w-full text-xs text-left border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-2 border border-slate-300">Bilişsel Alan</th>
                      <th className="p-2 text-center border border-slate-300">Başarı %</th>
                      <th className="p-2 border border-slate-300">Durum</th>
                      <th className="p-2 border border-slate-300">Önerilen Pedagojik Eylem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {prioritizedCategories.map((c) => (
                      <tr key={c.category} className={c.urgency === 'critical' ? 'bg-rose-50/70 font-semibold' : ''}>
                        <td className="p-2 border border-slate-300">{c.categoryLabel}</td>
                        <td className="p-2 text-center border border-slate-300">%{c.accuracy}</td>
                        <td className="p-2 border border-slate-300">
                          {c.urgency === 'critical' ? 'Kritik Telafi' : c.urgency === 'warning' ? 'Pekiştirme' : 'Yetkin'}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-600 text-[11px]">
                          {c.recommendedPedagogy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons in Print Modal */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 print:hidden">
                <button
                  onClick={() => {
                    sound.playClick();
                    window.print();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazıcıya Gönder / PDF Olarak Kaydet</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
