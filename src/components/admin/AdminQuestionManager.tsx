import React, { useState } from 'react';
import { BaseQuestion, CognitiveCategory, DifficultyLevel, ALL_COGNITIVE_CATEGORIES, COGNITIVE_CATEGORY_LABELS, DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../../types';
import { GRADE_CONFIGS, ALL_GRADES } from '../../features/questions/grade-config';
import { AdminStudentPracticeSimulatorModal } from './AdminStudentPracticeSimulatorModal';
import { useAdminQuestionState } from './hooks/useAdminQuestionState';
import { AdminQuestionCard } from './views/AdminQuestionCard';
import { AdminQuestionTableRow } from './views/AdminQuestionTableRow';
import { CreateQuestionModal } from './modals/CreateQuestionModal';
import { EditQuestionModal } from './modals/EditQuestionModal';
import { QuestionDetailModal } from './modals/QuestionDetailModal';
import { ImportQuestionModal } from './modals/ImportQuestionModal';
import { CATEGORY_ICONS, CATEGORY_COLORS } from './constants';
import { sound } from '../../lib/sound';
import {
  Plus, Search, Grid, Layers, Download, Upload, RotateCcw, CheckCircle2,
  X, HelpCircle, Sliders, Brain, CheckSquare, Square, ArrowUpDown, BarChart3, Zap, GraduationCap, Target, Trash2
} from 'lucide-react';

interface AdminQuestionManagerProps {
  onInspectInStudio: (type: any, seed: number, difficulty: any) => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToBulkGenerator?: () => void;
}

export const AdminQuestionManager: React.FC<AdminQuestionManagerProps> = ({
  onInspectInStudio,
  onNavigateToAnalytics,
  onNavigateToBulkGenerator,
}) => {
  const {
    questions,
    selectedGrade, setSelectedGrade,
    selectedCategory, setSelectedCategory,
    selectedDifficulty, setSelectedDifficulty,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    sortBy, setSortBy,
    selectedQuestionIds, setSelectedQuestionIds,
    notification, showNotification,
    stats, categoryDistribution, displayQuestions,
    refreshQuestions,
    toggleSelectQuestion, handleSelectAllVisible,
    handleBatchDelete, handleBatchDuplicate, handleBatchExport,
    handleClearFilters, handleDelete, handleDuplicate,
    handleExportJSON, handleResetDefaults,
    hasActiveFilters
  } = useAdminQuestionState();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [activeQuestion, setActiveQuestion] = useState<BaseQuestion | null>(null);
  const [activeSimulatorQuestion, setActiveSimulatorQuestion] = useState<BaseQuestion | null>(null);

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 p-5 sm:p-6 space-y-5">
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

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToAnalytics && (
              <button
                onClick={() => {
                  sound.playClick();
                  onNavigateToAnalytics();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
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
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
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

            <button
              onClick={async () => {
                if (window.confirm('DİKKAT: Supabase veritabanındaki TÜM SORULARI kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
                  try {
                    sound.playClick();
                    const { clearAllFirestoreQuestions } = await import('../../services/question-publishing-service');
                    const count = await clearAllFirestoreQuestions();
                    alert(`Başarılı: Supabase veritabanından ${count} adet soru kalıcı olarak silindi. Sayfa yenileniyor...`);
                    window.location.reload();
                  } catch (e: any) {
                    alert('Hata: ' + e.message);
                  }
                }
              }}
              className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ml-4"
              title="Supabase'deki tüm soruları kalıcı olarak siler"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Veritabanını Sıfırla (Tehlikeli)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-200">
          <div className="p-3 rounded-xl bg-slate-50 border border-zinc-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Soru</span>
            <div className="text-xl font-black text-slate-900">{stats.total} Soru</div>
            <span className="text-[10px] font-bold text-purple-700">Havuzda Kayıtlı</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">1. Sınıf Düzeyi</span>
            <div className="text-xl font-black text-emerald-950">{stats.byGrade[1]} Soru</div>
            <span className="text-[10px] font-bold text-emerald-700">Temel Algı (Zorluk 1-2)</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/70">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">2. Sınıf Düzeyi</span>
            <div className="text-xl font-black text-blue-950">{stats.byGrade[2]} Soru</div>
            <span className="text-[10px] font-bold text-blue-700">Kural Keşfi (Zorluk 2-3)</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200/70">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">3 & 4. Sınıf Düzeyi</span>
            <div className="text-xl font-black text-purple-950">{stats.byGrade[3] + stats.byGrade[4]} Soru</div>
            <span className="text-[10px] font-bold text-purple-700">Analoji & 3x3 Matris</span>
          </div>
        </div>

        {categoryDistribution.length > 0 && (
          <div className="pt-3 border-t border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>Bilişsel Kategori Dağılımı ({questions.length} Soru)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">8 BİLSEM Yetenek Alanı</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
              {categoryDistribution.map((item) => (
                <div
                  key={item.category}
                  style={{ width: `${item.pct}%` }}
                  className={`${item.color.bg.replace('50', '500')} hover:opacity-80 transition-all cursor-pointer`}
                  title={`${item.label}: ${item.count} soru (%${item.pct})`}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {categoryDistribution.map((item) => (
                <button
                  key={item.category}
                  onClick={() => {
                    sound.playClick();
                    setSelectedCategory(selectedCategory === item.category ? 'all' : (item.category as CognitiveCategory));
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all ${
                    selectedCategory === item.category
                      ? `${item.color.pill} ring-2 ring-purple-400`
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

      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
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
              onClick={() => { sound.playClick(); setSelectedGrade('all'); }}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                selectedGrade === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
              }`}
            >
              <span>Tüm Sınıflar</span>
              <span className="block text-[10px] opacity-75 font-normal">{stats.total} Soru</span>
            </button>
            {ALL_GRADES.map((g) => {
              const cfg = GRADE_CONFIGS[g];
              const isSelected = selectedGrade === g;
              return (
                <button
                  key={g}
                  onClick={() => { sound.playClick(); setSelectedGrade(g); }}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center flex flex-col items-center gap-0.5 ${
                    isSelected ? `${cfg.badgeBg} ${cfg.badgeColor} border-current scale-102` : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{cfg.icon}</span>
                    <span>{cfg.title}</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80">{stats.byGrade[g]} Soru • {cfg.timeLimitSeconds}sn</span>
                </button>
              );
            })}
          </div>
        </div>

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
              onClick={() => { sound.playClick(); setSelectedCategory('all'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedCategory === 'all' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
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
                  onClick={() => { sound.playClick(); setSelectedCategory(cat); }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected ? `${theme.bg} ${theme.text} border-current` : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{COGNITIVE_CATEGORY_LABELS[cat]}</span>
                  <span className="text-[10px] opacity-75 font-mono px-1 rounded-sm bg-black/5">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-zinc-200">
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span>Zorluk Derecesi Filtresi</span>
            </label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => { sound.playClick(); setSelectedDifficulty('all'); }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedDifficulty === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-zinc-200'
                }`}
              >
                Tümü
              </button>
              {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => {
                const isSelected = selectedDifficulty === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => { sound.playClick(); setSelectedDifficulty(lvl); }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected ? `${DIFFICULTY_COLORS[lvl]} border-current` : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                    }`}
                  >
                    Seviye {lvl}: {DIFFICULTY_LABELS[lvl]}
                  </button>
                );
              })}
            </div>
          </div>

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

          <div className="md:col-span-2 space-y-1.5 flex flex-col justify-end">
            <div className="flex rounded-xl bg-slate-100 p-1 border border-zinc-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  viewMode === 'cards' ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Kart</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  viewMode === 'table' ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tablo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
          {displayQuestions.length > 0 && (
            <button
              onClick={handleSelectAllVisible}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
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

      {selectedQuestionIds.size > 0 && (
        <div className="sticky bottom-4 z-40 bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center">
              {selectedQuestionIds.size}
            </span>
            <span className="text-xs sm:text-sm font-bold">Soru Seçildi</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              <option value="" disabled>Seçilenleri Sınıfa Çoğalt...</option>
              {ALL_GRADES.map((g) => (
                <option key={g} value={g}>{g}. Sınıfa Kopyala</option>
              ))}
            </select>

            <button
              onClick={handleBatchExport}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Seçilenleri İndir (JSON)</span>
            </button>

            <button
              onClick={handleBatchDelete}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Seçilenleri Sil ({selectedQuestionIds.size})</span>
            </button>

            <button
              onClick={() => setSelectedQuestionIds(new Set())}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

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
            className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Soru Oluştur</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayQuestions.map((q) => (
            <AdminQuestionCard
              key={q.id}
              q={q}
              isSelected={selectedQuestionIds.has(q.id)}
              toggleSelectQuestion={toggleSelectQuestion}
              setActiveQuestion={setActiveQuestion}
              setIsDetailModalOpen={setIsDetailModalOpen}
              setActiveSimulatorQuestion={setActiveSimulatorQuestion}
              setIsEditModalOpen={setIsEditModalOpen}
              onInspectInStudio={onInspectInStudio}
              handleDuplicate={handleDuplicate}
              handleDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
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
                {displayQuestions.map((q) => (
                  <AdminQuestionTableRow
                    key={q.id}
                    q={q}
                    isSelected={selectedQuestionIds.has(q.id)}
                    toggleSelectQuestion={toggleSelectQuestion}
                    setActiveQuestion={setActiveQuestion}
                    setIsDetailModalOpen={setIsDetailModalOpen}
                    setActiveSimulatorQuestion={setActiveSimulatorQuestion}
                    setIsEditModalOpen={setIsEditModalOpen}
                    onInspectInStudio={onInspectInStudio}
                    handleDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {isImportModalOpen && (
        <ImportQuestionModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={(count, rejectedCount) => {
            setIsImportModalOpen(false);
            refreshQuestions();
            const suffix = rejectedCount && rejectedCount > 0 ? ` (${rejectedCount} geçersiz soru elendi)` : '';
            showNotification(`${count} adet soru başarıyla havuza içe aktarıldı${suffix}!`);
          }}
        />
      )}

      {activeSimulatorQuestion && (
        <AdminStudentPracticeSimulatorModal
          question={activeSimulatorQuestion}
          onClose={() => setActiveSimulatorQuestion(null)}
        />
      )}
    </div>
  );
};
