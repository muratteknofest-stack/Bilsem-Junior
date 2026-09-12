import React, { useState } from 'react';
import { UserProfile, DailyStudyPlan } from '../types';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  Target,
  CheckCircle2,
  Sparkles,
  Zap,
  Play,
  Flame,
  Clock,
  ChevronRight,
  RotateCcw,
  Trophy,
  Award,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyGoalProgressCardProps {
  user: UserProfile;
  dailyPlan?: DailyStudyPlan;
  onUserUpdate: (updatedUser: UserProfile) => void;
  onStartPractice: () => void;
  className?: string;
}

type GoalMode = 'questions' | 'sessions' | 'minutes';

export const DailyGoalProgressCard: React.FC<DailyGoalProgressCardProps> = ({
  user,
  dailyPlan,
  onUserUpdate,
  onStartPractice,
  className = '',
}) => {
  const [goalMode, setGoalMode] = useState<GoalMode>('questions');
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);

  // Targets and actuals
  const targetQuestions = user.dailyGoalQuestions || dailyPlan?.targetQuestions || 10;
  const completedQuestions = user.todayQuestionsSolved ?? dailyPlan?.completedQuestions ?? 7;

  const targetSessions = user.dailyGoalSessions || 2;
  const completedSessions = user.todaySessionsCompleted ?? 1;

  const targetMinutes = user.dailyGoalMinutes || 15;
  const completedMinutes = user.todayMinutesSpent || 8;

  // Active metrics based on selected mode
  let currentVal = completedQuestions;
  let maxVal = targetQuestions;
  let unitLabel = 'Soru';
  let unitPlural = 'Soru';

  if (goalMode === 'sessions') {
    currentVal = completedSessions;
    maxVal = targetSessions;
    unitLabel = 'Seans';
    unitPlural = 'Seans';
  } else if (goalMode === 'minutes') {
    currentVal = completedMinutes;
    maxVal = targetMinutes;
    unitLabel = 'Dakika';
    unitPlural = 'dk';
  }

  const rawPercent = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;
  const progressPercent = Math.min(100, Math.round(rawPercent));
  const isGoalReached = currentVal >= maxVal;
  const remaining = Math.max(0, maxVal - currentVal);

  // Quick goal presets for custom target adjustments
  const QUESTION_PRESETS = [5, 10, 15, 20];
  const SESSION_PRESETS = [1, 2, 3, 4];

  // Handler for setting a new target
  const handleSetTarget = (newTarget: number) => {
    sound.playClick();
    let updated: UserProfile;
    if (goalMode === 'questions') {
      updated = dataService.updateDailyGoal(newTarget, undefined, undefined);
    } else if (goalMode === 'sessions') {
      updated = dataService.updateDailyGoal(undefined, undefined, newTarget);
    } else {
      updated = dataService.updateDailyGoal(undefined, newTarget, undefined);
    }
    onUserUpdate(updated);
    setBannerFeedback(`Günlük hedef ${newTarget} ${unitPlural} olarak güncellendi!`);
    setTimeout(() => setBannerFeedback(null), 3000);
  };

  // Quick test: simulate +1 question
  const handleSimulateQuestion = () => {
    sound.playSuccess();
    const updated = dataService.incrementTodayQuestions(1);
    onUserUpdate(updated);

    if ((updated.todayQuestionsSolved || 0) >= (updated.dailyGoalQuestions || 10)) {
      sound.playLevelUp();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b'],
        });
      } catch {}
      setBannerFeedback('Tebrikler! Günlük soru hedefini tamamladın! 🎉 (+50 XP Kazandın)');
    } else {
      setBannerFeedback('+1 Soru tamamlandı! Harika ilerliyorsun.');
    }
    setTimeout(() => setBannerFeedback(null), 3500);
  };

  // Quick test: simulate +1 session
  const handleSimulateSession = () => {
    sound.playSuccess();
    const updated = dataService.incrementTodaySessions(1);
    onUserUpdate(updated);

    if ((updated.todaySessionsCompleted || 0) >= (updated.dailyGoalSessions || 2)) {
      sound.playLevelUp();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
        });
      } catch {}
      setBannerFeedback('Tebrikler! Günlük seans hedefini tamamladın! 🎉');
    } else {
      setBannerFeedback('+1 Seans tamamlandı! Süper odak.');
    }
    setTimeout(() => setBannerFeedback(null), 3500);
  };

  // Milestone points along the progress bar
  const milestones = [
    { percent: 0, label: 'Başlangıç', icon: '🌱' },
    { percent: 30, label: 'Isınma', icon: '⚡' },
    { percent: 70, label: 'Odak', icon: '🔥' },
    { percent: 100, label: 'Zirve & Başarı', icon: '👑' },
  ];

  return (
    <div
      id="daily-goal-progress-card"
      className={`bg-white rounded-xl border-2 border-emerald-200/90  p-5 sm:p-7 relative overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-gradient-to-br from-emerald-100/50 via-teal-100/30 to-indigo-100/20 rounded-full blur-3xl pointer-events-none" />

      {/* Feedback banner */}
      {bannerFeedback && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bannerFeedback}</span>
          </div>
          <button
            onClick={() => setBannerFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold cursor-pointer"
          >
            Tamam
          </button>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div className="flex items-center gap-3.5">
          {/* Target Icon with Animated Badge */}
          <div className="relative shrink-0">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center  transition-all ${
                isGoalReached
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 '
                  : 'bg-gradient-to-tr from-teal-600 to-indigo-600 '
              }`}
            >
              {isGoalReached ? (
                <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-bounce" />
              ) : (
                <Target className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-pulse" />
              )}
            </div>
            {isGoalReached && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-amber-950 font-extrabold ">
                ★
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                Günlük Hedef İlerlemesi
              </h2>
              {isGoalReached ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Hedef Tamamlandı! 🎉</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-extrabold border border-teal-200 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-teal-600" />
                  <span>%{progressPercent} Tamamlandı</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isGoalReached ? (
                <span className="text-emerald-700 font-medium">
                  Harika bir disiplin! Bugünün hedefini başarıyla tamamlayarak zihnini geliştirdin.
                </span>
              ) : (
                <>
                  Bugün{' '}
                  <strong className="text-slate-800">
                    {currentVal} / {maxVal} {unitPlural}
                  </strong>{' '}
                  tamamladın. Hedefe ulaşmak için son{' '}
                  <strong className="text-emerald-700 font-extrabold">
                    {remaining} {unitPlural}
                  </strong>{' '}
                  kaldı!
                </>
              )}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs: Soru / Seans / Süre */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-zinc-200 self-start sm:self-auto shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setGoalMode('questions');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              goalMode === 'questions'
                ? 'bg-white text-emerald-800  border border-zinc-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Soru Hedefi</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setGoalMode('sessions');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              goalMode === 'sessions'
                ? 'bg-white text-emerald-800  border border-zinc-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Seans</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setGoalMode('minutes');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              goalMode === 'minutes'
                ? 'bg-white text-emerald-800  border border-zinc-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Süre</span>
          </button>
        </div>
      </div>

      {/* Main Visual Progress Bar Section */}
      <div className="py-6 space-y-4">
        {/* Metric Summary Counters */}
        <div className="flex flex-col xs:flex-row items-start xs:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              {goalMode === 'questions'
                ? 'Çözülen Soru Sayısı'
                : goalMode === 'sessions'
                ? 'Tamamlanan Pratik Seansı'
                : 'Pratikte Geçirilen Süre'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-['Outfit',sans-serif]">
                {currentVal}
              </span>
              <span className="text-lg font-bold text-slate-400">
                / {maxVal} {unitPlural}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 block">Tamamlanma Oranı</span>
              <span
                className={`text-lg sm:text-xl font-extrabold ${
                  isGoalReached ? 'text-emerald-600' : 'text-teal-700'
                }`}
              >
                %{progressPercent}
              </span>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                isGoalReached
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-teal-50 text-teal-700 border border-teal-200'
              }`}
            >
              {isGoalReached ? '✓' : `${remaining}`}
            </div>
          </div>
        </div>

        {/* Large Interactive Progress Bar Track */}
        <div className="relative pt-3 pb-1">
          {/* Progress track background */}
          <div className="w-full h-5 sm:h-6 bg-slate-100 rounded-full overflow-hidden p-1  border border-zinc-200/80 relative">
            {/* Gradient progress fill */}
            <div
              className={`h-full rounded-full transition-all duration-700 relative overflow-hidden  ${
                isGoalReached
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                  : 'bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500'
              }`}
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            >
              {/* Subtle dynamic gloss wave */}
              <div className="absolute inset-0 bg-white/25 rounded-full opacity-60 animate-pulse" />
            </div>
          </div>

          {/* Milestone Checkpoints positioned along the track */}
          <div className="relative flex justify-between mt-3 px-1 text-[11px] font-bold text-slate-500">
            {milestones.map((m) => {
              const reached = progressPercent >= m.percent;
              return (
                <div
                  key={m.percent}
                  className="flex flex-col items-center text-center group cursor-default"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 border-2 transition-all ${
                      reached
                        ? 'bg-emerald-500 border-white text-white  ring-2 ring-emerald-400/30'
                        : 'bg-slate-100 border-slate-300 text-slate-400'
                    }`}
                  >
                    {reached ? (
                      <span className="text-[10px] font-extrabold">✓</span>
                    ) : (
                      <span>{m.icon}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      reached ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {m.label}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">%{m.percent}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Goal Target Adjustment / Settings Strip */}
      <div className="pt-4 border-t border-zinc-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Hedef Belirle:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(goalMode === 'questions' ? QUESTION_PRESETS : SESSION_PRESETS).map((preset) => {
                const isSelected = maxVal === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => handleSetTarget(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white '
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset} {unitPlural}
                    {preset === (goalMode === 'questions' ? 10 : 2) && (
                      <span className="ml-1 text-[9px] opacity-80">(Önerilen)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Motivation or Reward Note */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Günlük hedefi tamamlamak +50 XP bonus kazandırır!</span>
          </div>
        </div>
      </div>

      {/* Interactive Footer Quick Actions */}
      <div className="mt-5 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Düzenli günlük hedefler BİLSEM sınavındaki hız ve odaklanmanı pekiştirir.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Quick Simulate Buttons for immediate testing / demo feedback */}
          <button
            onClick={goalMode === 'sessions' ? handleSimulateSession : handleSimulateQuestion}
            title="Hedefi test etmek için +1 ilerleme ekle"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Test: +1 {unitLabel} Ekle</span>
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onStartPractice}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm   transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isGoalReached ? 'Hedefi Aştın, Pratiğe Devam Et' : 'Hedefi Tamamlamak İçin Başla'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
