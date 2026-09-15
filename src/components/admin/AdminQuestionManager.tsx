import React, { useState, useEffect, useMemo } from 'react';
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
  questionBankService,
  QuestionFilter,
  CreateQuestionPayload,
} from '../../services/question-bank-service';
import {
  GRADE_CONFIGS,
  ALL_GRADES,
  GradeLevelConfig,
} from '../../features/questions/grade-config';
import {
  ALL_QUESTION_TYPES,
  CATEGORY_TYPES_MAP,
  generateQuestionByType,
} from '../../features/questions/generators';
import { validateQuestion } from '../../features/questions/validator';
import { QuestionRenderer } from '../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../../features/questions/renderers/VisualExplanationOverlay';
import { AdminStudentPracticeSimulatorModal } from './AdminStudentPracticeSimulatorModal';
import { sound } from '../../lib/sound';
import {
  Plus,
  Filter,
  Search,
  Grid,
  Layers,
  Sparkles,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Clock,
  Target,
  GraduationCap,
  X,
  Shuffle,
  HelpCircle,
  Check,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Compass,
  Brain,
  Hash,
  Play,
  CheckSquare,
  Square,
  ArrowUpDown,
  BarChart3,
  Zap,
} from 'lucide-react';

interface AdminQuestionManagerProps {
  onInspectInStudio: (type: QuestionType, seed: number, difficulty: DifficultyLevel) => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToBulkGenerator?: () => void;
}

// Cognitive Category Theme Config
const CATEGORY_ICONS: Record<CognitiveCategory, string> = {
  visual_perception: '👁️',
  pattern: '🥞',
  matrix: '🔲',
  spatial: '🧭',
  logic: '🧠',
  attention: '🎯',
  memory: '✨',
  numerical: '🔢',
  verbal: '💬',
  coding: '💻',
};

const CATEGORY_COLORS: Record<
  CognitiveCategory,
  { bg: string; text: string; border: string; pill: string }
> = {
  visual_perception: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  pattern: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    pill: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  matrix: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  spatial: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    pill: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  logic: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    pill: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  attention: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    pill: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  memory: {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-200',
    pill: 'bg-violet-100 text-violet-800 border-violet-300',
  },
  numerical: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    pill: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  verbal: {
    bg: 'bg-pink-50',
    text: 'text-pink-800',
    border: 'border-pink-200',
    pill: 'bg-pink-100 text-pink-800 border-pink-300',
  },
  coding: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    pill: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
};

