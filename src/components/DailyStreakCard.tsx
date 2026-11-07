import React, { useEffect, useState } from 'react';
import { UserProfile, StreakMilestone, BaseQuestion } from '../types';
import { dataService, STREAK_MILESTONES } from '../services/data-service';
import { sound } from '../lib/sound';
import { generateQuestionByType } from '../features/questions/generators';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import {
  Flame,
  Shield,
  Trophy,
  CheckCircle2,
  Gift,
  ArrowRight,
  Zap,
  Calendar,
  ChevronRight,
  X,
  Brain,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import confetti from '../lib/student-confetti';

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

  useEffect(() => {
    if (!showQuickChallenge && !showShieldInfo) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowQuickChallenge(false);
        setShowShieldInfo(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showQuickChallenge, showShieldInfo]);

  const streak = user.streak || 0;
  const longestStreak = user.longestStreak || streak;
  const streakFreezeCount = user.streakFreezeCount ?? 0;
  const todayPracticed = !!user.todayPracticed;
  const claimedDays = user.claimedStreakDays || [];

  const streakMultiplier =
    streak >= 7 ? '2.0x' : streak >= 5 ? '1.5x' : streak >= 3 ? '1.2x' : '1.0x';

  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7;
  const weeklyHistory = user.weeklyStreakHistory || [false, false, false, false, false, false, false];

  const claimableMilestones = STREAK_MILESTONES.filter(
    (m) => streak >= m.day && !claimedDays.includes(m.day)
  );

  const nextMilestone = STREAK_MILESTONES.find((m) => m.day > streak);

  const handleClaim = async (milestone: StreakMilestone) => {
    setClaimingDay(milestone.day);
    sound.playLevelUp();

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981'],
      });
    } catch {}

    let result;
    try {
      result = await dataService.claimStreakReward(milestone.day);
    } catch (err) {
      setClaimFeedback(err instanceof Error ? err.message : 'Ödül kaydedilemedi.');
      setClaimingDay(null);
      return;
    }
    if (result.success) {
      setClaimFeedback(`Tebrikler! ${milestone.title} ödülü alındı: +${milestone.xpReward} XP!`);
      setTimeout(() => setClaimFeedback(null), 4000);
      onUserUpdate(result.user);
    }
    setClaimingDay(null);
  };

  const handleStartQuickChallenge = () => {
    if (!user.id.startsWith('demo_')) {
      onStartPractice();
      return;
    }
    sound.playClick();
    const seed = Math.floor(Math.random() * 899999) + 100000;
    const q = generateQuestionByType('shape_counting', seed, 2);
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
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ef4444', '#10b981', '#6366f1'],
        });
      } catch {}

      dataService.recordQuestionSolved(true);
      const result = dataService.recordPracticeSession(2);
      onUserUpdate(result.user);
      setClaimFeedback('Muhteşem! Doğru bildin ve bugünkü serini güvenceye aldın! (+35 XP)');

      setTimeout(() => {
        setShowQuickChallenge(false);
        setQuickQuestion(null);
      }, 1800);
    } else {
      sound.playError();
      setQuickErrorFeedback('Bu seçenek doğru değil gibi, şekilleri tekrar dikkatle incele!');
    }
  };

  return (
    <div
      id="daily-streak-card"
      className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs dark:border-[#49425a] dark:bg-[#262339] relative overflow-hidden transition-colors"
    >
      {claimFeedback && (
        <div
          role="status"
          className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 tabular-nums"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{claimFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setClaimFeedback(null)}
            className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-white text-xs font-semibold cursor-pointer"
          >
            Tamam
          </button>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3.5 pb-4 border-b border-[#e2e8f0] dark:border-[#49425a]">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/80 dark:bg-orange-500/15 dark:border-orange-500/30 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            {todayPracticed && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#262339] flex items-center justify-center text-[9px] text-white font-bold">
                ✓
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-lg font-bold tracking-tight text-[#1d2036] dark:text-[#f9f7ff] tabular-nums">
                {streak} Günlük Seri
              </h2>
              {todayPracticed ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-500/30">
                  Bugün Tamamlandı
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 text-[11px] font-semibold border border-amber-200 dark:border-amber-500/30">
                  Pratik Bekleniyor
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-[#f8f7f3] text-[#1d2036] dark:bg-white/10 dark:text-[#f9f7ff] text-[11px] font-semibold border border-[#e2e8f0] dark:border-[#49425a] flex items-center gap-1 tabular-nums">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{streakMultiplier} XP</span>
              </span>
            </div>
            <p className="text-xs text-[#52566b] dark:text-[#cac4d5] mt-0.5">
              {todayPracticed
                ? 'Harika gidiyorsun! Bugünkü pratikle seriyi güvenceye aldın.'
                : 'Bugün 1 pratik yaparak serini yükselt ve ödüllerini aç.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setShowShieldInfo(true)}
            title="Seri Koruma Kalkanı detayını gör"
            className="min-h-9 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f8f7f3] hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-[#e2e8f0] dark:border-[#49425a] text-[#1d2036] dark:text-[#f9f7ff] text-xs font-semibold cursor-pointer transition-colors tabular-nums"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{streakFreezeCount} Kalkan</span>
            <HelpCircle className="w-3 h-3 text-[#52566b] dark:text-[#cac4d5]" />
          </button>

          <button
            type="button"
            onClick={onOpenDetailsModal}
            className="min-h-9 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Tüm Ödüller</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="py-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-[#1d2036] dark:text-[#f9f7ff]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>Haftalık Seri Takvimi</span>
          </div>
          <span className="text-[11px] text-[#52566b] dark:text-[#cac4d5] font-medium tabular-nums">
            En uzun seri: {longestStreak} gün
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((day, idx) => {
            const isCompleted = weeklyHistory[idx];
            const isToday = idx === currentDayOfWeek;

            return (
              <div
                key={day.key}
                className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-colors ${
                  isToday
                    ? isCompleted
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                      : 'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-200'
                    : isCompleted
                    ? 'border-emerald-200/80 bg-emerald-50/50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-[#e2e8f0] bg-[#f8f7f3]/70 text-[#52566b] dark:border-[#49425a] dark:bg-white/5 dark:text-[#cac4d5]'
                }`}
              >
                <span className="text-[10px] font-semibold mb-1">{day.short}</span>

                <div className="w-6 h-6 rounded-full flex items-center justify-center">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : isToday ? (
                    <div className="w-5 h-5 rounded-full bg-orange-500/15 border border-orange-400 flex items-center justify-center">
                      <Flame className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                    </div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-white/20" />
                  )}
                </div>

                <span className="text-[9px] font-medium mt-1">
                  {isToday ? (isCompleted ? 'Yapıldı' : 'Bugün') : isCompleted ? 'Tamam' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {claimableMilestones.length > 0 && (
        <div className="my-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30 text-amber-950 dark:text-amber-100 space-y-2 tabular-nums">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-bold">Açılmış Seri Ödülün Hazır</span>
            </div>
            <span className="text-[11px] font-semibold bg-amber-200/60 dark:bg-amber-500/30 px-2 py-0.5 rounded-full">
              {claimableMilestones.length} Ödül
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {claimableMilestones.map((m) => (
              <button
                type="button"
                key={m.day}
                onClick={() => handleClaim(m)}
                disabled={claimingDay === m.day}
                className="min-h-9 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{m.badge}</span>
                <span>{m.day}. Gün Ödülünü Al (+{m.xpReward} XP)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-[#e2e8f0] dark:border-[#49425a]">
        <div className="flex items-center justify-between text-xs font-semibold text-[#1d2036] dark:text-[#f9f7ff] mb-3">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Seri Başarı Basamakları</span>
          </div>

          {nextMilestone && (
            <span className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold tabular-nums">
              Sıradaki: {nextMilestone.day}. Gün ({nextMilestone.day - streak} gün kaldı)
            </span>
          )}
        </div>

        <div className="zp-streak-milestones grid gap-2 tabular-nums">
          {STREAK_MILESTONES.map((m) => {
            const isUnlocked = streak >= m.day;
            const isClaimed = claimedDays.includes(m.day);

            return (
              <div
                key={m.day}
                className={`p-2.5 rounded-xl border text-center relative flex flex-col justify-between transition-colors ${
                  isClaimed
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : isUnlocked
                    ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100'
                    : 'border-[#e2e8f0] bg-[#f8f7f3]/70 text-[#52566b] dark:border-[#49425a] dark:bg-white/5 dark:text-[#cac4d5]'
                }`}
              >
                <div>
                  <div className="text-lg mb-0.5">{m.badge}</div>
                  <strong className="block text-xs font-bold">{m.day}. Gün</strong>
                  <span className="text-[10px] opacity-80 block truncate font-medium">
                    {m.title}
                  </span>
                </div>

                <div className="mt-2">
                  {isClaimed ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded-md inline-block">
                      ✓ Alındı
                    </span>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(m)}
                      className="w-full py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] cursor-pointer"
                    >
                      Al (+{m.xpReward} XP)
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold opacity-75">
                      +{m.xpReward} XP
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bj-streak-actions mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#49425a] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#52566b] dark:text-[#cac4d5]">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Her gün düzenli pratik zeka puanını ve BİLSEM hazırlığını güçlendirir.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {!todayPracticed && (
            <button
              type="button"
              onClick={handleStartQuickChallenge}
              className="min-h-10 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>1 Hızlı Soruyla Koru</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStartPractice}
            className="flex-1 sm:flex-none min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{todayPracticed ? 'Pratiğe Devam Et' : 'Bugünün Pratiğini Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showQuickChallenge && quickQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setShowQuickChallenge(false)}
        >
          <div
            className="bg-white dark:bg-[#262339] w-full max-w-lg rounded-2xl border border-[#e2e8f0] dark:border-[#49425a] shadow-xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-streak-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#e2e8f0] dark:border-[#49425a] p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 id="quick-streak-dialog-title" className="font-bold text-base text-[#1d2036] dark:text-[#f9f7ff]">
                    Günün Hızlı Seri Isınması
                  </h3>
                  <p className="text-xs text-[#52566b] dark:text-[#cac4d5] tabular-nums">
                    1 doğru cevapla bugünkü serini güvenceye al (+35 XP)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQuickChallenge(false)}
                className="w-9 h-9 rounded-xl border border-[#e2e8f0] dark:border-[#49425a] hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-[#52566b] dark:text-[#cac4d5] transition-colors cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs sm:text-sm font-semibold text-[#1d2036] dark:text-[#f9f7ff]">
                {quickQuestion.prompt}
              </div>

              <div className="max-h-52 overflow-hidden flex items-center justify-center">
                <QuestionRenderer question={quickQuestion} />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {quickQuestion.options.map((opt) => (
                  <OptionRenderer
                    question={quickQuestion}
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

              {quickErrorFeedback && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold text-center">
                  {quickErrorFeedback}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#f8f7f3] dark:bg-white/5 border-t border-[#e2e8f0] dark:border-[#49425a] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowQuickChallenge(false)}
                className="min-h-10 px-4 py-2 rounded-xl text-[#52566b] dark:text-[#cac4d5] hover:bg-slate-200/70 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={handleSubmitQuickChallenge}
                disabled={!selectedQuickOption || isQuickSubmitted}
                className={`min-h-10 px-5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  selectedQuickOption && !isQuickSubmitted
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30 cursor-not-allowed'
                }`}
              >
                <span>Cevabı Gönder</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showShieldInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setShowShieldInfo(false)}
        >
          <div
            className="bg-white dark:bg-[#262339] w-full max-w-md rounded-2xl border border-[#e2e8f0] dark:border-[#49425a] shadow-xl overflow-hidden flex flex-col p-6 text-center space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="streak-shield-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/80 dark:border-indigo-500/30 mx-auto flex items-center justify-center">
              <Shield className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div>
              <h3 id="streak-shield-dialog-title" className="text-lg font-bold text-[#1d2036] dark:text-[#f9f7ff]">
                Seri Koruma Kalkanı
              </h3>
              <p className="text-xs sm:text-sm text-[#52566b] dark:text-[#cac4d5] mt-2 leading-relaxed tabular-nums">
                Şu an <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{streakFreezeCount} adet</strong> aktif kalkanın var.
                Ders yoğunluğu veya seyahat nedeniyle bir gün pratik yapamazsan, kalkan otomatik olarak devreye girer ve serinin sıfırlanmasını engeller.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-left flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 tabular-nums">
                <span className="font-bold block">Nasıl yeni kalkan kazanılır?</span>
                3. ve 14. gün seri başarı basamaklarına ulaştığında hediye kalkan kazanırsın.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowShieldInfo(false)}
              className="w-full min-h-11 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


