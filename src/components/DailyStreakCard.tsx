import React, { useState } from 'react';
import { UserProfile, StreakMilestone, BaseQuestion } from '../types';
import { dataService, STREAK_MILESTONES } from '../services/data-service';
import { sound } from '../lib/sound';
import { generateQuestionByType } from '../features/questions/generators';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import {
  Flame,
  Shield,
  Award,
  Trophy,
  Crown,
  Sparkles,
  CheckCircle2,
  Gift,
  ArrowRight,
  Zap,
  RotateCcw,
  Calendar,
  ChevronRight,
  X,
  Brain,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyStreakCardProps {
  user: UserProfile;
  onUserUpdate: (updatedUser: UserProfile) => void;
  onStartPractice: () => void;
  onOpenDetailsModal: () => void;
}

const WEEKDAYS = [
  { key: 'mon', short: 'Pzt', full: 'Pazartesi' },
  { key: 'tue', short: 'Sal', full: 'Salı' },
  { key: 'wed', short: 'Çar', full: 'Çarşamba' },
  { key: 'thu', short: 'Per', full: 'Perşembe' },
  { key: 'fri', short: 'Cum', full: 'Cuma' },
  { key: 'sat', short: 'Cmt', full: 'Cumartesi' },
  { key: 'sun', short: 'Paz', full: 'Pazar' },
];

export const DailyStreakCard: React.FC<DailyStreakCardProps> = ({
  user,
  onUserUpdate,
  onStartPractice,
  onOpenDetailsModal,
}) => {
  const [claimingDay, setClaimingDay] = useState<number | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);
  const [showShieldInfo, setShowShieldInfo] = useState(false);
  const [showQuickChallenge, setShowQuickChallenge] = useState(false);
  const [quickQuestion, setQuickQuestion] = useState<BaseQuestion | null>(null);
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(null);
  const [isQuickSubmitted, setIsQuickSubmitted] = useState(false);
  const [quickErrorFeedback, setQuickErrorFeedback] = useState<string | null>(null);

  const streak = user.streak || 0;
  const longestStreak = user.longestStreak || Math.max(streak, 7);
  const streakFreezeCount = user.streakFreezeCount ?? 1;
  const todayPracticed = !!user.todayPracticed;
  const claimedDays = user.claimedStreakDays || [3];

  // XP multiplier based on streak length
  const streakMultiplier =
    streak >= 7 ? '2.0x' : streak >= 5 ? '1.5x' : streak >= 3 ? '1.2x' : '1.0x';

  // Current day index in weekday array (0: Mon, 6: Sun)
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6

  // Weekly streak history (7 booleans)
  const weeklyHistory = user.weeklyStreakHistory || [
    true,
    true,
    true,
    true,
    todayPracticed,
    false,
    false,
  ];

  // Check how many milestones can be claimed right now
  const claimableMilestones = STREAK_MILESTONES.filter(
    (m) => streak >= m.day && !claimedDays.includes(m.day)
  );

  // Next upcoming milestone
  const nextMilestone = STREAK_MILESTONES.find((m) => m.day > streak);

  // Handle claiming a milestone
  const handleClaim = (milestone: StreakMilestone) => {
    setClaimingDay(milestone.day);
    sound.playLevelUp();

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981'],
      });
    } catch {}

    const result = dataService.claimStreakReward(milestone.day);
    if (result.success) {
      setClaimFeedback(`Tebrikler! ${milestone.title} ödülü alındı: +${milestone.xpReward} XP!`);
      setTimeout(() => setClaimFeedback(null), 4000);
      onUserUpdate(result.user);
    }
    setClaimingDay(null);
  };

  // Quick simulate / test day practice
  const handleSimulatePractice = () => {
    sound.playSuccess();
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}
    const updated = dataService.advanceStreakForTesting();
    setClaimFeedback('Harika! Günlük pratik simüle edildi, serin yükseldi!');
    setTimeout(() => setClaimFeedback(null), 3500);
    onUserUpdate(updated);
  };

  const handleStartQuickChallenge = () => {
    sound.playClick();
    const seed = Math.floor(Math.random() * 899999) + 100000;
    // Generate a fun visual odd-one-out question
    const q = generateQuestionByType('odd_one_out', seed, 2);
    setQuickQuestion(q);
    setSelectedQuickOption(null);
    setIsQuickSubmitted(false);
    setQuickErrorFeedback(null);
    setShowQuickChallenge(true);
  };

  const handleSelectQuickOption = (optionId: string) => {
    if (isQuickSubmitted) return;
    sound.playClick();
    setSelectedQuickOption(optionId);
    setQuickErrorFeedback(null);
  };

  const handleSubmitQuickChallenge = () => {
    if (!quickQuestion || !selectedQuickOption || isQuickSubmitted) return;

    if (selectedQuickOption === quickQuestion.correctOptionId) {
      sound.playLevelUp();
      setIsQuickSubmitted(true);
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ef4444', '#10b981', '#6366f1'],
        });
      } catch {}

      // Record streak practice & question solved
      dataService.recordQuestionSolved(true);
      const result = dataService.recordPracticeSession(2);
      onUserUpdate(result.user);
      setClaimFeedback('Muhteşem! Doğru bildin ve bugünkü serini güvenceye aldın! 🔥 (+35 XP)');

      setTimeout(() => {
        setShowQuickChallenge(false);
        setQuickQuestion(null);
      }, 1800);
    } else {
      sound.playError();
      setQuickErrorFeedback('Bu seçenek doğru değil gibi, şekilleri tekrar dikkatle incele!');
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'shield':
        return <Shield className="w-4 h-4 text-emerald-500" />;
      case 'crown':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'trophy':
        return <Trophy className="w-4 h-4 text-purple-500" />;
      default:
        return <Award className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <div
      id="daily-streak-card"
      className="bg-white rounded-xl border-2 border-orange-200/80  p-5 sm:p-7 relative overflow-hidden transition-all duration-300"
    >
      {/* Background soft energetic glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-amber-100/60 to-orange-100/30 rounded-full blur-2xl pointer-events-none" />

      {/* Claim notification banner */}
      {claimFeedback && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{claimFeedback}</span>
          </div>
          <button
            onClick={() => setClaimFeedback(null)}
            className="text-amber-700 hover:text-amber-900 text-xs font-semibold cursor-pointer"
          >
            Tamam
          </button>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div className="flex items-center gap-3.5">
          {/* Animated Flame Icon Container */}
          <div className="relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center  ">
              <Flame className="w-8 h-8 sm:w-9 sm:h-9 text-white fill-white animate-bounce duration-1000" />
            </div>
            {todayPracticed && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                ✓
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                {streak} Günlük Seri!
              </h2>
              {todayPracticed ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                  Bugün Tamamlandı
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-extrabold border border-orange-200 animate-pulse">
                  Pratik Bekleniyor
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-extrabold border border-amber-200 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                <span>{streakMultiplier} XP</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {todayPracticed
                ? 'Harika gidiyorsun! Bugünkü pratikle seriyi güvenceye aldın.'
                : 'Bugün 1 pratik yaparak serini yükselt ve ödüllerini aç!'}
            </p>
          </div>
        </div>

        {/* Action Badges & Shield Status */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Streak Shield Status with click for explanation */}
          <button
            onClick={() => setShowShieldInfo(true)}
            title="Seri Koruma Kalkanı detayını gör"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-zinc-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            <Shield className="w-4 h-4 text-indigo-600 fill-indigo-100" />
            <span>{streakFreezeCount} Kalkan</span>
            <HelpCircle className="w-3 h-3 text-slate-400" />
          </button>

          {/* All Milestones Button */}
          <button
            onClick={onOpenDetailsModal}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Tüm Ödüller</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle: 7-Day Weekly Streak Calendar Track */}
      <div className="py-5 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>Haftalık Seri Takvimi</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            En uzun seri: {longestStreak} gün
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {WEEKDAYS.map((day, idx) => {
            const isCompleted = weeklyHistory[idx];
            const isToday = idx === currentDayOfWeek;
            const isPast = idx < currentDayOfWeek;

            return (
              <div
                key={day.key}
                className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border transition-all ${
                  isToday
                    ? isCompleted
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-950  ring-2 ring-emerald-400/30'
                      : 'border-orange-400 bg-orange-50 text-orange-950  ring-2 ring-orange-400/30'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
                    : isPast
                    ? 'border-zinc-200 bg-slate-50/70 text-slate-400'
                    : 'border-zinc-200 bg-slate-50/40 text-slate-400'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-bold mb-1">
                  {day.short}
                </span>

                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center">
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white ">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  ) : isToday ? (
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-400 flex items-center justify-center">
                      <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
                    </div>
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  )}
                </div>

                <span className="text-[9px] font-semibold mt-1">
                  {isToday ? (isCompleted ? 'Yapıldı' : 'Bugün') : isCompleted ? 'Tamam' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claimable Milestones Notification Box (If any available right now) */}
      {claimableMilestones.length > 0 && (
        <div className="my-2 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white  space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-white animate-bounce" />
              <span className="text-xs sm:text-sm font-extrabold">
                Tebrikler! Açılmış Seri Ödülün Var!
              </span>
            </div>
            <span className="text-[11px] font-bold bg-white/25 px-2 py-0.5 rounded-full">
              {claimableMilestones.length} Ödül Hazır
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {claimableMilestones.map((m) => (
              <button
                key={m.day}
                onClick={() => handleClaim(m)}
                disabled={claimingDay === m.day}
                className="px-3 py-1.5 rounded-xl bg-white text-orange-950 font-extrabold text-xs  hover:bg-amber-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{m.badge}</span>
                <span>{m.day}. Gün Ödülünü Al (+{m.xpReward} XP)</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Milestones Horizon Bar */}
      <div className="pt-4 border-t border-zinc-200">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-indigo-600" />
            <span>Seri Başarı Basamakları</span>
          </div>

          {nextMilestone && (
            <span className="text-[11px] text-orange-600 font-semibold">
              Sıradaki: {nextMilestone.day}. Gün ({nextMilestone.day - streak} gün kaldı)
            </span>
          )}
        </div>

        {/* Milestone Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STREAK_MILESTONES.map((m) => {
            const isUnlocked = streak >= m.day;
            const isClaimed = claimedDays.includes(m.day);

            return (
              <div
                key={m.day}
                className={`p-2.5 rounded-xl border text-center relative flex flex-col justify-between transition-all ${
                  isClaimed
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                    : isUnlocked
                    ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30 '
                    : 'border-zinc-200 bg-slate-50/60 text-slate-500'
                }`}
              >
                <div>
                  <div className="text-xl mb-1">{m.badge}</div>
                  <strong className="block text-xs font-extrabold">{m.day}. Gün</strong>
                  <span className="text-[10px] text-slate-500 block truncate font-medium">
                    {m.title}
                  </span>
                </div>

                <div className="mt-2">
                  {isClaimed ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md inline-block">
                      ✓ Alındı
                    </span>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => handleClaim(m)}
                      className="w-full py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px]  cursor-pointer active:scale-95"
                    >
                      Al (+{m.xpReward} XP)
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      +{m.xpReward} XP
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Quick Actions Footer */}
      <div className="mt-5 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Her gün düzenli 1 pratik zeka puanını ve BİLSEM başarını katlar.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Quick Challenge Button */}
          {!todayPracticed && (
            <button
              onClick={handleStartQuickChallenge}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold  transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>1 Hızlı Soruyla Koru</span>
            </button>
          )}

          {/* Quick Simulate Button for Testing/Demonstrating Streak Progression */}
          <button
            onClick={handleSimulatePractice}
            title="Seriyi 1 gün ilerlet ve pratik yapılmış say (Demo/Test)"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Test:</span> Seriyi İlerlet
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onStartPractice}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm   transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
          >
            <span>{todayPracticed ? 'Pratiğe Devam Et' : 'Bugünün Pratiğini Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick 1-Question Streak Protection Challenge Modal */}
      {showQuickChallenge && quickQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white w-full max-w-lg rounded-xl  border border-zinc-200 overflow-hidden flex flex-col animate-scaleUp"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-5 relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white fill-white animate-bounce" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base font-['Outfit',sans-serif]">
                    Günün Hızlı Seri Isınması
                  </h3>
                  <p className="text-xs text-orange-100">
                    1 doğru cevapla bugünkü serini güvenceye al! (+35 XP)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowQuickChallenge(false)}
                className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                {quickQuestion.prompt}
              </div>

              {/* Visual Display */}
              <div className="max-h-52 overflow-hidden flex items-center justify-center">
                <QuestionRenderer question={quickQuestion} />
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {quickQuestion.options.map((opt) => (
                  <OptionRenderer
                    key={opt.id}
                    option={opt}
                    isSelected={selectedQuickOption === opt.id}
                    onSelect={() => handleSelectQuickOption(opt.id)}
                    disabled={isQuickSubmitted}
                    showCorrect={isQuickSubmitted}
                    isCorrectOption={opt.id === quickQuestion.correctOptionId}
                  />
                ))}
              </div>

              {/* Error feedback if wrong */}
              {quickErrorFeedback && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
                  {quickErrorFeedback}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-zinc-200 flex items-center justify-between">
              <button
                onClick={() => setShowQuickChallenge(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                onClick={handleSubmitQuickChallenge}
                disabled={!selectedQuickOption || isQuickSubmitted}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold  transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedQuickOption && !isQuickSubmitted
                    ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95 '
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Cevabı Gönder</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shield Information Modal */}
      {showShieldInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white w-full max-w-md rounded-xl  border border-zinc-200 overflow-hidden flex flex-col animate-scaleUp p-6 text-center space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 mx-auto flex items-center justify-center">
              <Shield className="w-9 h-9 text-indigo-600 fill-indigo-100 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                Seri Koruma Kalkanı (Streak Freeze)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Şu an <strong className="text-indigo-600 font-extrabold">{streakFreezeCount} adet</strong> aktif kalkanın var.
                Ders yoğunluğu veya seyahat nedeniyle bir gün pratik yapamazsan, kalkan otomatik olarak devreye girer ve serinin sıfırlanmasını engeller!
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <span className="font-bold block">Nasıl yeni kalkan kazanılır?</span>
                3. ve 14. gün seri başarı basamaklarına ulaştığında hediye kalkan kazanırsın!
              </div>
            </div>

            <button
              onClick={() => setShowShieldInfo(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs   transition-colors cursor-pointer"
            >
              Anladım, Harika!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
