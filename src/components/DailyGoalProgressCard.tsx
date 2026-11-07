import React, { useState } from 'react';
import { UserProfile, DailyStudyPlan } from '../types';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  Target,
  CheckCircle2,
  Zap,
  Play,
  Flame,
  Clock,
  Trophy,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

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
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);

  const targetQuestions = user.dailyGoalQuestions || dailyPlan?.targetQuestions || 10;
  const completedQuestions = user.todayQuestionsSolved ?? dailyPlan?.completedQuestions ?? 0;

  const targetSessions = user.dailyGoalSessions || 2;
  const completedSessions = user.todaySessionsCompleted ?? 0;

  const targetMinutes = user.dailyGoalMinutes || 15;
  const completedMinutes = user.todayMinutesSpent || 0;

  let currentVal = completedQuestions;
  let maxVal = targetQuestions;
  let unitPlural = 'Soru';

  if (goalMode === 'sessions') {
    currentVal = completedSessions;
    maxVal = targetSessions;
    unitPlural = 'Seans';
  } else if (goalMode === 'minutes') {
    currentVal = completedMinutes;
    maxVal = targetMinutes;
    unitPlural = 'dk';
  }

  const rawPercent = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;
  const progressPercent = Math.min(100, Math.round(rawPercent));
  const isGoalReached = currentVal >= maxVal;
  const remaining = Math.max(0, maxVal - currentVal);

  const QUESTION_PRESETS = [5, 10, 15, 20];
  const SESSION_PRESETS = [1, 2, 3, 4];

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

  const milestones = [
    { percent: 0, label: 'Başlangıç' },
    { percent: 30, label: 'Isınma' },
    { percent: 70, label: 'Odak' },
    { percent: 100, label: 'Tamamlandı' },
  ];

  return (
    <div
      id="daily-goal-progress-card"
      className={`rounded-2xl border border-[#e2e8f0] bg-white p-5 sm:p-6 shadow-xs dark:border-[#49425a] dark:bg-[#262339] relative overflow-hidden transition-colors ${className}`}
    >
      {bannerFeedback && (
        <div
          role="status"
          className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 tabular-nums"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{bannerFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-white text-xs font-semibold cursor-pointer"
          >
            Tamam
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e2e8f0] dark:border-[#49425a]">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center border ${
                isGoalReached
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400'
                  : 'bg-indigo-50 border-indigo-200/80 text-indigo-600 dark:bg-indigo-500/15 dark:border-indigo-500/30 dark:text-indigo-400'
              }`}
            >
              {isGoalReached ? (
                <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : (
                <Target className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#1d2036] dark:text-[#f9f7ff]">
                Günlük Hedef İlerlemesi
              </h2>
              {isGoalReached ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 text-[11px] font-bold border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Hedef Tamamlandı</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#1d2036] dark:bg-white/10 dark:text-[#f9f7ff] text-[11px] font-bold border border-[#e2e8f0] dark:border-[#49425a] flex items-center gap-1 tabular-nums">
                  <TrendingUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>%{progressPercent} Tamamlandı</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#52566b] dark:text-[#cac4d5] mt-1 tabular-nums">
              {isGoalReached ? (
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                  Harika bir disiplin! Bugünün hedefini başarıyla tamamlayarak zihnini geliştirdin.
                </span>
              ) : (
                <>
                  Bugün{' '}
                  <strong className="text-[#1d2036] dark:text-[#f9f7ff]">
                    {currentVal} / {maxVal} {unitPlural}
                  </strong>{' '}
                  tamamladın. Hedefe ulaşmak için son{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {remaining} {unitPlural}
                  </strong>{' '}
                  kaldı.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#f8f7f3] dark:bg-white/5 p-1 rounded-xl border border-[#e2e8f0] dark:border-[#49425a] self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setGoalMode('questions');
            }}
            className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              goalMode === 'questions'
                ? 'bg-white text-[#1d2036] border border-[#e2e8f0] shadow-2xs dark:bg-[#262339] dark:text-[#f9f7ff] dark:border-[#49425a]'
                : 'text-[#52566b] hover:text-[#1d2036] dark:text-[#cac4d5] dark:hover:text-[#f9f7ff]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Soru Hedefi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setGoalMode('sessions');
            }}
            className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              goalMode === 'sessions'
                ? 'bg-white text-[#1d2036] border border-[#e2e8f0] shadow-2xs dark:bg-[#262339] dark:text-[#f9f7ff] dark:border-[#49425a]'
                : 'text-[#52566b] hover:text-[#1d2036] dark:text-[#cac4d5] dark:hover:text-[#f9f7ff]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Seans</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setGoalMode('minutes');
            }}
            className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              goalMode === 'minutes'
                ? 'bg-white text-[#1d2036] border border-[#e2e8f0] shadow-2xs dark:bg-[#262339] dark:text-[#f9f7ff] dark:border-[#49425a]'
                : 'text-[#52566b] hover:text-[#1d2036] dark:text-[#cac4d5] dark:hover:text-[#f9f7ff]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Süre</span>
          </button>
        </div>
      </div>

      <div className="py-5 space-y-4">
        <div className="flex flex-col xs:flex-row items-start xs:items-end justify-between gap-2 tabular-nums">
          <div>
            <span className="text-xs font-semibold text-[#52566b] dark:text-[#cac4d5] block">
              {goalMode === 'questions'
                ? 'Çözülen Soru Sayısı'
                : goalMode === 'sessions'
                ? 'Tamamlanan Pratik Seansı'
                : 'Pratikte Geçirilen Süre'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-bold text-[#1d2036] dark:text-[#f9f7ff] tracking-tight">
                {currentVal}
              </span>
              <span className="text-base font-semibold text-[#52566b] dark:text-[#cac4d5]">
                / {maxVal} {unitPlural}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <span className="text-xs font-semibold text-[#52566b] dark:text-[#cac4d5] block">
                Tamamlanma Oranı
              </span>
              <span
                className={`text-lg sm:text-xl font-bold ${
                  isGoalReached
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                %{progressPercent}
              </span>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs tabular-nums ${
                isGoalReached
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-[#f8f7f3] text-[#1d2036] border border-[#e2e8f0] dark:bg-white/10 dark:text-[#f9f7ff] dark:border-[#49425a]'
              }`}
            >
              {isGoalReached ? '✓' : `${remaining}`}
            </div>
          </div>
        </div>

        <div className="relative pt-2 pb-1">
          <div className="w-full h-3.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden border border-[#e2e8f0] dark:border-[#49425a]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isGoalReached
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-indigo-600 to-teal-500'
              }`}
              style={{ width: `${progressPercent > 0 ? Math.max(4, progressPercent) : 0}%` }}
            />
          </div>

          <div className="relative flex justify-between mt-3 px-0.5 text-[11px] font-semibold text-[#52566b] dark:text-[#cac4d5] tabular-nums">
            {milestones.map((m) => {
              const reached = progressPercent >= m.percent;
              return (
                <div key={m.percent} className="flex flex-col items-center text-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1 border transition-colors ${
                      reached
                        ? 'bg-emerald-500 border-emerald-600 text-white'
                        : 'bg-slate-100 border-[#e2e8f0] text-[#52566b] dark:bg-white/5 dark:border-[#49425a] dark:text-[#cac4d5]'
                    }`}
                  >
                    {reached ? '✓' : '·'}
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      reached ? 'text-[#1d2036] dark:text-[#f9f7ff]' : 'text-[#52566b] dark:text-[#cac4d5]'
                    }`}
                  >
                    {m.label}
                  </span>
                  <span className="text-[9px] opacity-80">%{m.percent}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {goalMode !== 'minutes' && (
        <div className="pt-4 border-t border-[#e2e8f0] dark:border-[#49425a]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#52566b] dark:text-[#cac4d5]">
                Hedef Belirle:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
                {(goalMode === 'questions' ? QUESTION_PRESETS : SESSION_PRESETS).map((preset) => {
                  const isSelected = maxVal === preset;
                  return (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => handleSetTarget(preset)}
                      className={`min-h-9 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-[#f8f7f3] border-[#e2e8f0] text-[#1d2036] hover:bg-slate-100 dark:bg-white/5 dark:border-[#49425a] dark:text-[#f9f7ff] dark:hover:bg-white/10'
                      }`}
                    >
                      {preset} {unitPlural}
                      {preset === (goalMode === 'questions' ? 10 : 2) && (
                        <span className="ml-1 text-[10px] opacity-80">(Önerilen)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#52566b] dark:text-[#cac4d5] tabular-nums">
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Günlük hedefi tamamlamak +50 XP bonus kazandırır.</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-[#e2e8f0] dark:border-[#49425a] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#52566b] dark:text-[#cac4d5]">
          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
          <span>Düzenli günlük hedefler BİLSEM hazırlığındaki hız ve odaklanmanı pekiştirir.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onStartPractice}
            className="flex-1 sm:flex-none min-h-11 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isGoalReached ? 'Hedefi Aştın, Pratiğe Devam Et' : 'Hedefi Tamamlamak İçin Başla'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
