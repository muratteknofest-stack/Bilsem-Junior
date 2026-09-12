import React, { useState, useMemo } from 'react';
import {
  CognitiveCategory,
  DifficultyLevel,
  BaseQuestion,
  COGNITIVE_CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from '../../types';
import {
  questionAnalyticsService,
  AnalyticsFilter,
  ChallengingQuestionRecord,
  CategorySuccessMetric,
  DifficultySuccessMetric,
  CrossMatrixCell,
} from '../../services/question-analytics-service';
import { GRADE_CONFIGS } from '../../features/questions/grade-config';
import { AdminStudentPracticeSimulatorModal } from './AdminStudentPracticeSimulatorModal';
import { sound } from '../../lib/sound';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Download,
  Brain,
  Grid,
  Layers,
  Compass,
  Zap,
  Target,
  Eye,
  Lightbulb,
  Sparkles,
  Info,
} from 'lucide-react';

interface AdminQuestionAnalyticsDashboardProps {
  onNavigateToQuestionManager?: () => void;
}

const CATEGORY_ICONS: Record<CognitiveCategory, React.ReactNode> = {
  visual_perception: <Eye className="w-4 h-4" />,
  pattern: <Layers className="w-4 h-4" />,
  matrix: <Grid className="w-4 h-4" />,
  spatial: <Compass className="w-4 h-4" />,
  logic: <Brain className="w-4 h-4" />,
  attention: <Target className="w-4 h-4" />,
  memory: <Zap className="w-4 h-4" />,
  numerical: <BarChart3 className="w-4 h-4" />,
  verbal: <Brain className="w-4 h-4" />,
  coding: <Brain className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<CognitiveCategory, { bg: string; text: string; border: string }> = {
  visual_perception: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  pattern: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  matrix: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  spatial: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  logic: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  attention: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  memory: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  numerical: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  verbal: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  coding: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

export const AdminQuestionAnalyticsDashboard: React.FC<AdminQuestionAnalyticsDashboardProps> = ({
  onNavigateToQuestionManager,
}) => {
  // Filters
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | 4 | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CognitiveCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [successRateFilter, setSuccessRateFilter] = useState<'all' | 'very_easy' | 'very_hard'>('all');

  // Active question for Student Practice Simulator
  const [activeSimulatorQuestion, setActiveSimulatorQuestion] = useState<BaseQuestion | null>(null);

  // Expanded explanations for cards
  const [expandedExplanationIds, setExpandedExplanationIds] = useState<Set<string>>(new Set());

  // Matrix cell selection
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{
    category: CognitiveCategory;
    difficulty: DifficultyLevel;
  } | null>(null);

  // Success message for actions
  const [actionNotification, setActionNotification] = useState<string | null>(null);

  // Compute analytics
  const analytics = useMemo(() => {
    const filter: AnalyticsFilter = {
      grade: selectedGrade,
      category: selectedCategory,
      difficulty: selectedDifficulty,
      timeRange,
      searchQuery,
      successRateFilter,
    };
    return questionAnalyticsService.getAnalytics(filter);
  }, [selectedGrade, selectedCategory, selectedDifficulty, timeRange, searchQuery, successRateFilter]);

  const toggleExplanation = (questionId: string) => {
    sound.playClick();
    setExpandedExplanationIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSelectMatrixCell = (cell: CrossMatrixCell) => {
    sound.playClick();
    if (
      selectedMatrixCell?.category === cell.category &&
      selectedMatrixCell?.difficulty === cell.difficulty
    ) {
      // Toggle off
      setSelectedMatrixCell(null);
      setSelectedCategory('all');
      setSelectedDifficulty('all');
    } else {
      setSelectedMatrixCell({ category: cell.category, difficulty: cell.difficulty });
      setSelectedCategory(cell.category);
      setSelectedDifficulty(cell.difficulty);
    }
  };

  const handleResetFilters = () => {
    sound.playClick();
    setSelectedGrade('all');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setTimeRange('all');
    setSearchQuery('');
    setSuccessRateFilter('all');
    setSelectedMatrixCell(null);
  };

  const handleExportJson = () => {
    sound.playClick();
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(analytics, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `bilsem_soru_analiz_raporu_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setActionNotification('Analiz raporu JSON formatında dışa aktarıldı.');
    setTimeout(() => setActionNotification(null), 3000);
  };

  // Helper for heatmap colors
  const getHeatmapColor = (status: CrossMatrixCell['status'], successRate: number) => {
    if (status === 'critical') {
      return 'bg-rose-500 text-white font-black hover:bg-rose-600 border-rose-600';
    }
    if (status === 'challenging') {
      return 'bg-amber-400 text-slate-900 font-bold hover:bg-amber-500 border-amber-500';
    }
    if (status === 'moderate') {
      return 'bg-lime-200 text-slate-900 font-bold hover:bg-lime-300 border-lime-400';
    }
    return 'bg-emerald-500 text-white font-bold hover:bg-emerald-600 border-emerald-600';
  };

  return (
    <div className="space-y-7">
      {/* Action Notification Toast */}
      {actionNotification && (
        <div className="p-4 rounded-xl bg-purple-900 text-white text-sm font-bold flex items-center justify-between  animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{actionNotification}</span>
          </div>
          <button
            onClick={() => setActionNotification(null)}
            className="text-white/80 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-xl p-6 sm:p-8  relative overflow-hidden border border-purple-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-bold">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>BİLSEM Soru Başarı & Bilişsel Direnç Teşhisi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Soru Analiz Dashboard'u
            </h2>
            <p className="text-sm text-purple-200 leading-relaxed">
              Her soru kategorisi ve zorluk derecesi için öğrenci başarı oranlarını, çeldirici
              yanılma desenlerini ve süre aşımı yaşanan zorlayıcı soruları anlık olarak tespit edin.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportJson}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer "
            >
              <Download className="w-4 h-4" />
              <span>Raporu Dışa Aktar (JSON)</span>
            </button>

            {onNavigateToQuestionManager && (
              <button
                onClick={() => {
                  sound.playClick();
                  onNavigateToQuestionManager();
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer "
              >
                <Layers className="w-4 h-4" />
                <span>Soru Havuzuna Git</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Overall Success Rate */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200  flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Ortalama Başarı
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              %{analytics.overall.overallSuccessRate}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
              <span>Hedef BİLSEM Normu: %72</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full"
              style={{ width: `${analytics.overall.overallSuccessRate}%` }}
            />
          </div>
        </div>

        {/* Most Challenging Category */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200  flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              En Zorlayıcı Kategori
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 truncate" title={analytics.overall.hardestCategory.name}>
              {analytics.overall.hardestCategory.name}
            </div>
            <div className="text-xs font-bold text-rose-600 mt-0.5">
              %{analytics.overall.hardestCategory.rate} Başarı Oranı
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Öğrenciler en çok bu alanda hata yapıyor
          </span>
        </div>

        {/* Critical Questions Alert (<%60 Success) */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200  flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Kritik Zor Soru
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">
              {analytics.overall.challengingCount}{' '}
              <span className="text-xs font-bold text-slate-400">/ {analytics.overall.totalQuestions} Soru</span>
            </div>
            <div className="text-[11px] font-bold text-slate-600 mt-1">
              Başarı &lt; %65 seviyesinde
            </div>
          </div>
          <span className="text-[10px] text-amber-700 font-bold">
            {analytics.overall.criticalCount} soru kritik sürtünmede (&lt;%50)
          </span>
        </div>

        {/* Average Solution Time */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200  flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Ortalama Süre
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {analytics.overall.avgTimeSeconds}{' '}
              <span className="text-xs font-bold text-slate-400">saniye</span>
            </div>
            <div className="text-[11px] font-bold text-blue-700 mt-1">
              Hedef Limit: 40 sn
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Öğrenci soru başına düşünme hızı
          </span>
        </div>

        {/* Total Analyzed Student Attempts */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200  flex flex-col justify-between space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Toplam Çözüm Yanıtı
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {analytics.overall.totalAttempts.toLocaleString('tr-TR')}
            </div>
            <div className="text-[11px] font-bold text-emerald-700 mt-1">
              Öğrenci yanıt verisi
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Canlı pratik + kohort sınav verileri
          </span>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200  space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Grade Level Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Sınıf:
            </span>
            <button
              onClick={() => {
                sound.playClick();
                setSelectedGrade('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedGrade === 'all'
                  ? 'bg-purple-600 text-white '
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tüm Sınıflar
            </button>
            {([1, 2, 3, 4] as const).map((g) => {
              const cfg = GRADE_CONFIGS[g];
              const isActive = selectedGrade === g;
              return (
                <button
                  key={g}
                  onClick={() => {
                    sound.playClick();
                    setSelectedGrade(g);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-600 text-white '
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.title}</span>
                </button>
              );
            })}
          </div>

          {/* Time Range & Success Rate Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={successRateFilter}
              onChange={(e) => {
                sound.playClick();
                setSuccessRateFilter(e.target.value as 'all' | 'very_easy' | 'very_hard');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border outline-none cursor-pointer ${
                successRateFilter !== 'all'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                  : 'bg-slate-50 text-slate-600 border-zinc-200 hover:bg-slate-100'
              }`}
            >
              <option value="all">Tüm Başarı Oranları</option>
              <option value="very_easy">Çok Kolay Sorular (&gt;%85)</option>
              <option value="very_hard">Çok Zor Sorular (&lt;%40)</option>
            </select>

            {(selectedGrade !== 'all' ||
              selectedCategory !== 'all' ||
              selectedDifficulty !== 'all' ||
              searchQuery ||
              successRateFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer"
                title="Tüm Filtreleri Temizle"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Temizle</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row: Search & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200">
          {/* Search by prompt / rule */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Soru metni veya kural ara..."
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 rounded-xl border border-zinc-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                sound.playClick();
                setSelectedCategory(e.target.value as any);
              }}
              className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-zinc-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">Tüm Bilişsel Kategoriler (8 Alan)</option>
              {Object.entries(COGNITIVE_CATEGORY_LABELS).map(([catKey, catLabel]) => (
                <option key={catKey} value={catKey}>
                  {catLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Dropdown */}
          <div>
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                sound.playClick();
                setSelectedDifficulty(e.target.value === 'all' ? 'all' : (Number(e.target.value) as any));
              }}
              className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-zinc-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">Tüm Zorluk Dereceleri (1-6 Seviye)</option>
              {([1, 2, 3, 4, 5, 6] as const).map((lvl) => (
                <option key={lvl} value={lvl}>
                  Seviye {lvl} - {DIFFICULTY_LABELS[lvl]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: INTERACTIVE HEATMAP (Kategori x Zorluk Çapraz Başarı Matrisi) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-black text-slate-900">
                Kategori × Zorluk Çapraz Başarı Haritası (Heatmap)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hangi kategorinin hangi zorluk seviyesinde kritik sürtünme oluşturduğunu anında görün.
              Hücreye tıklayarak o alana ait soruları filtreleyebilirsiniz.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> &gt;%80 İdeal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-lime-300 inline-block" /> %75-79 İyi
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-amber-400 inline-block" /> %65-74 Orta
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" /> &lt;%65 Kritik
            </span>
          </div>
        </div>

        {/* Heatmap Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-2.5 px-3 text-slate-500 font-extrabold uppercase tracking-wider text-[11px] w-52">
                  Bilişsel Kategori
                </th>
                {([1, 2, 3, 4, 5, 6] as const).map((diff) => (
                  <th
                    key={diff}
                    className="py-2.5 px-2 text-center text-slate-700 font-extrabold uppercase tracking-wider text-[10px] min-w-[76px]"
                  >
                    <div>Sev {diff}</div>
                    <div className="text-[9px] text-slate-400 font-normal">
                      {DIFFICULTY_LABELS[diff]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.byCategory.map((catMetric) => {
                const catInfo = CATEGORY_COLORS[catMetric.category];
                return (
                  <tr key={catMetric.category} className="hover:bg-slate-50/50 transition-colors">
                    {/* Category Label Cell */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${catInfo.bg} ${catInfo.text}`}
                        >
                          {CATEGORY_ICONS[catMetric.category]}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">
                            {catMetric.categoryName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            Ortalama: %{catMetric.successRate}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Difficulty 1 - 6 Cells */}
                    {([1, 2, 3, 4, 5, 6] as const).map((diff) => {
                      const cell = analytics.crossMatrix.find(
                        (c) => c.category === catMetric.category && c.difficulty === diff
                      );
                      const isSelected =
                        selectedMatrixCell?.category === catMetric.category &&
                        selectedMatrixCell?.difficulty === diff;

                      if (!cell) {
                        return <td key={diff} className="p-1.5 text-center text-slate-300">-</td>;
                      }

                      return (
                        <td key={diff} className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelectMatrixCell(cell)}
                            className={`w-full py-2 px-1 rounded-xl transition-all border cursor-pointer flex flex-col items-center justify-center ${getHeatmapColor(
                              cell.status,
                              cell.successRate
                            )} ${
                              isSelected
                                ? 'ring-2 ring-purple-600 scale-105 '
                                : 'hover:scale-102 '
                            }`}
                            title={`${catMetric.categoryName} - Seviye ${diff}: %${cell.successRate} Başarı (${cell.totalAttempts} deneme, ortalama ${cell.avgTimeSeconds} sn)`}
                          >
                            <span className="text-xs">%{cell.successRate}</span>
                            <span className="text-[9px] opacity-80">
                              {cell.totalAttempts > 0 ? `${cell.totalAttempts} ç` : 'Norm'}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selectedMatrixCell && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-900 font-bold">
              <Filter className="w-4 h-4 text-purple-600" />
              <span>
                Filtre Aktif: <strong>{COGNITIVE_CATEGORY_LABELS[selectedMatrixCell.category]}</strong> +{' '}
                <strong>Seviye {selectedMatrixCell.difficulty} ({DIFFICULTY_LABELS[selectedMatrixCell.difficulty]})</strong>
              </span>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                setSelectedMatrixCell(null);
                setSelectedCategory('all');
                setSelectedDifficulty('all');
              }}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
            >
              Seçimi Kaldır
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DUAL VISUAL CHARTS (Kategori & Zorluk Karşılaştırma Grafikleri) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Kategori Başarı ve Süre Karşılaştırması */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-black text-slate-900">
                Kategori Bazında Başarı Oranları
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">8 BİLSEM Alanı</span>
          </div>

          <div className="space-y-3.5">
            {analytics.byCategory.map((cat) => {
              const isChallenging = cat.successRate < 65;
              const isOptimal = cat.successRate >= 80;

              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <span className="text-slate-500">{CATEGORY_ICONS[cat.category]}</span>
                      <span>{cat.categoryName}</span>
                      {isChallenging && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700 font-extrabold">
                          Zorlayıcı
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-medium flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {cat.avgTimeSeconds} sn
                      </span>
                      <span
                        className={`font-black ${
                          isChallenging
                            ? 'text-rose-600'
                            : isOptimal
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                        }`}
                      >
                        %{cat.successRate}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isChallenging
                          ? 'bg-rose-500'
                          : cat.successRate < 75
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(8, cat.successRate)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Zorluk Seviyeleri Direnç Eğrisi (Expected vs Actual) */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-black text-slate-900">
                Zorluk Seviyesi Başarı Eğrisi (1-6)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">Bilişsel Direnç Grafiği</span>
          </div>

          <p className="text-xs text-slate-500">
            Zorluk arttıkça öğrenci başarı oranlarındaki düşüş ve norm sapmaları:
          </p>

          <div className="space-y-3">
            {analytics.byDifficulty.map((diff) => {
              const isBelowBenchmark = diff.deltaFromBenchmark < -5;

              return (
                <div
                  key={diff.difficulty}
                  className="p-3 rounded-xl bg-slate-50/80 border border-zinc-200/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-white font-black text-purple-700 text-xs flex items-center justify-center border border-zinc-200 ">
                        {diff.difficulty}
                      </span>
                      <div>
                        <span className="font-extrabold text-slate-900">{diff.label}</span>
                        <span className="text-[10px] text-slate-400 font-medium ml-2">
                          ({diff.recommendedGrade})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Hedef: %{diff.expectedBenchmarkRate}
                      </span>
                      <span className="text-sm font-black text-purple-700">
                        %{diff.successRate}
                      </span>
                      {isBelowBenchmark ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                          {diff.deltaFromBenchmark}% Sapma
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dual Bar (Expected Benchmark vs Actual) */}
                  <div className="space-y-1 pt-0.5">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${diff.successRate}%` }}
                        title={`Gerçekleşen: %${diff.successRate}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: QUESTION ANALYTICS TABLE (Soru Analitik Tablosu) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-black text-slate-900">
                Parametrik Soru Başarı Analitik Tablosu
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sisteme yüklenen tüm parametrik soruların detaylı başarı oranları, süre kullanımları ve çeldirici analizleri.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {analytics.challengingQuestions.length} Soru Listeleniyor
            </span>
          </div>
        </div>

        {analytics.challengingQuestions.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800">
              Seçilen kriterlerde soru bulunamadı!
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Filtreleri sıfırlayarak tüm soruları inceleyebilirsiniz.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 rounded-tl-2xl">Soru ID / Kategori</th>
                  <th className="p-4">Sınıf / Seviye</th>
                  <th className="p-4 text-center">Başarı Oranı</th>
                  <th className="p-4 text-center">Deneme / Hata</th>
                  <th className="p-4 text-center">Ortalama Süre</th>
                  <th className="p-4 text-right rounded-tr-2xl">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.challengingQuestions.map((item, idx) => {
                  const q = item.question;
                  const grade = (q.targetGrade || 1) as 1 | 2 | 3 | 4;
                  const gradeCfg = GRADE_CONFIGS[grade];
                  const isExpanded = expandedExplanationIds.has(q.id);

                  return (
                    <React.Fragment key={q.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors bg-white">
                        <td className="p-4">
                          <div className="font-mono text-xs font-bold text-slate-900">{q.id}</div>
                          <div className="text-[11px] font-medium text-slate-500">{COGNITIVE_CATEGORY_LABELS[q.category]}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${gradeCfg.badgeBg} ${gradeCfg.badgeColor}`}>
                              {gradeCfg.title}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${DIFFICULTY_COLORS[q.difficulty]}`}>
                              Seviye {q.difficulty}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-black border ${
                            item.successRate < 50 ? 'bg-rose-100 text-rose-700 border-rose-200' :
                            item.successRate > 85 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            'bg-amber-100 text-amber-700 border-amber-200'
                          }`}>
                            %{item.successRate}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-extrabold text-slate-800 text-xs">{item.totalAttempts} Çözüm</div>
                          <div className="text-[10px] text-rose-500 font-bold">{item.wrongCount} Yanlış</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`font-extrabold text-xs ${item.timeOverrunPct > 15 ? 'text-amber-600' : 'text-slate-800'}`}>
                            {item.avgTimeSeconds} sn
                          </div>
                          {item.timeOverrunPct > 15 && (
                            <div className="text-[9px] text-amber-500 font-bold">(+{item.timeOverrunPct}% Aşım)</div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExplanation(q.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Detayları Gör"
                            >
                              <span>Detaylar</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                setActiveSimulatorQuestion(q);
                              }}
                              className="p-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors cursor-pointer"
                              title="Simülatörde Çöz"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0 border-b border-zinc-200">
                            <div className="bg-slate-50 p-4 sm:p-6 border-l-4 border-purple-500 space-y-4 ">
                              <div>
                                <h4 className="text-xs font-black text-slate-900 mb-1">Soru Metni:</h4>
                                <p className="text-xs text-slate-700 whitespace-normal">{q.prompt}</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 whitespace-normal">
                                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                                  <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    <span>Çeldirici Analizi (Şık {item.mostCommonDistractorOptionId})</span>
                                  </div>
                                  <p className="text-xs text-rose-900/90 leading-relaxed">
                                    {item.pedagogicalChallengeReason}
                                  </p>
                                </div>
                                <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2">
                                  <div className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                                    <Lightbulb className="w-4 h-4 text-purple-700" />
                                    <span>Kural / Çözüm</span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-800">
                                    {q.explanation.summary || q.explanation.ruleTitle}
                                  </p>
                                  <ol className="list-decimal list-inside space-y-1 text-slate-700 font-medium text-xs mt-2">
                                    {q.explanation.steps.map((step, sIdx) => (
                                      <li key={sIdx}>{step}</li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: PEDAGOGICAL RECOMMENDATIONS (Müfredat ve Geliştirici Önerileri) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-black text-slate-900">
            Pedagojik Teşhis ve Müfredat İyileştirme Önerileri
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Öğrenci yanıt desenlerine dayalı olarak derlenen bilişsel destek ve soru kalitesi iyileştirme tavsiyeleri:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.pedagogicalInsights.map((insight) => {
            const isWarning = insight.type === 'critical_warning' || insight.type === 'timing_friction';

            return (
              <div
                key={insight.id}
                className={`p-4 rounded-xl border space-y-2.5 ${
                  isWarning
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-indigo-50/60 border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                  <h4 className="text-xs font-black text-slate-900">{insight.title}</h4>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{insight.description}</p>

                <div className="p-2.5 rounded-xl bg-white/80 text-xs font-medium text-slate-800 space-y-1">
                  <span className="font-bold text-[11px] text-purple-700 uppercase tracking-wider block">
                    Önerilen Eylem / Çözüm:
                  </span>
                  <span>{insight.actionRecommendation}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STUDENT PRACTICE SIMULATOR MODAL */}
      {/* ========================================================================= */}
      {activeSimulatorQuestion && (
        <AdminStudentPracticeSimulatorModal
          question={activeSimulatorQuestion}
          onClose={() => setActiveSimulatorQuestion(null)}
        />
      )}
    </div>
  );
};
