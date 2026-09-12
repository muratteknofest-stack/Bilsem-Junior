import React, { useState, useEffect, useMemo } from 'react';
import {
  CognitiveCategory,
  WeeklyCategoryChallenge,
  WeeklyChallengesState,
  Achievement,
  UserProfile,
} from '../types';
import { weeklyChallengesService } from '../services/weekly-challenges-service';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Award,
  Sparkles,
  Flame,
  Clock,
  Target,
  CheckCircle2,
  ArrowRight,
  Play,
  Zap,
  Brain,
  Compass,
  Layers,
  Lightbulb,
  Activity,
  Check,
  ChevronRight,
  Star,
  Info,
  X,
  Shield,
  RotateCcw,
} from 'lucide-react';

interface WeeklyChallengesViewProps {
  user?: UserProfile | null;
  onStartPractice: (category?: string) => void;
  onUserUpdate?: (updatedUser: UserProfile) => void;
  onNavigateToBadges?: () => void;
}

type FilterOption = 'all' | 'in_progress' | 'completed' | 'claimed';

const CATEGORY_STYLE_CONFIG: Record<
  string,
  {
    color: string;
    bgLight: string;
    borderLight: string;
    gradient: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pattern: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderLight: 'border-emerald-200/80 dark:border-emerald-800/40',
    gradient: 'from-emerald-500 to-teal-400',
    icon: Sparkles,
  },
  matrix: {
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderLight: 'border-indigo-200/80 dark:border-indigo-800/40',
    gradient: 'from-indigo-500 to-violet-500',
    icon: Layers,
  },
  attention: {
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    borderLight: 'border-amber-200/80 dark:border-amber-800/40',
    gradient: 'from-amber-500 to-orange-400',
    icon: Target,
  },
  spatial: {
    color: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-50 dark:bg-purple-950/30',
    borderLight: 'border-purple-200/80 dark:border-purple-800/40',
    gradient: 'from-purple-500 to-fuchsia-500',
    icon: Compass,
  },
  logic: {
    color: 'text-sky-600 dark:text-sky-400',
    bgLight: 'bg-sky-50 dark:bg-sky-950/30',
    borderLight: 'border-sky-200/80 dark:border-sky-800/40',
    gradient: 'from-sky-500 to-blue-500',
    icon: Lightbulb,
  },
  memory: {
    color: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    borderLight: 'border-rose-200/80 dark:border-rose-800/40',
    gradient: 'from-rose-500 to-pink-500',
    icon: Brain,
  },
  visual_perception: {
    color: 'text-teal-600 dark:text-teal-400',
    bgLight: 'bg-teal-50 dark:bg-teal-950/30',
    borderLight: 'border-teal-200/80 dark:border-teal-800/40',
    gradient: 'from-teal-500 to-cyan-500',
    icon: Activity,
  },
  numerical: {
    color: 'text-violet-600 dark:text-violet-400',
    bgLight: 'bg-violet-50 dark:bg-violet-950/30',
    borderLight: 'border-violet-200/80 dark:border-violet-800/40',
    gradient: 'from-violet-500 to-indigo-500',
    icon: Zap,
  },
};

