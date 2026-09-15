import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  SkillMastery,
  MistakeItem,
  AiPersonalizedDailyPlan,
  DailyPlanTask,
  CognitiveCategory,
} from '../types';
import { aiDailyPlanService } from '../services/ai-daily-plan-service';
import { sound } from '../lib/sound';
import {
  Sparkles,
  RefreshCw,
  Volume2,
  Play,
  CheckCircle2,
  Circle,
  Brain,
  Target,
  ArrowRight,
  Zap,
  BookOpen,
  Award,
  Clock,
  Flame,
  AlertCircle,
  Sun,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TodayPersonalizedStudyPlanCardProps {
  user: UserProfile;
  masteries: SkillMastery[];
  mistakes: MistakeItem[];
  onStartPractice: (category?: CognitiveCategory) => void;
  onStartAdaptive: () => void;
  onOpenMistakes: () => void;
  onUserUpdate?: (updatedUser: UserProfile) => void;
}

export const TodayPersonalizedStudyPlanCard: React.FC<TodayPersonalizedStudyPlanCardProps> = ({
  user,
  masteries,
  mistakes,
  onStartPractice,
  onStartAdaptive,
  onOpenMistakes,
  onUserUpdate,
}) => {
  const [plan, setPlan] = useState<AiPersonalizedDailyPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Load or fetch the daily plan on mount or when user changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    aiDailyPlanService
      .getTodayPlan(false)
      .then((p) => {
        if (isMounted) {
          setPlan(p);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading AI daily plan:', err);
        if (isMounted) setLoading(false);
      });

    const unsubscribe = aiDailyPlanService.subscribe((updated) => {
      if (isMounted) setPlan(updated);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [user.id, user.todayQuestionsSolved]);

  const handleRefresh = async () => {
    sound.playClick();
    setIsRefreshing(true);
    try {
      const refreshed = await aiDailyPlanService.refreshPlan();
      setPlan(refreshed);
    } catch (err) {
      console.error('Failed to refresh daily plan:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window) || !plan) return;
    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const narration = `${plan.greetingTitle}. ${plan.morningCoachMessage}. Günün ilham sözü: ${plan.motivationalQuote}. Bugünün hedefi: ${plan.totalTargetQuestions} soru çözerek ${plan.dailySuperpowerTarget} unvanını kazanmak!`;

    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleTaskAction = (task: DailyPlanTask) => {
    sound.playClick();
    if (task.actionType === 'review_mistakes') {
      onOpenMistakes();
    } else if (task.actionType === 'adaptive_session') {
      onStartAdaptive();
    } else {
      onStartPractice(task.category as CognitiveCategory);
    }
  };

  const handleStartAll = () => {
    sound.playLevelUp();
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });
    // Start with the first weak category
    const primaryWeakCategory = plan?.focusWeaknesses[0]?.category;
    onStartPractice(primaryWeakCategory);
  };

  // Calculate overall plan progress
  const targetQuestions = plan?.totalTargetQuestions || user.dailyGoalQuestions || 10;
  const completedQuestions = user.todayQuestionsSolved ?? 0;
  const overallPercent = Math.min(100, Math.round((completedQuestions / targetQuestions) * 100));

  const allTasksCompleted = plan?.tasks.every((t) => t.isCompleted) || overallPercent >= 100;

  return (
    <div
      id="today-personalized-study-plan-card"
      className="relative overflow-hidden rounded-xl bg-white border-2 border-indigo-100   transition-all"
    >
      {/* Top Banner with Morning Theme & AI Badges */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-5 sm:p-6">
        {/* Subtle glow circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center gap-1.5 ">
                <Sun className="w-3.5 h-3.5 fill-amber-950 text-amber-950 animate-spin-slow" />
                <span>Bugünün Çalışma Planı</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-indigo-100 text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {plan?.isAiGenerated ? 'Gemini AI Kişiselleştirdi' : 'Bilişsel Pedagoji Motoru'}
              </span>

              <span className="text-[11px] text-indigo-200/90 font-medium">
                🌅 Her sabah otomatik yenilenir • {plan?.formattedDate || 'Bugün'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight">
              {loading
                ? 'Günün Bilişsel Planı Hazırlanıyor...'
                : plan?.greetingTitle || 'Bugünün Özel Çalışma Programı'}
            </h2>
          </div>

          {/* Quick Actions: Audio Narration & Manual Refresh */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {plan && (
              <button
                type="button"
                onClick={handleSpeak}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSpeaking
                    ? 'bg-amber-400 text-slate-950 animate-pulse '
                    : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                }`}
                title={isSpeaking ? 'Seslendirmeyi Durdur' : 'Sabah Koç Notunu Sesli Dinle'}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isSpeaking ? 'Durdur' : 'Sesli Dinle'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Yapay zeka ile planı yeniden oluştur"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Planı Güncelle</span>
            </button>
          </div>
        </div>

        {/* Morning Coach Note */}
        {plan && !loading && (
          <div className="relative z-10 mt-4 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-start gap-3 text-xs sm:text-sm leading-relaxed text-indigo-50">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 block">
                Yapay Zeka Sabah Koç Notu
              </span>
              <p className="font-medium text-slate-100">{plan.morningCoachMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Yapay Zeka zayıf olduğun konuları ve hata defterini inceliyor...
            </p>
            <p className="text-xs text-slate-400">
              Kişiselleştirilmiş sabah programı oluşturuluyor.
            </p>
          </div>
        ) : !plan ? (
          <div className="py-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Plan oluşturulamadı</p>
            <button
              onClick={handleRefresh}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Tekrar dene
            </button>
          </div>
        ) : (
          <>
            {/* Section 1: Detected Weakness Topics ("Eksik Olduğun Konular") */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                      Bu Sabah Tespit Edilen Eksik Konuların
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Bugünkü antrenman bu alanlardaki netlerini doğrudan yükseltmek için hazırlandı.
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-block text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  Otomatik Bilişsel Analiz
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan.focusWeaknesses.map((weak, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-zinc-200/90 flex flex-col justify-between gap-2.5  hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <strong className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {weak.categoryName}
                        </strong>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          weak.currentMastery < 60
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        %{weak.currentMastery} Ustalık
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {weak.reason}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 text-[11px]">
                      {weak.mistakeCount > 0 ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Hata Defterinde {weak.mistakeCount} soru bekliyor
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pratikle ustalığı artır
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onStartPractice(weak.category)}
                        className="text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Şimdi Güçlendir</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Step-by-Step Daily Tasks ("Günün Görevleri") */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                      Günün 3 Adımlı Görev Seti
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Görevleri sırayla tamamla, ekstra XP kazan ve serini koru!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    {plan.tasks.filter((t) => t.isCompleted).length} / {plan.tasks.length} Görev
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {plan.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      task.isCompleted
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-white hover:bg-slate-50 border-zinc-200 text-slate-900 '
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5
                            className={`text-xs sm:text-sm font-extrabold ${
                              task.isCompleted ? 'line-through text-emerald-800' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </h5>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            +{task.rewardXP} XP
                          </span>
                          {task.priority === 'high' && !task.isCompleted && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
                              Öncelikli
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">{task.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200">
                      <div className="text-right">
                        <span className="text-xs font-extrabold block text-slate-700">
                          {task.completedCount} / {task.targetCount}
                        </span>
                        <span className="text-[10px] text-slate-400">Tamamlandı</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTaskAction(task)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0 ${
                          task.isCompleted
                            ? 'bg-emerald-200/80 hover:bg-emerald-300/80 text-emerald-900'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white  '
                        }`}
                      >
                        <span>
                          {task.isCompleted
                            ? 'Tekrar Et'
                            : task.actionType === 'review_mistakes'
                            ? 'Hataları Aç'
                            : 'Şimdi Başla'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Overall Daily Progress & Main Action Bar */}
            <div className="pt-2 border-t border-zinc-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Progress and Superpower Badge */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Bugünün Bilişsel Hedefi: {plan.dailySuperpowerTarget}</span>
                  </span>
                  <span className="text-emerald-700">
                    {completedQuestions} / {targetQuestions} Soru (%{overallPercent})
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-zinc-200">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
              </div>

              {/* Big CTA Button */}
              <button
                type="button"
                onClick={handleStartAll}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-extrabold text-sm   active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {allTasksCompleted ? 'Plana Ekstra Antrenman Yap' : 'Günün Planına Başla (10 Soru)'}
                </span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
