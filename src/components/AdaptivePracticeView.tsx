import React, { useState, useEffect } from 'react';
import { BaseQuestion, SkillMastery, DifficultyLevel, DIFFICULTY_COLORS } from '../types';
import { generateQuestion } from '../features/questions/generators';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { AiHintModal } from './AiHintModal';
import { ComboStreakIndicator, getComboTier } from './animations/ComboStreakIndicator';
import { ComboBurstOverlay } from './animations/ComboBurstOverlay';
import { StreakFloatingFloater } from './animations/StreakFloatingFloater';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  ArrowLeft,
  Star,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  Lightbulb,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdaptivePracticeViewProps {
  onNavigateHome: () => void;
}

export const AdaptivePracticeView: React.FC<AdaptivePracticeViewProps> = ({ onNavigateHome }) => {
  const [masteries, setMasteries] = useState<SkillMastery[]>(() => dataService.getSkillMasteries());
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>(3);
  const [questionCount, setQuestionCount] = useState(1);
  const [earnedXP, setEarnedXP] = useState(0);
  const [activeMilestoneStreak, setActiveMilestoneStreak] = useState<number | null>(null);
  const [lastMilestoneBonus, setLastMilestoneBonus] = useState(40);
  const [showFloater, setShowFloater] = useState(false);
  const [lastEarnedXP, setLastEarnedXP] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Pick adaptive category based on weights
  const getAdaptiveCategory = () => {
    const sorted = [...masteries].sort((a, b) => a.mastery - b.mastery);
    const rand = Math.random();

    // 50% weak
    if (rand < 0.5) {
      return sorted[0]?.category || 'matrix';
    }
    // 25% second weakest
    if (rand < 0.75) {
      return sorted[1]?.category || 'pattern';
    }
    // 15% medium
    if (rand < 0.9) {
      return sorted[Math.floor(sorted.length / 2)]?.category || 'spatial';
    }
    // 10% surprise
    return sorted[Math.floor(Math.random() * sorted.length)]?.category || 'attention';
  };

  const [currentQuestion, setCurrentQuestion] = useState<BaseQuestion>(() => {
    return generateQuestion({
      category: 'matrix',
      difficulty: 3,
      seed: Math.floor(Math.random() * 900000) + 100000,
    });
  });

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAiHint, setShowAiHint] = useState(false);

  const handleSelectOption = (optId: string) => {
    if (isSubmitted) return;
    sound.playClick();
    setSelectedOptionId(optId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isSubmitted) return;
    const isCorrect = selectedOptionId === currentQuestion.correctOptionId;
    setIsSubmitted(true);
    dataService.recordQuestionSolved(isCorrect);

    if (isCorrect) {
      const nextConsecutive = consecutiveCorrect + 1;
      setConsecutiveCorrect(nextConsecutive);

      const baseXP = 15 + currentDifficulty * 2;
      const tier = getComboTier(nextConsecutive);
      const multipliedXP = Math.round(baseXP * tier.multiplier);

      let bonusXP = 0;
      const milestoneStreaks = [2, 3, 5, 7, 10];
      if (milestoneStreaks.includes(nextConsecutive)) {
        bonusXP = 25 + nextConsecutive * 5;
        setLastMilestoneBonus(bonusXP);
        setActiveMilestoneStreak(nextConsecutive);
        sound.playComboMilestone(nextConsecutive);
      } else if (nextConsecutive >= 2) {
        sound.playCombo(nextConsecutive);
      } else {
        sound.playSuccess();
      }

      const totalXP = multipliedXP + bonusXP;
      setLastEarnedXP(totalXP);
      setShowFloater(true);
      setTimeout(() => setShowFloater(false), 1200);

      try {
        confetti({
          particleCount: nextConsecutive >= 4 ? 120 : 70,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981'],
          zIndex: 9999,
        });
      } catch {}

      setEarnedXP((prev) => prev + totalXP);
      dataService.addXP(totalXP);
      dataService.recordPracticeSession(1);
      dataService.recordQuestionSolved(true, currentQuestion.category);
      dataService.updateSkillMastery(currentQuestion.category, true, currentDifficulty);

      // Adapt difficulty up if 2 correct in a row
      if (nextConsecutive >= 2 && currentDifficulty < 6) {
        setCurrentDifficulty((prev) => Math.min(6, prev + 1) as DifficultyLevel);
      }
    } else {
      sound.playError();
      setConsecutiveCorrect(0);
      setActiveMilestoneStreak(null);
      dataService.addMistake(currentQuestion);
      dataService.updateSkillMastery(currentQuestion.category, false, currentDifficulty);

      // Lower difficulty if struggling
      if (currentDifficulty > 1) {
        setCurrentDifficulty((prev) => Math.max(1, prev - 1) as DifficultyLevel);
      }
    }
    setMasteries(dataService.getSkillMasteries());
  };

  const handleNextQuestion = () => {
    sound.playClick();
    const nextCat = getAdaptiveCategory();
    const nextQ = generateQuestion({
      category: nextCat,
      difficulty: currentDifficulty,
      seed: Math.floor(Math.random() * 900000) + 100000,
    });

    setCurrentQuestion(nextQ);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setShowAiHint(false);
    setActiveMilestoneStreak(null);
    setQuestionCount((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-12 space-y-4">
      {/* Animated Combo Burst Overlay */}
      <ComboBurstOverlay
        streak={activeMilestoneStreak}
        onDismiss={() => setActiveMilestoneStreak(null)}
        bonusXP={lastMilestoneBonus}
      />

      {/* Top HUD */}
      <div className="bg-white px-4 py-3 rounded-xl border border-zinc-200  flex items-center justify-between gap-3">
        <button
          onClick={onNavigateHome}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs font-extrabold text-purple-800 bg-purple-100 px-3 py-1 rounded-full">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span>Akıllı Adaptif Mod • Soru {questionCount}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${DIFFICULTY_COLORS[currentDifficulty]}`}>
            Sv. {currentDifficulty}
          </span>
          <ComboStreakIndicator streak={consecutiveCorrect} variant="hud" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>+{earnedXP} XP</span>
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <div
        className={`bg-white rounded-xl p-4 sm:p-6 border transition-all duration-300  space-y-4 ${
          consecutiveCorrect >= 4
            ? 'border-purple-400   animate-combo-aura'
            : consecutiveCorrect >= 2
            ? 'border-amber-300  '
            : 'border-zinc-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-zinc-200 pb-3">
          <div className="text-center sm:text-left space-y-0.5 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentQuestion.prompt}
            </h2>
            {currentQuestion.secondaryPrompt && (
              <p className="text-xs text-slate-500">
                {currentQuestion.secondaryPrompt}
              </p>
            )}
          </div>

          {!isSubmitted && (
            <button
              onClick={() => {
                sound.playClick();
                setShowAiHint(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs  transition-all cursor-pointer active:scale-95 shrink-0"
              title="Takıldığında yapay zeka destekli adım adım ipucu al"
            >
              <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>💡 İpucu Al (AI)</span>
            </button>
          )}
        </div>

        {/* Question Canvas */}
        <div className="py-2">
          <QuestionRenderer question={currentQuestion} />
        </div>

        {/* Answer Options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {currentQuestion.options.map((opt) => (
            <OptionRenderer
              key={opt.id}
              option={opt}
              isSelected={selectedOptionId === opt.id}
              onSelect={() => handleSelectOption(opt.id)}
              disabled={isSubmitted}
              showCorrect={isSubmitted}
              isCorrectOption={opt.id === currentQuestion.correctOptionId}
            />
          ))}
        </div>

        {/* Controls and Feedback */}
        {!isSubmitted ? (
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 relative">
            <StreakFloatingFloater
              show={showFloater}
              xpEarned={lastEarnedXP}
              streakCount={consecutiveCorrect}
            />

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setShowAiHint(true);
              }}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300/80 text-amber-950 font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98  shrink-0"
            >
              <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Takıldım, İpucu Ver!</span>
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOptionId}
              className={`flex-1 w-full py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedOptionId
                  ? 'bg-purple-600 hover:bg-purple-700 text-white   active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{selectedOptionId ? 'Cevabı Kontrol Et' : 'Bir Seçenek İşaretle'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2 relative">
            <StreakFloatingFloater
              show={showFloater}
              xpEarned={lastEarnedXP}
              streakCount={consecutiveCorrect}
            />

            <div
              className={`p-4 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2 ${
                selectedOptionId === currentQuestion.correctOptionId
                  ? 'bg-emerald-100 text-emerald-950 border-2 border-emerald-300'
                  : 'bg-amber-100 text-amber-950 border-2 border-amber-300'
              }`}
            >
              {selectedOptionId === currentQuestion.correctOptionId ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Harika! Akıllı seviyen artıyor! (+{lastEarnedXP} XP)</span>
                  {consecutiveCorrect >= 2 && (
                    <span className="ml-2 text-xs font-black bg-purple-600 text-white px-2.5 py-0.5 rounded-full animate-bounce">
                      ⚡ {consecutiveCorrect}x Seri!
                    </span>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-amber-600" />
                  <span>Birlikte bakalım: Soru Hata Defterine eklendi.</span>
                </>
              )}
            </div>

            <VisualExplanationOverlay
              explanation={currentQuestion.explanation}
              correctOptionId={currentQuestion.correctOptionId}
            />

            <button
              onClick={handleNextQuestion}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm  transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Sonraki Adaptif Soruya Geç</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* AI Step-by-Step Hint Modal */}
      {currentQuestion && (
        <AiHintModal
          question={currentQuestion}
          isOpen={showAiHint}
          onClose={() => setShowAiHint(false)}
        />
      )}
    </div>
  );
};