export const WeeklyChallengesView: React.FC<WeeklyChallengesViewProps> = ({
  user,
  onStartPractice,
  onUserUpdate,
  onNavigateToBadges,
}) => {
  const [challengesState, setChallengesState] = useState<WeeklyChallengesState>(() =>
    weeklyChallengesService.getWeeklyChallenges()
  );
  const [filter, setFilter] = useState<FilterOption>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<WeeklyCategoryChallenge | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeXpGain, setActiveXpGain] = useState<{ amount: number; title: string } | null>(null);

  // Sync state whenever user changes or on mount
  useEffect(() => {
    setChallengesState(weeklyChallengesService.getWeeklyChallenges());
  }, [user?.totalQuestionsSolved]);

  const showCelebrationToast = (msg: string, isGrand: boolean = false) => {
    setToastMessage(msg);
    sound.playLevelUp();
    try {
      confetti({
        particleCount: isGrand ? 160 : 80,
        spread: isGrand ? 120 : 70,
        origin: { y: 0.55 },
        colors: isGrand
          ? ['#f59e0b', '#ec4899', '#6366f1', '#3b82f6', '#10b981']
          : ['#f59e0b', '#10b981', '#6366f1'],
      });
    } catch {}
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleClaimReward = (challengeId: string) => {
    sound.playSuccess();
    const result = weeklyChallengesService.claimChallengeReward(challengeId);
    if (result.success) {
      setChallengesState(result.state);
      if (onUserUpdate) onUserUpdate(result.user);
      setActiveXpGain({ amount: result.xpAwarded, title: result.badge.title });
      setTimeout(() => setActiveXpGain(null), 2500);
      showCelebrationToast(`🎉 "${result.badge.title}" rozeti kazanıldı ve +${result.xpAwarded} XP eklendi!`);
    }
  };

  const handleClaimGrandChallenge = () => {
    sound.playComboMilestone(10);
    const result = weeklyChallengesService.claimGrandChallengeReward();
    if (result.success) {
      setChallengesState(result.state);
      if (onUserUpdate) onUserUpdate(result.user);
      setActiveXpGain({ amount: result.xpAwarded, title: result.badge.title });
      setTimeout(() => setActiveXpGain(null), 3000);
      showCelebrationToast(`🏆 Efsanevi "${result.badge.title}" rozeti kazanıldı ve +${result.xpAwarded} XP eklendi!`, true);
    }
  };

  const handleSimulateQuestion = (challengeId: string) => {
    sound.playClick();
    const result = weeklyChallengesService.simulateSolveQuestion(challengeId);
    setChallengesState(result.state);
    const updatedUser = dataService.getCurrentUser();
    if (onUserUpdate) onUserUpdate(updatedUser);

    if (result.newlyCompleted) {
      showCelebrationToast(`🎯 Tebrikler! "${result.challenge.title}" meydan okumasını tamamladın! Şimdi rozetini al.`);
    }
  };

  const handleInstantComplete = (challengeId: string) => {
    sound.playSuccess();
    const result = weeklyChallengesService.instantCompleteChallenge(challengeId);
    setChallengesState(result.state);
    showCelebrationToast(`✨ "${result.challenge.categoryName}" hedefi tamamlandı! Rozetini alabilirsin.`);
  };

  const filteredChallenges = useMemo(() => {
    return challengesState.challenges.filter((c) => {
      if (filter === 'in_progress') return !c.isCompleted;
      if (filter === 'completed') return c.isCompleted;
      if (filter === 'claimed') return c.rewardClaimed;
      return true;
    });
  }, [challengesState.challenges, filter]);

  const grand = challengesState.grandChallenge;
  const grandPct = Math.min(
    100,
    Math.round((challengesState.completedChallengesCount / grand.requiredCategoriesCount) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] p-4 rounded-2xl bg-zinc-900 text-white shadow-2xl border border-amber-400/50 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <p className="text-xs sm:text-sm font-bold leading-snug">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating XP Gain Badge Popup */}
      <AnimatePresence>
        {activeXpGain && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: -40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-10 right-10 z-50 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black shadow-xl border-2 border-white flex items-center gap-3"
          >
            <span className="text-2xl animate-bounce">⚡</span>
            <div>
              <p className="text-sm font-bold text-zinc-900/80">{activeXpGain.title}</p>
              <p className="text-lg font-black tracking-tight">+{activeXpGain.amount} XP Eklendi!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Weekly Hero Header */}
      <header className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        {/* Background decorative ambient lights */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-indigo-500" />
                {challengesState.weekNumber}. Hafta Bilişsel Görevleri
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {challengesState.weeklyStreakWeeks} Hafta Kesintisiz Seri
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white font-['Outfit',sans-serif] tracking-tight">
              Haftalık Bilişsel Meydan Okuma & Rozetler
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
              Her bilişsel zeka alanında belirlenen hedef soru sayısını tamamlayarak koleksiyonuna özel haftalık başarı rozetlerini kat ve zihinsel sınırlarını zorla.
            </p>
          </div>

          {/* Countdown timer pill */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center gap-4 shrink-0 shadow-inner">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Haftanın Bitimine Kalan</p>
              <p className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif]">
                {challengesState.daysRemaining} gün {challengesState.hoursRemaining} saat
              </p>
              <p className="text-[10px] text-zinc-400">{challengesState.startDateFormatted} - {challengesState.endDateFormatted}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Grand Challenge Spotlight Banner */}
      <section className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-zinc-900 text-white shadow-md relative overflow-hidden border border-indigo-700/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-indigo-500 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-[22px] bg-zinc-950 flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
                  {grand.badgeReward.badgeIcon}
                </div>
              </div>
              <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 border border-white shadow-xs">
                Elmas
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-300" /> Haftanın Zirve Başarısı
                </span>
                <span className="text-[11px] font-black bg-white/10 px-2 py-0.5 rounded-full text-indigo-200">
                  +500 XP Ödül
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] tracking-tight">
                {grand.title}
              </h2>
              <p className="text-xs text-indigo-200/90 max-w-xl leading-relaxed">
                {grand.description}
              </p>
            </div>
          </div>

          <div className="lg:w-80 shrink-0 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-indigo-200">Kategori Tamamlama</span>
              <span className="text-amber-300 font-black">
                {challengesState.completedChallengesCount} / {grand.requiredCategoriesCount} Alan (%{grandPct})
              </span>
            </div>

            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${grandPct}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-sm"
              />
            </div>

            {grand.isCompleted ? (
              grand.rewardClaimed ? (
                <div className="py-2.5 px-4 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Elmas Şampiyonluk Rozeti Alındı!
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClaimGrandChallenge}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-zinc-950 text-xs sm:text-sm font-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                >
                  <Sparkles className="w-4 h-4 fill-zinc-950" />
                  Elmas Rozeti & 500 XP'yi Al!
                </motion.button>
              )
            ) : (
              <p className="text-[11px] text-center text-indigo-300/80">
                {grand.requiredCategoriesCount - challengesState.completedChallengesCount} kategori daha tamamla ve elmas rozeti kap!
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Filter Tabs & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl w-fit border border-zinc-200/80 dark:border-zinc-700/80">
          <button
            onClick={() => {
              sound.playClick();
              setFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Tüm Alanlar ({challengesState.challenges.length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFilter('in_progress');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'in_progress'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Devam Edenler ({challengesState.challenges.filter((c) => !c.isCompleted).length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFilter('completed');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'completed'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Tamamlanan ({challengesState.challenges.filter((c) => c.isCompleted).length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFilter('claimed');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'claimed'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Kazanılan Rozetler ({challengesState.challenges.filter((c) => c.rewardClaimed).length})
          </button>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-3">
          <span>Toplam Çözülen: <strong className="text-zinc-900 dark:text-zinc-100">{challengesState.totalQuestionsCompleted} Soru</strong></span>
          <span>•</span>
          <span>Rozet Kazanımı: <strong className="text-indigo-600 dark:text-indigo-400">{challengesState.completedChallengesCount} / 8</strong></span>
        </div>
      </div>

      {/* Grid of 8 Cognitive Category Challenge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredChallenges.map((challenge, index) => {
          const cfg = CATEGORY_STYLE_CONFIG[challenge.category] || {
            color: 'text-indigo-600 dark:text-indigo-400',
            bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
            borderLight: 'border-indigo-200/80 dark:border-indigo-800/40',
            gradient: 'from-indigo-500 to-purple-500',
            icon: Sparkles,
          };
          const CategoryIcon = cfg.icon;
          const progressPct = Math.min(
            100,
            Math.round((challenge.completedQuestions / challenge.targetQuestions) * 100)
          );
          const remaining = Math.max(0, challenge.targetQuestions - challenge.completedQuestions);

          return (
            <motion.article
              key={challenge.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className={`p-6 rounded-3xl bg-white dark:bg-zinc-900 border transition-all flex flex-col justify-between group shadow-sm ${
                challenge.isCompleted
                  ? challenge.rewardClaimed
                    ? 'border-emerald-200 dark:border-emerald-900/40'
                    : 'border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-300/40'
                  : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              <div>
                {/* Header of card */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl ${cfg.bgLight} ${cfg.color} border ${cfg.borderLight} flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}
                    >
                      <CategoryIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 block">
                        {challenge.categoryName}
                      </span>
                      <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif] leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {challenge.title}
                      </h3>
                    </div>
                  </div>

                  {/* Badge reward preview pill */}
                  <button
                    onClick={() => {
                      sound.playClick();
                      setSelectedChallenge(challenge);
                    }}
                    title="Ödül Rozetini İncele"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    <span className="text-base leading-none">{challenge.badgeReward.badgeIcon}</span>
                    <span className="text-[11px] truncate max-w-[80px] sm:max-w-none">{challenge.badgeReward.title}</span>
                  </button>
                </div>

                {/* Description & Pedagogy Note */}
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
                  {challenge.description}
                </p>

                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800 mb-4 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Bilişsel Katkı:</strong> {challenge.pedagogicalObjective}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {challenge.completedQuestions} / {challenge.targetQuestions} Soru Çözüldü
                    </span>
                    <span className={challenge.isCompleted ? 'text-emerald-600 font-extrabold' : 'text-zinc-700 dark:text-zinc-300'}>
                      %{progressPct}
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${
                        challenge.isCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : `bg-gradient-to-r ${cfg.gradient}`
                      }`}
                    />
                  </div>

                  {!challenge.isCompleted && (
                    <p className="text-[10px] text-zinc-400 text-right font-medium">
                      Rozet için son <strong>{remaining} soru</strong> kaldı
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                {challenge.isCompleted ? (
                  challenge.rewardClaimed ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Rozet Koleksiyonunda</span>
                      </div>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setSelectedChallenge(challenge);
                        }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Rozeti İncele
                      </button>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleClaimReward(challenge.id)}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-zinc-950 text-xs sm:text-sm font-black shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                    >
                      <Sparkles className="w-4 h-4 fill-zinc-950" />
                      Rozeti Al & +{challenge.bonusXP} XP Topla!
                    </motion.button>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onStartPractice(challenge.category);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Pratik Yap ({challenge.categoryName})
                    </button>

                    {/* Quick Simulator / Advance button */}
                    <button
                      onClick={() => handleSimulateQuestion(challenge.id)}
                      title="1 soru çözmüş gibi ilerlet (Hızlı Test)"
                      className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>+1 Test</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-5 relative"
            >
              <button
                onClick={() => setSelectedChallenge(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-3 pt-2">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-indigo-500 p-1 shadow-xl">
                  <div className="w-full h-full rounded-[22px] bg-white dark:bg-zinc-900 flex items-center justify-center text-5xl shadow-inner">
                    {selectedChallenge.badgeReward.badgeIcon}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 inline-block">
                    {selectedChallenge.badgeReward.rarityLabel}
                  </span>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white font-['Outfit',sans-serif]">
                    {selectedChallenge.badgeReward.title}
                  </h3>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Kategori: {selectedChallenge.categoryName}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
                <div>
                  <strong className="text-zinc-900 dark:text-white block mb-0.5">Kazanma Kriteri:</strong>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Bu hafta içinde {selectedChallenge.targetQuestions} adet {selectedChallenge.categoryName} sorusu çözmek.
                  </p>
                </div>

                <div>
                  <strong className="text-zinc-900 dark:text-white block mb-0.5">Pedagojik Zeka Katkısı:</strong>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {selectedChallenge.badgeReward.pedagogyBenefit}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[11px]">
                  <span className="text-zinc-400">Ödül Değeri</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">+{selectedChallenge.bonusXP} XP</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedChallenge.isCompleted && !selectedChallenge.rewardClaimed ? (
                  <button
                    onClick={() => {
                      handleClaimReward(selectedChallenge.id);
                      setSelectedChallenge(null);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-md"
                  >
                    Rozeti Al & XP Topla
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setSelectedChallenge(null);
                      onStartPractice(selectedChallenge.category);
                    }}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Bu Kategoride Soru Çöz
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