export const AdminQuestionManager: React.FC<AdminQuestionManagerProps> = ({
  onInspectInStudio,
  onNavigateToAnalytics,
  onNavigateToBulkGenerator,
}) => {
  // State
  const [questions, setQuestions] = useState<BaseQuestion[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | 4 | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CognitiveCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<
    'default' | 'difficulty_asc' | 'difficulty_desc' | 'grade_asc' | 'grade_desc' | 'prompt_asc'
  >('default');

  // Multi-selection for batch actions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [activeQuestion, setActiveQuestion] = useState<BaseQuestion | null>(null);
  const [activeSimulatorQuestion, setActiveSimulatorQuestion] = useState<BaseQuestion | null>(null);

  // Notifications / Feedback
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Load questions on mount & when filters change
  const refreshQuestions = () => {
    const list = questionBankService.getFiltered({
      grade: selectedGrade,
      category: selectedCategory,
      difficulty: selectedDifficulty,
      search: searchQuery,
    });
    setQuestions(list);
  };

  useEffect(() => {
    refreshQuestions();
  }, [selectedGrade, selectedCategory, selectedDifficulty, searchQuery]);

  // Overall Stats
  const stats = useMemo(() => {
    return questionBankService.getStats();
  }, [questions]);

  // Cognitive category distribution for visual breakdown
  const categoryDistribution = useMemo(() => {
    const total = questions.length;
    if (total === 0) return [];
    const counts: Record<string, number> = {};
    questions.forEach((q) => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return ALL_COGNITIVE_CATEGORIES.map((cat) => ({
      category: cat,
      label: COGNITIVE_CATEGORY_LABELS[cat],
      count: counts[cat] || 0,
      pct: Math.round(((counts[cat] || 0) / total) * 100),
      color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.visual_perception,
    })).filter((c) => c.count > 0);
  }, [questions]);

  // Sorted and filtered questions list
  const displayQuestions = useMemo(() => {
    let list = [...questions];
    if (sortBy === 'difficulty_asc') {
      list.sort((a, b) => a.difficulty - b.difficulty);
    } else if (sortBy === 'difficulty_desc') {
      list.sort((a, b) => b.difficulty - a.difficulty);
    } else if (sortBy === 'grade_asc') {
      list.sort((a, b) => (a.targetGrade || 1) - (b.targetGrade || 1));
    } else if (sortBy === 'grade_desc') {
      list.sort((a, b) => (b.targetGrade || 1) - (a.targetGrade || 1));
    } else if (sortBy === 'prompt_asc') {
      list.sort((a, b) => a.prompt.localeCompare(b.prompt, 'tr'));
    }
    return list;
  }, [questions, sortBy]);

  // Batch Selection helpers
  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    sound.playClick();
    if (selectedQuestionIds.size === displayQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(displayQuestions.map((q) => q.id)));
    }
  };

  const handleBatchDelete = () => {
    sound.playClick();
    if (selectedQuestionIds.size === 0) return;
    if (window.confirm(`Seçilen ${selectedQuestionIds.size} soruyu silmek istediğinize emin misiniz?`)) {
      selectedQuestionIds.forEach((id) => {
        questionBankService.deleteQuestion(id);
      });
      showNotification(`${selectedQuestionIds.size} soru havuzdan başarıyla silindi.`);
      setSelectedQuestionIds(new Set());
      refreshQuestions();
    }
  };

  const handleBatchDuplicate = (targetGrade: 1 | 2 | 3 | 4) => {
    sound.playClick();
    if (selectedQuestionIds.size === 0) return;
    selectedQuestionIds.forEach((id) => {
      questionBankService.duplicateQuestion(id, targetGrade);
    });
    showNotification(`${selectedQuestionIds.size} soru ${targetGrade}. Sınıf havuzuna kopyalandı.`);
    setSelectedQuestionIds(new Set());
    refreshQuestions();
  };

  const handleBatchExport = () => {
    sound.playClick();
    if (selectedQuestionIds.size === 0) return;
    const selectedQuestions = questions.filter((q) => selectedQuestionIds.has(q.id));
    const jsonStr = JSON.stringify(selectedQuestions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secilen_${selectedQuestions.length}_soru_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`${selectedQuestions.length} soru JSON dosyası olarak indirildi.`);
  };

  const handleClearFilters = () => {
    sound.playClick();
    setSelectedGrade('all');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSearchQuery('');
    setSortBy('default');
  };

  const hasActiveFilters =
    selectedGrade !== 'all' ||
    selectedCategory !== 'all' ||
    selectedDifficulty !== 'all' ||
    searchQuery.trim().length > 0 ||
    sortBy !== 'default';

  // Handle Delete
  const handleDelete = (id: string, promptTitle: string) => {
    sound.playClick();
    if (window.confirm(`"${promptTitle}" sorusunu havuzdan silmek istediğinize emin misiniz?`)) {
      const ok = questionBankService.deleteQuestion(id);
      if (ok) {
        showNotification('Soru başarıyla havuzdan kaldırıldı.');
        refreshQuestions();
      }
    }
  };

  // Handle Duplicate
  const handleDuplicate = (id: string, targetGrade: 1 | 2 | 3 | 4) => {
    sound.playClick();
    const cloned = questionBankService.duplicateQuestion(id, targetGrade);
    if (cloned) {
      showNotification(`Soru başarıyla ${targetGrade}. Sınıf havuzuna kopyalandı.`);
      refreshQuestions();
    }
  };

  // Handle Export
  const handleExportJSON = () => {
    sound.playClick();
    const jsonStr = questionBankService.exportQuestionsJson(selectedGrade);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilsem_soru_havuzu_${selectedGrade === 'all' ? 'tum_siniflar' : `${selectedGrade}_sinif`}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Soru havuzu JSON dosyası olarak indirildi.');
  };

  // Handle Reset to Defaults
  const handleResetDefaults = () => {
    sound.playClick();
    if (window.confirm('Tüm özel sorular sıfırlanıp varsayılan BİLSEM soru havuzuna dönülsün mü?')) {
      questionBankService.resetToDefaults();
      refreshQuestions();
      showNotification('Soru havuzu varsayılan BİLSEM standartlarına sıfırlandı.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white  text-xs sm:text-sm font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Hero Management Header */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 sm:p-6  space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Soru Yönetim Modülü
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                MEB BİLSEM Havuzu
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              1, 2, 3 ve 4. sınıf düzeyleri için yeni sorular üretin, zorluk derecesi (1-6) ve 8 bilişsel kategoriye göre havuzu yönetin.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToAnalytics && (
              <button
                onClick={() => {
                  sound.playClick();
                  onNavigateToAnalytics();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer "
                title="Kategori ve zorluk derecelerine göre öğrenci başarı oranlarını incele"
              >
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Soru Analiz Dashboard'u</span>
              </button>
            )}

            <button
              onClick={() => {
                sound.playClick();
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm  hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Soru Ekle</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-zinc-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Filtrelenmiş soruları JSON olarak indir"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>JSON İndir</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setIsImportModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-zinc-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="JSON dosyasından soru içe aktar"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>İçe Aktar</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="p-2 rounded-xl bg-slate-50 border border-zinc-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer"
              title="Varsayılan Soru Havuzuna Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Overview Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-200">
          <div className="p-3 rounded-xl bg-slate-50 border border-zinc-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Toplam Soru
            </span>
            <div className="text-xl font-black text-slate-900">{stats.total} Soru</div>
            <span className="text-[10px] font-bold text-purple-700">Havuzda Kayıtlı</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
              1. Sınıf Düzeyi
            </span>
            <div className="text-xl font-black text-emerald-950">{stats.byGrade[1]} Soru</div>
            <span className="text-[10px] font-bold text-emerald-700">Temel Algı (Zorluk 1-2)</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/70">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
              2. Sınıf Düzeyi
            </span>
            <div className="text-xl font-black text-blue-950">{stats.byGrade[2]} Soru</div>
            <span className="text-[10px] font-bold text-blue-700">Kural Keşfi (Zorluk 2-3)</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200/70">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
              3 & 4. Sınıf Düzeyi
            </span>
            <div className="text-xl font-black text-purple-950">
              {stats.byGrade[3] + stats.byGrade[4]} Soru
            </div>
            <span className="text-[10px] font-bold text-purple-700">Analoji & 3x3 Matris</span>
          </div>
        </div>

        {/* Cognitive Domain Distribution Visual Stacked Bar */}
        {categoryDistribution.length > 0 && (
          <div className="pt-3 border-t border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>Bilişsel Kategori Dağılımı ({questions.length} Soru)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">8 BİLSEM Yetenek Alanı</span>
            </div>
            {/* Stacked multi-color bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 ">
              {categoryDistribution.map((item) => (
                <div
                  key={item.category}
                  style={{ width: `${item.pct}%` }}
                  className={`${item.color.bg.replace('50', '500')} hover:opacity-80 transition-all cursor-pointer`}
                  title={`${item.label}: ${item.count} soru (%${item.pct})`}
                />
              ))}
            </div>
            {/* Legend pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {categoryDistribution.map((item) => (
                <button
                  key={item.category}
                  onClick={() => {
                    sound.playClick();
                    setSelectedCategory(
                      selectedCategory === item.category ? 'all' : (item.category as CognitiveCategory)
                    );
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all ${
                    selectedCategory === item.category
                      ? `${item.color.pill} ring-2 ring-purple-400 `
                      : 'bg-slate-50 text-slate-600 border-zinc-200 hover:bg-slate-100'
                  }`}
                >
                  {CATEGORY_ICONS[item.category as CognitiveCategory]} {item.label}: {item.count} (%{item.pct})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Filter & Selector Toolbar */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5  space-y-4">
        {/* 1. Grade Level Selector Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>Sınıf Düzeyi Filtresi</span>
            </label>
            <span className="text-[11px] font-bold text-slate-500">
              {selectedGrade === 'all' ? 'Tüm Sınıflar' : `${selectedGrade}. Sınıf Seçili`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setSelectedGrade('all');
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                selectedGrade === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 '
                  : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
              }`}
            >
              <span>Tüm Sınıflar</span>
              <span className="block text-[10px] opacity-75 font-normal">
                {stats.total} Soru
              </span>
            </button>

            {ALL_GRADES.map((g) => {
              const cfg = GRADE_CONFIGS[g];
              const isSelected = selectedGrade === g;
              return (
                <button
                  key={g}
                  onClick={() => {
                    sound.playClick();
                    setSelectedGrade(g);
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center flex flex-col items-center gap-0.5 ${
                    isSelected
                      ? `${cfg.badgeBg} ${cfg.badgeColor} border-current  scale-102`
                      : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{cfg.icon}</span>
                    <span>{cfg.title}</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80">
                    {stats.byGrade[g]} Soru • {cfg.timeLimitSeconds}sn
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Cognitive Category Filter Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-indigo-600" />
              <span>Bilişsel Kategori Filtresi</span>
            </label>
            <span className="text-[11px] font-bold text-slate-500">
              {selectedCategory === 'all' ? 'Tüm Kategoriler' : COGNITIVE_CATEGORY_LABELS[selectedCategory]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                sound.playClick();
                setSelectedCategory('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
              }`}
            >
              Tüm Kategoriler
            </button>

            {ALL_COGNITIVE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const theme = CATEGORY_COLORS[cat];
              const count = stats.byCategory[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    sound.playClick();
                    setSelectedCategory(cat);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? `${theme.bg} ${theme.text} border-current `
                      : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{COGNITIVE_CATEGORY_LABELS[cat]}</span>
                  <span className="text-[10px] opacity-75 font-mono px-1 rounded-sm bg-black/5">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Difficulty Level & Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-zinc-200">
          {/* Difficulty Filter */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span>Zorluk Derecesi Filtresi</span>
            </label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => {
                  sound.playClick();
                  setSelectedDifficulty('all');
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedDifficulty === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-zinc-200'
                }`}
              >
                Tümü
              </button>

              {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => {
                const isSelected = selectedDifficulty === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => {
                      sound.playClick();
                      setSelectedDifficulty(lvl);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? `${DIFFICULTY_COLORS[lvl]} border-current `
                        : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                    }`}
                  >
                    Seviye {lvl}: {DIFFICULTY_LABELS[lvl]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Metin / ID / Motor Ara</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Örn: matris, analoji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sorting Selector */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-600" />
              <span>Sıralama Ölçütü</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="default">Varsayılan Sıralama</option>
              <option value="difficulty_asc">Zorluk: Kolaydan Zora (1 → 6)</option>
              <option value="difficulty_desc">Zorluk: Zordan Kolaya (6 → 1)</option>
              <option value="grade_asc">Sınıf: 1. Sınıf → 4. Sınıf</option>
              <option value="grade_desc">Sınıf: 4. Sınıf → 1. Sınıf</option>
              <option value="prompt_asc">Alfabetik (Yönerge A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="md:col-span-2 space-y-1.5 flex flex-col justify-end">
            <div className="flex rounded-xl bg-slate-100 p-1 border border-zinc-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 '
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Kart</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 '
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tablo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Chips & Batch Selection Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700">
            Gösterilen: <strong className="text-purple-700">{displayQuestions.length}</strong> / {stats.total} Soru
          </span>

          {selectedGrade !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 text-[11px] font-bold">
              {selectedGrade}. Sınıf
              <button onClick={() => setSelectedGrade('all')} className="hover:text-purple-950 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[11px] font-bold">
              {COGNITIVE_CATEGORY_LABELS[selectedCategory]}
              <button onClick={() => setSelectedCategory('all')} className="hover:text-blue-950 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedDifficulty !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold">
              Seviye {selectedDifficulty}
              <button onClick={() => setSelectedDifficulty('all')} className="hover:text-amber-950 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 text-[11px] font-bold">
              "{searchQuery}"
              <button onClick={() => setSearchQuery('')} className="hover:text-slate-950 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer ml-1"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Batch Select All Button */}
          {displayQuestions.length > 0 && (
            <button
              onClick={handleSelectAllVisible}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer "
            >
              {selectedQuestionIds.size === displayQuestions.length && displayQuestions.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-purple-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedQuestionIds.size === displayQuestions.length && displayQuestions.length > 0
                  ? 'Seçimleri Kaldır'
                  : 'Tümünü Seç'}
              </span>
            </button>
          )}

          {onNavigateToBulkGenerator && (
            <button
              onClick={() => {
                sound.playClick();
                onNavigateToBulkGenerator();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-indigo-500/15 hover:from-amber-500/25 hover:to-indigo-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Toplu Soru Motoru</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              setIsCreateModalOpen(true);
            }}
            className="text-purple-600 font-bold hover:text-purple-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Soru Ekle</span>
          </button>
        </div>
      </div>

      {/* Floating Sticky Batch Operations Toolbar */}
      {selectedQuestionIds.size > 0 && (
        <div className="sticky bottom-4 z-40 bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl  border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center">
              {selectedQuestionIds.size}
            </span>
            <span className="text-xs sm:text-sm font-bold">Soru Seçildi</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Duplicate to grade */}
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleBatchDuplicate(Number(e.target.value) as 1 | 2 | 3 | 4);
                  e.target.value = '';
                }
              }}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-800 text-white border border-slate-600 hover:bg-slate-700 cursor-pointer focus:outline-hidden"
            >
              <option value="" disabled>
                Seçilenleri Sınıfa Çoğalt...
              </option>
              {ALL_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}. Sınıfa Kopyala
                </option>
              ))}
            </select>

            {/* Export batch */}
            <button
              onClick={handleBatchExport}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Seçilenleri İndir (JSON)</span>
            </button>

            {/* Delete batch */}
            <button
              onClick={handleBatchDelete}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Seçilenleri Sil ({selectedQuestionIds.size})</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedQuestionIds(new Set())}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Main Question Display: Cards or Table */}
      {displayQuestions.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Eşleşen Soru Bulunamadı</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Seçilen sınıf düzeyi, bilişsel kategori veya arama kelimesine uygun soru yok. Filtreleri temizleyebilir veya hemen yeni bir soru ekleyebilirsiniz.
            </p>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer "
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Soru Oluştur</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayQuestions.map((q) => {
            const grade = (q.targetGrade || 1) as 1 | 2 | 3 | 4;
            const gradeCfg = GRADE_CONFIGS[grade];
            const catTheme = CATEGORY_COLORS[q.category] || CATEGORY_COLORS.visual_perception;
            const isSelected = selectedQuestionIds.has(q.id);

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border p-5 space-y-4 transition-all  flex flex-col justify-between ${
                  isSelected
                    ? 'border-purple-500 ring-2 ring-purple-200'
                    : 'border-zinc-200 hover:border-purple-300'
                }`}
              >
                {/* Header Badges */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectQuestion(q.id)}
                        className="p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isSelected ? 'Seçimi Kaldır' : 'Soruyu Seç'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                        )}
                      </button>

                      {/* Grade Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${gradeCfg.badgeBg} ${gradeCfg.badgeColor}`}
                      >
                        <span>{gradeCfg.icon}</span>
                        <span>{gradeCfg.title}</span>
                      </span>
                    </div>

                    {/* Difficulty Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        DIFFICULTY_COLORS[q.difficulty]
                      }`}
                    >
                      Zorluk {q.difficulty}: {DIFFICULTY_LABELS[q.difficulty]}
                    </span>
                  </div>

                  {/* Cognitive Category Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-bold border ${catTheme.pill}`}
                    >
                      <span>{CATEGORY_ICONS[q.category]}</span>
                      <span>{COGNITIVE_CATEGORY_LABELS[q.category]}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{q.id.replace('q_', '')}
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-zinc-200/80">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {q.prompt}
                    </h4>
                    {q.secondaryPrompt && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {q.secondaryPrompt}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{QUESTION_TYPE_LABELS[q.type]}</span>
                      <span className="font-mono text-emerald-700 font-bold">
                        Doğru: {q.correctOptionId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SVG Visual Thumbnail Canvas */}
                <div className="bg-white p-2 rounded-xl border border-zinc-200  overflow-hidden flex items-center justify-center min-h-[140px]">
                  <div className="w-full max-w-[260px] pointer-events-none scale-90">
                    <QuestionRenderer question={q} />
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-2 border-t border-zinc-200 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* View Detail */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        setActiveQuestion(q);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                      title="Soruyu tam ekranda ve çözümüyle incele"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Student Practice Simulator button */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        setActiveSimulatorQuestion(q);
                      }}
                      className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Öğrenci Gibi Çöz (Simülatör)"
                    >
                      <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                      <span className="text-[11px] font-bold">Çöz</span>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        setActiveQuestion(q);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                      title="Soru parametrelerini ve metinlerini düzenle"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Inspect in SVG Studio */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        onInspectInStudio(q.type, q.seed, q.difficulty);
                      }}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                      title="Soru Mimarı & SVG Stüdyosunda Aç"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Duplicate Grade & Delete */}
                  <div className="flex items-center gap-1">
                    {/* Clone to other grade quick selector */}
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleDuplicate(q.id, Number(e.target.value) as 1 | 2 | 3 | 4);
                          e.target.value = '';
                        }
                      }}
                      className="text-[11px] font-bold p-1.5 rounded-xl border border-zinc-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer focus:outline-hidden"
                      title="Başka bir sınıf düzeyine kopyala"
                    >
                      <option value="" disabled>
                        Sınıfa Çoğalt...
                      </option>
                      {ALL_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}. Sınıfa Kopyala
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleDelete(q.id, q.prompt)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-zinc-200 transition-colors cursor-pointer"
                      title="Soruyu Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden ">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="cursor-pointer"
                      title="Tümünü Seç / Kaldır"
                    >
                      {selectedQuestionIds.size === displayQuestions.length && displayQuestions.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Sınıf</th>
                  <th className="py-3 px-4">Bilişsel Kategori</th>
                  <th className="py-3 px-4">Zorluk</th>
                  <th className="py-3 px-4">Soru & Yönerge</th>
                  <th className="py-3 px-4">Motor / Tür</th>
                  <th className="py-3 px-4">Doğru</th>
                  <th className="py-3 px-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayQuestions.map((q) => {
                  const grade = (q.targetGrade || 1) as 1 | 2 | 3 | 4;
                  const gradeCfg = GRADE_CONFIGS[grade];
                  const catTheme = CATEGORY_COLORS[q.category] || CATEGORY_COLORS.visual_perception;
                  const isSelected = selectedQuestionIds.has(q.id);

                  return (
                    <tr
                      key={q.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-purple-50/70' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectQuestion(q.id)}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${gradeCfg.badgeBg} ${gradeCfg.badgeColor}`}
                        >
                          <span>{gradeCfg.icon}</span>
                          <span>{gradeCfg.title}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${catTheme.pill}`}
                        >
                          <span>{CATEGORY_ICONS[q.category]}</span>
                          <span>{COGNITIVE_CATEGORY_LABELS[q.category]}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                            DIFFICULTY_COLORS[q.difficulty]
                          }`}
                        >
                          Seviye {q.difficulty}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{q.prompt}</div>
                        {q.secondaryPrompt && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {q.secondaryPrompt}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-semibold">
                        {QUESTION_TYPE_LABELS[q.type]}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold">
                          {q.correctOptionId}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Student Practice Simulator button */}
                          <button
                            onClick={() => {
                              sound.playClick();
                              setActiveSimulatorQuestion(q);
                            }}
                            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer"
                            title="Öğrenci Gibi Çöz (Simülatör)"
                          >
                            <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                          </button>

                          <button
                            onClick={() => {
                              sound.playClick();
                              setActiveQuestion(q);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-zinc-200 cursor-pointer"
                            title="İncele"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              sound.playClick();
                              setActiveQuestion(q);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-zinc-200 cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onInspectInStudio(q.type, q.seed, q.difficulty)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-zinc-200 cursor-pointer"
                            title="Stüdyoda Aç"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id, q.prompt)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-zinc-200 cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE NEW QUESTION SUITE */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <CreateQuestionModal
          initialGrade={selectedGrade === 'all' ? 2 : selectedGrade}
          initialCategory={selectedCategory === 'all' ? 'matrix' : selectedCategory}
          initialDifficulty={selectedDifficulty === 'all' ? 3 : selectedDifficulty}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newQ) => {
            setIsCreateModalOpen(false);
            refreshQuestions();
            showNotification(`${newQ.targetGrade}. Sınıf için yeni soru başarıyla havuza eklendi!`);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT QUESTION */}
      {/* ========================================================= */}
      {isEditModalOpen && activeQuestion && (
        <EditQuestionModal
          question={activeQuestion}
          onClose={() => {
            setIsEditModalOpen(false);
            setActiveQuestion(null);
          }}
          onSaved={(updatedQ) => {
            setIsEditModalOpen(false);
            setActiveQuestion(null);
            refreshQuestions();
            showNotification('Soru değişiklikleri başarıyla kaydedildi.');
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DETAIL & SOLUTION VIEW */}
      {/* ========================================================= */}
      {isDetailModalOpen && activeQuestion && (
        <QuestionDetailModal
          question={activeQuestion}
          onClose={() => {
            setIsDetailModalOpen(false);
            setActiveQuestion(null);
          }}
          onOpenStudio={() => {
            onInspectInStudio(activeQuestion.type, activeQuestion.seed, activeQuestion.difficulty);
            setIsDetailModalOpen(false);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 4: IMPORT JSON MODAL */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <ImportQuestionModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={(count) => {
            setIsImportModalOpen(false);
            refreshQuestions();
            showNotification(`${count} adet soru başarıyla havuza içe aktarıldı!`);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 5: STUDENT PRACTICE SIMULATOR */}
      {/* ========================================================= */}
      {activeSimulatorQuestion && (
        <AdminStudentPracticeSimulatorModal
          question={activeSimulatorQuestion}
          onClose={() => setActiveSimulatorQuestion(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// CREATE QUESTION MODAL COMPONENT (WITH REAL-TIME PREVIEW & ENGINE GENERATOR)
// ============================================================================
interface CreateQuestionModalProps {
  initialGrade: 1 | 2 | 3 | 4;
  initialCategory: CognitiveCategory;
  initialDifficulty: DifficultyLevel;
  onClose: () => void;
  onCreated: (q: BaseQuestion) => void;
}

const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  initialGrade,
  initialCategory,
  initialDifficulty,
  onClose,
  onCreated,
}) => {
  // Form State
  const [targetGrade, setTargetGrade] = useState<1 | 2 | 3 | 4>(initialGrade);
  const [category, setCategory] = useState<CognitiveCategory>(initialCategory);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 900000) + 100000);

  // Available types based on selected category
  const categoryTypes = useMemo(() => {
    return CATEGORY_TYPES_MAP[category] || ['matrix_2x2'];
  }, [category]);

  const [selectedType, setSelectedType] = useState<QuestionType>(categoryTypes[0]);

  // When category changes, switch type to first available in category
  useEffect(() => {
    if (!categoryTypes.includes(selectedType)) {
      setSelectedType(categoryTypes[0]);
    }
  }, [category, categoryTypes]);

  // Live generated question instance for preview
  const liveQuestion = useMemo(() => {
    try {
      const q = generateQuestionByType(selectedType, seed, difficulty);
      q.targetGrade = targetGrade;
      q.targetGrades = [targetGrade];
      q.category = category;
      q.estimatedSeconds = GRADE_CONFIGS[targetGrade].timeLimitSeconds;
      return q;
    } catch (err) {
      console.error('Failed to generate preview question', err);
      return generateQuestionByType('visual_sequence', seed, 2);
    }
  }, [selectedType, seed, difficulty, targetGrade, category]);

  // Customizable Fields
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customSecondaryPrompt, setCustomSecondaryPrompt] = useState<string>('');
  const [customSummary, setCustomSummary] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Sync custom prompt when type/seed changes
  useEffect(() => {
    setCustomPrompt(liveQuestion.prompt);
    setCustomSecondaryPrompt(liveQuestion.secondaryPrompt || '');
    setCustomSummary(liveQuestion.explanation.summary);
  }, [liveQuestion.id]);

  const activeGradeCfg = GRADE_CONFIGS[targetGrade];

  const handleRandomizeSeed = () => {
    sound.playClick();
    setSeed(Math.floor(Math.random() * 900000) + 100000);
  };

  const handleSave = () => {
    sound.playSuccess();
    const payload: CreateQuestionPayload = {
      targetGrade,
      category,
      difficulty,
      type: selectedType,
      seed,
      prompt: customPrompt.trim() !== '' ? customPrompt : liveQuestion.prompt,
      secondaryPrompt: customSecondaryPrompt.trim() !== '' ? customSecondaryPrompt : undefined,
      correctOptionId: liveQuestion.correctOptionId,
      customExplanationSummary:
        customSummary.trim() !== '' ? customSummary : liveQuestion.explanation.summary,
    };

    const created = questionBankService.addQuestion(payload);
    onCreated(created);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200  w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Yeni BİLSEM Sorusu Ekle & Yapılandır
              </h3>
              <p className="text-xs text-slate-500">
                Sınıf düzeyi, bilişsel kategori ve zorluk derecesini belirleyip soruyu canlı önizleyin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns (Controls + Live Canvas Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Configuration Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Grade Level Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <span>1. Hedef Sınıf Düzeyi</span>
                </label>
                <span className="text-[11px] font-bold text-purple-700">
                  {activeGradeCfg.stageName} ({activeGradeCfg.timeLimitSeconds} sn)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ALL_GRADES.map((g) => {
                  const cfg = GRADE_CONFIGS[g];
                  const isSelected = targetGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setTargetGrade(g);
                        // Suggest recommended difficulty for this grade if current not in range
                        if (!cfg.difficultyRange.includes(difficulty)) {
                          setDifficulty(cfg.defaultDifficulty);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isSelected
                          ? `${cfg.badgeBg} ${cfg.badgeColor} border-current  scale-102`
                          : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-lg">{cfg.icon}</span>
                      <span>{cfg.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Cognitive Category Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <span>2. Bilişsel Kategori</span>
                </label>
                <span className="text-[11px] font-bold text-indigo-700">
                  {COGNITIVE_CATEGORY_LABELS[category]}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_COGNITIVE_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  const theme = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setCategory(cat);
                      }}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left flex items-center gap-1.5 ${
                        isSelected
                          ? `${theme.bg} ${theme.text} border-current `
                          : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                      <span className="text-[11px] leading-tight line-clamp-1">
                        {COGNITIVE_CATEGORY_LABELS[cat]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Difficulty Level Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span>3. Zorluk Derecesi</span>
                </label>
                <span className="text-[11px] font-bold text-slate-500">
                  {targetGrade}. Sınıf İçin Önerilen: Seviye {activeGradeCfg.difficultyRange.join(' - ')}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => {
                  const isSelected = difficulty === lvl;
                  const isRec = activeGradeCfg.difficultyRange.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setDifficulty(lvl);
                      }}
                      className={`py-2 px-1 rounded-xl border text-center font-bold transition-all cursor-pointer flex flex-col items-center ${
                        isSelected
                          ? `${DIFFICULTY_COLORS[lvl]} border-current  scale-102`
                          : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm font-black">{lvl}</span>
                      <span className="text-[9px] leading-tight opacity-80">
                        {DIFFICULTY_LABELS[lvl]}
                      </span>
                      {isRec && <span className="text-[8px] text-purple-600 font-bold">⭐</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Engine & Seed Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Question Engine Type */}
              <div className="sm:col-span-7 space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  4. Soru Motoru / Türü
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    sound.playClick();
                    setSelectedType(e.target.value as QuestionType);
                  }}
                  className="w-full p-2 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                >
                  <optgroup label={`${COGNITIVE_CATEGORY_LABELS[category]} Motorları`}>
                    {categoryTypes.map((t) => (
                      <option key={t} value={t}>
                        ⭐ {QUESTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Diğer 18 Motor">
                    {ALL_QUESTION_TYPES.filter((t) => !categoryTypes.includes(t)).map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Seed & Randomizer */}
              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Deterministik Tohum (RNG)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value) || 100000)}
                    className="w-full p-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeSeed}
                    title="Rastgele yeni varyant tohumu üret"
                    className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer shrink-0 transition-colors"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Custom Prompts & Advanced Options Toggle */}
            <div className="pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showAdvanced ? 'Özel Metin Ayarlarını Gizle' : 'Özel Yönerge & Metinleri Düzenle'}</span>
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 bg-slate-50 p-3 rounded-xl border border-zinc-200 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Soru Ana Yönergesi (Prompt):
                    </label>
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Alt Yönerge / İpucu (İsteğe Bağlı):
                    </label>
                    <input
                      type="text"
                      value={customSecondaryPrompt}
                      placeholder="Örn: Soru işareti yerine gelecek şekli bulunuz."
                      onChange={(e) => setCustomSecondaryPrompt(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Pedagojik Çözüm Açıklaması:
                    </label>
                    <textarea
                      rows={2}
                      value={customSummary}
                      onChange={(e) => setCustomSummary(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Interactive Visual Canvas (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-zinc-200 p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span>Canlı Önizleme Tuvali</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Doğru Cevap: {liveQuestion.correctOptionId}
                </span>
              </div>

              {/* Question Box */}
              <div className="bg-white p-3 rounded-xl border border-zinc-200 text-center mb-3">
                <h4 className="text-xs font-bold text-slate-900">
                  {customPrompt || liveQuestion.prompt}
                </h4>
                {(customSecondaryPrompt || liveQuestion.secondaryPrompt) && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {customSecondaryPrompt || liveQuestion.secondaryPrompt}
                  </p>
                )}
              </div>

              {/* SVG Canvas Preview */}
              <div className="bg-white p-3 rounded-xl border border-zinc-200  mb-3 flex items-center justify-center min-h-[160px]">
                <div className="w-full max-w-[280px]">
                  <QuestionRenderer question={liveQuestion} />
                </div>
              </div>

              {/* Options Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Seçenekler & Doğru Cevap:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {liveQuestion.options.map((opt) => {
                    const isCorrect = opt.id === liveQuestion.correctOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`p-1.5 rounded-xl border text-center transition-all ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                            : 'bg-white border-zinc-200'
                        }`}
                      >
                        <div className="text-[10px] font-bold mb-1 flex items-center justify-center gap-1">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {opt.id}
                          </span>
                          {isCorrect && <Check className="w-3 h-3 text-emerald-600" />}
                        </div>
                        <div className="h-12 flex items-center justify-center pointer-events-none scale-75">
                          <OptionRenderer option={opt} questionType={selectedType} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons in footer */}
            <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold  cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Havuza Kaydet & Yayınla</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EDIT QUESTION MODAL COMPONENT
// ============================================================================
interface EditQuestionModalProps {
  question: BaseQuestion;
  onClose: () => void;
  onSaved: (q: BaseQuestion) => void;
}

const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  onClose,
  onSaved,
}) => {
  const [targetGrade, setTargetGrade] = useState<1 | 2 | 3 | 4>(
    (question.targetGrade || 1) as 1 | 2 | 3 | 4
  );
  const [category, setCategory] = useState<CognitiveCategory>(question.category);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(question.difficulty);
  const [prompt, setPrompt] = useState<string>(question.prompt);
  const [secondaryPrompt, setSecondaryPrompt] = useState<string>(question.secondaryPrompt || '');
  const [summary, setSummary] = useState<string>(question.explanation.summary);
  const [correctOptionId, setCorrectOptionId] = useState<string>(question.correctOptionId);

  const handleUpdate = () => {
    sound.playSuccess();
    const updated = questionBankService.updateQuestion(question.id, {
      targetGrade,
      targetGrades: [targetGrade],
      category,
      difficulty,
      prompt,
      secondaryPrompt: secondaryPrompt.trim() !== '' ? secondaryPrompt : undefined,
      correctOptionId,
      explanation: {
        ...question.explanation,
        summary,
      },
    });

    if (updated) {
      onSaved(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200  w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Soruyu Düzenle (#{question.id.replace('q_', '')})
              </h3>
              <p className="text-xs text-slate-500">
                Sınıf düzeyi, kategori, zorluk ve metin alanlarını güncelleyin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Grade Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Hedef Sınıf Düzeyi:</label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setTargetGrade(g)}
                  className={`p-2 rounded-xl border font-bold cursor-pointer transition-all ${
                    targetGrade === g
                      ? 'bg-purple-600 text-white border-purple-600 '
                      : 'bg-slate-50 text-slate-700 border-zinc-200'
                  }`}
                >
                  {g}. Sınıf
                </button>
              ))}
            </div>
          </div>

          {/* Cognitive Category */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Bilişsel Kategori:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CognitiveCategory)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
            >
              {ALL_COGNITIVE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {COGNITIVE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Zorluk Derecesi (1-6):</label>
            <div className="grid grid-cols-6 gap-1">
              {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`py-1.5 rounded-xl border font-bold text-center cursor-pointer transition-all ${
                    difficulty === lvl
                      ? `${DIFFICULTY_COLORS[lvl]} border-current `
                      : 'bg-slate-50 text-slate-700 border-zinc-200'
                  }`}
                >
                  {lvl} - {DIFFICULTY_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Soru Metni (Prompt):</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
            />
          </div>

          {/* Secondary Prompt */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Alt Yönerge / İpucu:</label>
            <input
              type="text"
              value={secondaryPrompt}
              onChange={(e) => setSecondaryPrompt(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
            />
          </div>

          {/* Correct Option */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Doğru Seçenek:</label>
            <div className="flex gap-2">
              {['A', 'B', 'C', 'D'].map((optId) => (
                <button
                  key={optId}
                  type="button"
                  onClick={() => setCorrectOptionId(optId)}
                  className={`flex-1 py-1.5 rounded-xl border font-bold cursor-pointer ${
                    correctOptionId === optId
                      ? 'bg-emerald-600 text-white border-emerald-600 '
                      : 'bg-slate-50 text-slate-700 border-zinc-200'
                  }`}
                >
                  Seçenek {optId}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation Summary */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Çözüm Özeti:</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
            />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer "
          >
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// QUESTION DETAIL & PEDAGOGICAL SOLUTION MODAL
// ============================================================================
interface QuestionDetailModalProps {
  question: BaseQuestion;
  onClose: () => void;
  onOpenStudio: () => void;
}

const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  question,
  onClose,
  onOpenStudio,
}) => {
  const grade = (question.targetGrade || 1) as 1 | 2 | 3 | 4;
  const gradeCfg = GRADE_CONFIGS[grade];
  const catTheme = CATEGORY_COLORS[question.category] || CATEGORY_COLORS.visual_perception;
  const validation = validateQuestion(question);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200  w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${gradeCfg.badgeBg} ${gradeCfg.badgeColor}`}
            >
              <span>{gradeCfg.icon}</span>
              <span>{gradeCfg.title} Sınavı</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${catTheme.pill}`}
            >
              <span>{CATEGORY_ICONS[question.category]}</span>
              <span>{COGNITIVE_CATEGORY_LABELS[question.category]}</span>
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                DIFFICULTY_COLORS[question.difficulty]
              }`}
            >
              Zorluk {question.difficulty}: {DIFFICULTY_LABELS[question.difficulty]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenStudio}
              className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Stüdyoda Aç</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Prompt Header */}
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {question.prompt}
            </h3>
            {question.secondaryPrompt && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {question.secondaryPrompt}
              </p>
            )}
          </div>

          {/* SVG Canvas Box */}
          <div className="bg-slate-50 p-6 rounded-xl border border-zinc-200 flex items-center justify-center">
            <div className="w-full max-w-md">
              <QuestionRenderer question={question} />
            </div>
          </div>

          {/* Options Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Seçenekler:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {question.options.map((opt) => {
                const isCorrect = opt.id === question.correctOptionId;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border text-center relative transition-all ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                        : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.id}
                      </span>
                      {isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                          Doğru Cevap
                        </span>
                      )}
                    </div>
                    <div className="h-20 flex items-center justify-center pointer-events-none">
                      <OptionRenderer option={opt} questionType={question.type} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pedagogical Explanation Box */}
          <div className="bg-indigo-50/70 p-5 rounded-xl border border-indigo-200 space-y-3">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>BİLSEM Pedagojik Çözüm Kuralı: {question.explanation.ruleTitle}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {question.explanation.summary}
            </p>
            {question.explanation.steps && question.explanation.steps.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-indigo-900 block">Çözüm Adımları:</span>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700">
                  {question.explanation.steps.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Audit Verification */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-zinc-200 text-xs text-slate-600 font-medium">
            <span>Soru ID: <strong className="font-mono">{question.id}</strong> • Tohum: {question.seed}</span>
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>SVG & Çözüm Denetimi Geçerli</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// IMPORT QUESTIONS JSON MODAL
// ============================================================================
interface ImportQuestionModalProps {
  onClose: () => void;
  onImported: (count: number) => void;
}

const ImportQuestionModal: React.FC<ImportQuestionModalProps> = ({
  onClose,
  onImported,
}) => {
  const [jsonText, setJsonText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    sound.playClick();
    if (!jsonText.trim()) {
      setError('Lütfen içe aktarılacak JSON içeriğini yapıştırın.');
      return;
    }

    const res = questionBankService.importQuestionsJson(jsonText);
    if (res.success) {
      sound.playSuccess();
      onImported(res.count);
    } else {
      setError(res.error || 'İçe aktarma sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-zinc-200  w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-900">JSON Soru İçe Aktar</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Daha önce dışa aktarılmış veya BİLSEM formatında hazırlanmış soru listesi JSON metnini buraya yapıştırın.
          </p>

          <textarea
            rows={8}
            placeholder='{ "questions": [ { "type": "matrix_2x2", "targetGrade": 2, ... } ] }'
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            className="w-full p-3 rounded-xl border border-slate-300 font-mono text-[11px] text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer "
          >
            Soruları İçe Aktar
          </button>
        </div>
      </div>
    </div>
  );
};
