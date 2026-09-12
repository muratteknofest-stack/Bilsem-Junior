import React, { useState, useEffect } from 'react';
import { Achievement, UserProfile, MistakeItem } from '../types';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  Award,
  Trophy,
  Sparkles,
  CheckCircle2,
  Lock,
  BookCheck,
  BookOpen,
  Zap,
  Crown,
  Star,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Compass,
  X,
  Flame,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BadgesSectionProps {
  user: UserProfile;
  mistakes: MistakeItem[];
  onUserUpdate: (user: UserProfile) => void;
  onOpenMistakes: () => void;
  onStartPractice: () => void;
  onNavigate?: (route: any) => void;
}

type FilterCategory = 'all' | 'questions' | 'weekly' | 'mistakes' | 'unlocked';

export const BadgesSection: React.FC<BadgesSectionProps> = ({
  user,
  mistakes,
  onUserUpdate,
  onOpenMistakes,
  onStartPractice,
  onNavigate,
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>(() =>
    dataService.getAchievements()
  );
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync achievements whenever user or mistakes change
  useEffect(() => {
    setAchievements(dataService.getAchievements());
  }, [user.totalQuestionsSolved, user.resolvedMistakesCount, mistakes]);

  const unresolvedCount = mistakes.filter((m) => !m.resolved).length;
  const totalQuestions = user.totalQuestionsSolved ?? 24;

  // Question and mistake specific badges
  const questionBadgeIds = ['first_step', 'questions_10', 'questions_25', 'questions_50', 'questions_100'];
  const mistakeBadgeIds = ['error_hunter', 'clean_notebook', 'mistakes_solved_5'];

  const filteredBadges = achievements.filter((badge) => {
    if (filter === 'questions') return questionBadgeIds.includes(badge.id);
    if (filter === 'weekly') return badge.category === 'weekly' || badge.id.includes('weekly') || badge.id.includes('pattern') || badge.id.includes('matrix');
    if (filter === 'mistakes') return mistakeBadgeIds.includes(badge.id);
    if (filter === 'unlocked') return badge.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // Next question badge in progress
  const nextQuestionBadge = achievements.find(
    (a) => questionBadgeIds.includes(a.id) && !a.unlocked
  );

  // Clean notebook badge status
  const cleanNotebookBadge = achievements.find((a) => a.id === 'clean_notebook');

  const showCelebrationToast = (msg: string) => {
    setToastMessage(msg);
    sound.playLevelUp();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899'],
      });
    } catch {}
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Quick Action: Simulate 1 Question Solved to advance badges immediately
  const handleQuickSolveQuestion = () => {
    sound.playSuccess();
    const result = dataService.recordQuestionSolved(true);
    onUserUpdate(result.user);
    setAchievements(dataService.getAchievements());

    if (result.newlyUnlocked.length > 0) {
      const names = result.newlyUnlocked.map((a) => `"${a.title}"`).join(', ');
      showCelebrationToast(`🎉 Tebrikler! ${names} rozetini kazandın!`);
    } else {
      showCelebrationToast(`Harika! +1 soru kaydedildi. Toplam: ${result.totalSolved} soru.`);
    }
  };

  // Quick Action: Clear/Empty Mistakes Notebook to unlock 'clean_notebook'
  const handleClearNotebook = () => {
    sound.playSuccess();
    const result = dataService.clearAllMistakes();
    onUserUpdate(result.user);
    setAchievements(dataService.getAchievements());

    if (result.newlyUnlocked.length > 0) {
      const names = result.newlyUnlocked.map((a) => `"${a.title}"`).join(', ');
      showCelebrationToast(`✨ Harika! Hata defteri boşaltıldı ve ${names} rozetini kazandın!`);
    } else {
      showCelebrationToast('✨ Hata defterindeki tüm sorular çözüldü olarak işaretlendi!');
    }
  };

  const getBadgeVisual = (item: Achievement) => {
    if (item.badgeIcon) return item.badgeIcon;
    switch (item.id) {
      case 'first_step':
        return '🌟';
      case 'questions_10':
        return '🥉';
      case 'questions_25':
        return '🥈';
      case 'questions_50':
        return '🥇';
      case 'questions_100':
        return '👑';
      case 'error_hunter':
        return '🎯';
      case 'clean_notebook':
        return '✨';
      case 'mistakes_solved_5':
        return '🛡️';
      default:
        return '🏆';
    }
  };

  const getBadgeRarityColor = (item: Achievement) => {
    if (item.id === 'questions_100') {
      return {
        border: 'border-amber-400',
        bg: 'from-amber-500/10 to-yellow-500/10',
        ring: 'ring-amber-400/50',
        tagBg: 'bg-amber-100 text-amber-900 border-amber-300',
        tier: 'Efsanevi',
      };
    }
    if (item.id === 'clean_notebook' || item.id === 'questions_50') {
      return {
        border: 'border-purple-300',
        bg: 'from-purple-500/10 to-indigo-500/10',
        ring: 'ring-purple-400/50',
        tagBg: 'bg-purple-100 text-purple-900 border-purple-300',
        tier: 'Epik',
      };
    }
    if (item.id === 'questions_25' || item.id === 'mistakes_solved_5') {
      return {
        border: 'border-blue-300',
        bg: 'from-blue-500/10 to-cyan-500/10',
        ring: 'ring-blue-400/50',
        tagBg: 'bg-blue-100 text-blue-900 border-blue-300',
        tier: 'Nadir',
      };
    }
    return {
      border: 'border-emerald-300',
      bg: 'from-emerald-500/10 to-teal-500/10',
      ring: 'ring-emerald-400/50',
      tagBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      tier: 'Standart',
    };
  };

  return (
    <div
      id="badges-section"
      className="bg-white rounded-xl border-2 border-amber-200/80  p-5 sm:p-6 space-y-5 relative overflow-hidden transition-all"
    >
      {/* Background ambient gradient */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-gradient-to-bl from-amber-100/50 to-orange-50/20 rounded-full blur-2xl pointer-events-none" />

      {/* Toast Notification for Unlocks */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-amber-500 text-white font-extrabold text-xs sm:text-sm  flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white animate-bounce shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg bg-black/10 hover:bg-black/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center   text-white">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                Zeka Rozetleri & Başarılar
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold border border-amber-200">
                {unlockedCount} / {achievements.length} Açıldı
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Soru maratonunu tamamla ve hata defterini boşaltarak rozet koleksiyonunu zenginleştir!
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-zinc-200 text-slate-700 font-bold flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>{totalQuestions} Soru Çözüldü</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 ${
              unresolvedCount === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-orange-50 border-orange-200 text-orange-800'
            }`}
          >
            {unresolvedCount === 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Defter Boş & Tertemiz ✨</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                <span>{unresolvedCount} Hata Bekliyor</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Target Spotlight Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Spotlight 1: Question Milestone */}
        {nextQuestionBadge ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getBadgeVisual(nextQuestionBadge)}</span>
              <div>
                <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">
                  Sıradaki Soru Rozeti
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {nextQuestionBadge.title} ({nextQuestionBadge.maxProgress} Soru)
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-600 font-semibold">
                  <span>{totalQuestions} / {nextQuestionBadge.maxProgress} soru</span>
                  <span>•</span>
                  <span className="text-indigo-600">+{nextQuestionBadge.rewardXP || 100} XP</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleQuickSolveQuestion}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold  transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
              title="1 soru çözerek rozet ilerlemesi kaydet"
            >
              <span>+1 Soru Çöz</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <span className="text-2xl">👑</span>
            <div>
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase">Zirvedesin!</span>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Tüm Soru Rozetleri Açıldı!</h4>
              <p className="text-[11px] text-slate-600">100 soruluk büyük maratonu tamamladın.</p>
            </div>
          </div>
        )}

        {/* Spotlight 2: Mistakes Notebook Milestone */}
        {cleanNotebookBadge && !cleanNotebookBadge.unlocked ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getBadgeVisual(cleanNotebookBadge)}</span>
              <div>
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                  Hata Defteri Hedefi
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {cleanNotebookBadge.title} (Defteri Boşalt)
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-600 font-semibold">
                  <span>{unresolvedCount} hata bekliyor</span>
                  <span>•</span>
                  <span className="text-amber-700 font-bold">+{cleanNotebookBadge.rewardXP || 150} XP</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleClearNotebook}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold  transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                title="Hataları temizle ve rozeti anında kazan"
              >
                <span>Defteri Boşalt</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                  Hata Defteri Başarısı
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Tertemiz Defter Rozeti Kazanıldı!
                </h4>
                <p className="text-[11px] text-slate-600">Tüm hatalarından öğrendin ve defteri temizledin.</p>
              </div>
            </div>
            <button
              onClick={onOpenMistakes}
              className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Deftere Git
            </button>
          </div>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => {
            sound.playClick();
            setFilter('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-900 text-white '
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          ⭐ Tümü ({achievements.length})
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setFilter('questions');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'questions'
              ? 'bg-blue-600 text-white '
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Soru Sayısı (1, 10, 25, 50, 100)</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setFilter('weekly');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'weekly'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Haftalık Görevler & Bilişsel</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setFilter('mistakes');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'mistakes'
              ? 'bg-amber-600 text-white '
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <BookCheck className="w-3.5 h-3.5" />
          <span>Hata Defteri & Temizlik</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setFilter('unlocked');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'unlocked'
              ? 'bg-emerald-600 text-white '
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Kazanılanlar ({unlockedCount})</span>
        </button>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredBadges.map((item) => {
          const rarity = getBadgeRarityColor(item);
          const percent = Math.min(100, Math.round((item.progress / item.maxProgress) * 100));

          return (
            <div
              key={item.id}
              onClick={() => {
                sound.playClick();
                setSelectedBadge(item);
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between text-left ${
                item.unlocked
                  ? `bg-gradient-to-b ${rarity.bg} ${rarity.border}  hover: hover:-translate-y-0.5`
                  : 'bg-slate-50/70 border-zinc-200/80 opacity-75 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              {/* Badge Top: Emblem & Status */}
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl  transition-transform group-hover:scale-110 ${
                    item.unlocked
                      ? 'bg-white border-2 border-amber-300 '
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {getBadgeVisual(item)}
                </div>

                <div className="flex flex-col items-end gap-1">
                  {item.unlocked ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Kazanıldı</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>%{percent}</span>
                    </span>
                  )}

                  {item.rewardXP && (
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                      +{item.rewardXP} XP
                    </span>
                  )}
                </div>
              </div>

              {/* Badge Center: Title & Short Desc */}
              <div className="space-y-0.5 mb-2">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Badge Bottom: Progress Bar */}
              <div className="pt-1.5 border-t border-zinc-200">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                  <span>İlerleme</span>
                  <span className={item.unlocked ? 'text-emerald-700' : 'text-slate-700'}>
                    {item.progress} / {item.maxProgress}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.unlocked
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white w-full max-w-md rounded-xl  border border-zinc-200 overflow-hidden flex flex-col animate-scaleUp p-6 space-y-4 text-center relative"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge Big Icon */}
            <div className="w-20 h-20 rounded-xl bg-amber-50 border-2 border-amber-300 mx-auto flex items-center justify-center text-4xl  ">
              {getBadgeVisual(selectedBadge)}
            </div>

            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide block">
                {selectedBadge.category === 'questions'
                  ? 'Soru Sayısı Başarısı'
                  : selectedBadge.category === 'special'
                  ? 'Hata Defteri & Özel Başarı'
                  : 'BİLSEM Yetenek Rozeti'}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1 font-['Outfit',sans-serif]">
                {selectedBadge.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                {selectedBadge.description}
              </p>
            </div>

            {/* Status Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-zinc-200 space-y-2 text-left text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Durum:</span>
                {selectedBadge.unlocked ? (
                  <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Kazanıldı ({selectedBadge.unlockedAt || 'Tamamlandı'})</span>
                  </span>
                ) : (
                  <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Devam Ediyor ({selectedBadge.progress} / {selectedBadge.maxProgress})</span>
                  </span>
                )}
              </div>

              {selectedBadge.rewardXP && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Kazanılacak XP:</span>
                  <span className="font-extrabold text-indigo-700">+{selectedBadge.rewardXP} XP</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              {selectedBadge.id.startsWith('questions') && !selectedBadge.unlocked ? (
                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    onStartPractice();
                  }}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs   transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Soru Çözmeye Git</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : selectedBadge.id === 'clean_notebook' && !selectedBadge.unlocked ? (
                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    handleClearNotebook();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs   transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Defteri Boşalt ve Rozeti Al</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs  transition-all cursor-pointer"
                >
                  Tamam, Harika!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
