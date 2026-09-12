import React, { useState } from 'react';
import { MistakeItem, BaseQuestion, CognitiveCategory } from '../types';
import { dataService } from '../services/data-service';
import { generateQuestionByType } from '../features/questions/generators';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { AiHintModal } from './AiHintModal';
import {
  MistakeAnalyticsPieChart,
  CATEGORY_CONFIG,
  QUESTION_TYPE_TO_CATEGORY,
} from './MistakeAnalyticsPieChart';
import { sound } from '../lib/sound';
import {
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  Filter,
  X,
  Lightbulb,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MistakeNotebookViewProps {
  onNavigateHome: () => void;
}

export const MistakeNotebookView: React.FC<MistakeNotebookViewProps> = ({ onNavigateHome }) => {
  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => dataService.getMistakes());
  const [activeRetryMistake, setActiveRetryMistake] = useState<MistakeItem | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<BaseQuestion | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showAiHint, setShowAiHint] = useState(false);
  const [unlockedNotice, setUnlockedNotice] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CognitiveCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  const unresolvedCount = mistakes.filter((m) => !m.resolved).length;
  const resolvedCount = mistakes.filter((m) => m.resolved).length;

  // Filtered mistakes list based on category and status
  const filteredMistakes = mistakes.filter((item) => {
    // Status filter
    if (statusFilter === 'unresolved' && item.resolved) return false;
    if (statusFilter === 'resolved' && !item.resolved) return false;

    // Category filter
    if (selectedCategoryFilter !== 'all') {
      const itemCat: CognitiveCategory =
        item.category || QUESTION_TYPE_TO_CATEGORY[item.questionType] || 'spatial';
      if (itemCat !== selectedCategoryFilter) return false;
    }
    return true;
  });

  const handleClearAllMistakes = () => {
    sound.playLevelUp();
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch {}
    dataService.clearAllMistakes();
    setMistakes(dataService.getMistakes());
    setUnlockedNotice('Tebrikler! Hata defterindeki tüm sorular çözüldü ve "Tertemiz Defter" rozeti kazanıldı! ✨ (+150 XP)');
  };

  const startRetry = (item: MistakeItem) => {
    sound.playClick();
    // Recreate the EXACT same question using its seed & difficulty!
    const q = generateQuestionByType(item.questionType, item.questionSeed, item.difficulty);
    setActiveRetryMistake(item);
    setRetryQuestion(q);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setShowAiHint(false);
  };

  const handleSubmitRetry = () => {
    if (!selectedOptionId || !retryQuestion || !activeRetryMistake || isSubmitted) return;

    const correct = selectedOptionId === retryQuestion.correctOptionId;
    setIsSubmitted(true);
    setIsCorrect(correct);

    if (correct) {
      sound.playSuccess();
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
      // Mark as learned in DataService!
      dataService.resolveMistake(activeRetryMistake.id);
      dataService.addXP(25); // Bonus XP for learning from a mistake
      dataService.recordQuestionSolved(true);
      setMistakes(dataService.getMistakes());
    } else {
      sound.playError();
    }
  };

  const closeRetry = () => {
    setActiveRetryMistake(null);
    setRetryQuestion(null);
    setShowAiHint(false);
  };

  // RETRY MODAL/VIEW
  if (activeRetryMistake && retryQuestion) {
    return (
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-12 space-y-4">
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-zinc-200 ">
          <button
            onClick={closeRetry}
            className="flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Hata Defterine Dön</span>
          </button>
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
            Tekrar Deneme Modu
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 sm:p-6 border border-zinc-200  space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-zinc-200 pb-3">
            <div className="text-center sm:text-left space-y-0.5 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {retryQuestion.prompt}
              </h2>
              {retryQuestion.secondaryPrompt && (
                <p className="text-xs text-slate-500">
                  {retryQuestion.secondaryPrompt}
                </p>
              )}
            </div>

            {!isSubmitted && (
              <button
                onClick={() => {
                  sound.playClick();
                  setShowAiHint(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs  transition-all cursor-pointer active:scale-95 shrink-0"
                title="Takıldığında yapay zeka destekli adım adım ipucu al"
              >
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>💡 İpucu Al (AI)</span>
              </button>
            )}
          </div>

          <div className="py-2">
            <QuestionRenderer question={retryQuestion} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {retryQuestion.options.map((opt) => (
              <OptionRenderer
                key={opt.id}
                option={opt}
                isSelected={selectedOptionId === opt.id}
                onSelect={() => {
                  if (!isSubmitted) {
                    sound.playClick();
                    setSelectedOptionId(opt.id);
                  }
                }}
                disabled={isSubmitted}
                showCorrect={isSubmitted}
                isCorrectOption={opt.id === retryQuestion.correctOptionId}
              />
            ))}
          </div>

          {!isSubmitted ? (
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowAiHint(true);
                }}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300/80 text-amber-950 font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98  shrink-0"
              >
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Takıldım, İpucu Ver!</span>
              </button>

              <button
                onClick={handleSubmitRetry}
                disabled={!selectedOptionId}
                className={`flex-1 w-full py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedOptionId
                    ? 'bg-amber-600 hover:bg-amber-700 text-white  active:scale-98'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>{selectedOptionId ? 'Cevabı Doğrula' : 'Bir Seçenek İşaretle'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div
                className={`p-4 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2 ${
                  isCorrect
                    ? 'bg-emerald-100 text-emerald-950 border-2 border-emerald-300'
                    : 'bg-amber-100 text-amber-950 border-2 border-amber-300'
                }`}
              >
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Harika! Hatandan öğrendin ve soruyu çözdün! (+25 XP)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-amber-600" />
                    <span>Çözüm açıklamasını inceleyip tekrar deneyebilirsin.</span>
                  </>
                )}
              </div>

              <VisualExplanationOverlay
                explanation={retryQuestion.explanation}
                correctOptionId={retryQuestion.correctOptionId}
              />

              <button
                onClick={closeRetry}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm  transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Hata Defterine Dön</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Step-by-Step Hint Modal for Retry Question */}
        {retryQuestion && (
          <AiHintModal
            question={retryQuestion}
            isOpen={showAiHint}
            onClose={() => setShowAiHint(false)}
          />
        )}
      </div>
    );
  }

  // LIST OF MISTAKES
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-600" />
              <span>Hata Defterim</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Yanlış yaptığın sorular buraya kaydedilir. Tekrar çözerek kalıcı öğren!
            </p>
          </div>
        </div>

        {/* Counters and Clear Action */}
        <div className="flex flex-wrap items-center gap-2">
          {unresolvedCount > 0 && (
            <button
              onClick={handleClearAllMistakes}
              className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white  transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Tüm hataları temizle ve Tertemiz Defter rozetini anında kazan"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Defteri Boşalt & Rozet Aç</span>
            </button>
          )}
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {unresolvedCount} Bekleyen
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            {resolvedCount} Öğrenildi
          </span>
        </div>
      </div>

      {/* Unlocked Toast/Notice Banner */}
      {unlockedNotice && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs sm:text-sm  flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white animate-bounce shrink-0" />
            <span>{unlockedNotice}</span>
          </div>
          <button
            onClick={() => setUnlockedNotice(null)}
            className="p-1 rounded-lg bg-black/10 hover:bg-black/20 text-white text-xs font-bold cursor-pointer"
          >
            Tamam
          </button>
        </div>
      )}

      {/* Clean Notebook Celebration Banner when unresolvedCount is 0 */}
      {unresolvedCount === 0 && mistakes.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-300 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✨</span>
            <div>
              <h4 className="font-extrabold text-sm text-emerald-900 flex items-center gap-1.5">
                <span>Hata Defterin Tamamen Boş ve Tertemiz!</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-black">
                  Rozet Açıldı
                </span>
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Yanlış yaptığın tüm soruları başarıyla tekrar öğrendin ve "Tertemiz Defter" rozetini koleksiyonuna ekledin!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mistake Topics & Skill Analytics Pie Chart */}
      {mistakes.length > 0 && (
        <MistakeAnalyticsPieChart
          mistakes={mistakes}
          selectedCategoryFilter={selectedCategoryFilter}
          onSelectCategoryFilter={setSelectedCategoryFilter}
        />
      )}

      {/* Filter and Section Header for Questions List */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            Hata Defterindeki Sorular
          </h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-zinc-200">
            {filteredMistakes.length} Soru
          </span>
          {selectedCategoryFilter !== 'all' && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
              <span>{CATEGORY_CONFIG[selectedCategoryFilter]?.name}</span>
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className="hover:text-indigo-950 cursor-pointer ml-1"
                title="Filtreyi kaldır"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <button
            onClick={() => {
              sound.playClick();
              setStatusFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white '
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tümü ({mistakes.length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setStatusFilter('unresolved');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'unresolved'
                ? 'bg-amber-600 text-white '
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Bekleyenler ({unresolvedCount})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setStatusFilter('resolved');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white '
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Öğrenilenler ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {mistakes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-zinc-200  space-y-3">
          <Award className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Henüz Kayıtlı Hatan Yok!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Pratik yaparken yanlış cevapladığın sorular burada toplanır ve tekrar çözmene imkan tanır.
          </p>
        </div>
      ) : filteredMistakes.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-zinc-200  space-y-3">
          <Filter className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">Seçilen Filtrede Soru Bulunamadı</h4>
          <p className="text-xs text-slate-500">
            Filtreleri sıfırlayarak tüm soruları görebilirsin.
          </p>
          <button
            onClick={() => {
              setSelectedCategoryFilter('all');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tüm Soruları Göster
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMistakes.map((item) => {
            const itemCat: CognitiveCategory =
              item.category || QUESTION_TYPE_TO_CATEGORY[item.questionType] || 'spatial';
            const catConfig = CATEGORY_CONFIG[itemCat] || CATEGORY_CONFIG.spatial;

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  item.resolved
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : 'bg-white border-zinc-200  hover:border-amber-300'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category badge */}
                    <button
                      onClick={() => setSelectedCategoryFilter(itemCat)}
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 ${catConfig.bgLight} ${catConfig.borderColor}`}
                      title={`${catConfig.name} kategorisine göre filtrele`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: catConfig.color }}
                      />
                      <span>{catConfig.name}</span>
                    </button>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                      {item.questionType?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Sv. {item.difficulty} • {item.createdAt}
                    </span>
                    {item.resolved && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Öğrenildi</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-2">
                    {item.prompt}
                  </h4>
                </div>

                <button
                  onClick={() => startRetry(item)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                    item.resolved
                      ? 'bg-white text-slate-700 hover:bg-slate-50'
                      : 'bg-amber-500 hover:bg-amber-600 text-white  active:scale-98'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{item.resolved ? 'Tekrar Göz At' : 'Tekrar Dene'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
